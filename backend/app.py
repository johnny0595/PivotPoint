from flask import Flask, request, jsonify, g
import psycopg2
import psycopg2.extras
import os
import json
from datetime import datetime
from flask_cors import CORS
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get allowed origins from environment variable or use default
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,https://johnny0595.github.io').split(',')
logger.info(f"CORS_ORIGINS: {CORS_ORIGINS}")

# Enable CORS for all routes
CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

# Remote database connection (for Render deployment)
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://pivotpoint_user:cz3dsklwcuWHBL1WfGHY8kD6fwBpaWwy@dpg-cvgd3plrie7s73bofiig-a.oregon-postgres.render.com/pivotpoint')

# If the URL starts with postgres://, change it to postgresql:// (Render compatibility)
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

logger.info(f"Using DATABASE_URL: {DATABASE_URL}")

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        try:
            logger.info(f"Connecting to database at: {DATABASE_URL}")
            # Force sslmode to require for remote connections
            connect_args = {}
            if 'localhost' not in DATABASE_URL and '127.0.0.1' not in DATABASE_URL:
                connect_args['sslmode'] = 'require'
            
            db = g._database = psycopg2.connect(DATABASE_URL, **connect_args)
        except psycopg2.Error as e:
            logger.error(f"Database connection error: {e}")
            raise
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            cursor.execute(schema_sql)
        
        db.commit()
        logger.info("Database schema initialized successfully")

def check_db_initialized():
    """Check if database tables exist and create them if not"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if the users table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        """)
        users_table_exists = cursor.fetchone()[0]
        
        if not users_table_exists:
            logger.info("Database tables don't exist. Initializing schema...")
            
            # Read and execute schema.sql
            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
                cursor.execute(schema_sql)
            
            conn.commit()
            logger.info("Database schema initialized successfully")
        else:
            logger.info("Database schema already exists")
        
    except Exception as e:
        logger.error(f"Error checking database schema: {e}")
        raise

# Initialize database tables on application startup
with app.app_context():
    check_db_initialized()

# Add a catch-all route for 404 errors
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # Only handle paths that don't match other routes
    if path and not path.startswith(('api/', 'health')):
        return jsonify({
            'error': f"Route not found: /{path}",
            'available_routes': [
                '/api/decisions',
                '/api/decisions/<id>',
                '/api/decisions/<id>/items',
                '/api/items/<id>',
                '/api/users',
                '/api/auth/login',
                '/api/test-cors',
                '/health'
            ]
        }), 404
    return jsonify({'message': 'PivotPoint API', 'status': 'healthy'}), 200

@app.route('/api/decisions', methods=['GET'])
def get_decisions():
    try:
        user_id = request.args.get('user_id', '1')  # Default to user 1 if not specified
        
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get active decisions
        cursor.execute(
            'SELECT * FROM decisions WHERE user_id = %s AND archived = FALSE ORDER BY updated_at DESC',
            (user_id,)
        )
        active_decisions = cursor.fetchall()
        
        # Get archived decisions
        cursor.execute(
            'SELECT * FROM decisions WHERE user_id = %s AND archived = TRUE ORDER BY updated_at DESC',
            (user_id,)
        )
        archived_decisions = cursor.fetchall()
        
        # Convert to dictionaries
        active_decisions_list = [dict(decision) for decision in active_decisions]
        archived_decisions_list = [dict(decision) for decision in archived_decisions]
        
        result = {
            'active': active_decisions_list,
            'archived': archived_decisions_list
        }
        
        # Get the items for each decision
        for decision_list in [result['active'], result['archived']]:
            for decision in decision_list:
                decision['pros'] = get_items(decision['id'], 'pro')
                decision['cons'] = get_items(decision['id'], 'con')
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_decisions: {e}")
        return jsonify({"error": str(e)}), 500

def get_items(decision_id, item_type):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cursor.execute(
        'SELECT * FROM items WHERE decision_id = %s AND type = %s ORDER BY id',
        (decision_id, item_type)
    )
    items = cursor.fetchall()
    
    return [dict(item) for item in items]

@app.route('/api/decisions', methods=['POST'])
def create_decision():
    data = request.json
    user_id = data.get('user_id', '1')  # Default to user 1 if not specified
    title = data.get('title', 'New Decision')
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    now = datetime.now().isoformat()
    
    cursor.execute(
        'INSERT INTO decisions (user_id, title, archived, created_at, updated_at) VALUES (%s, %s, FALSE, %s, %s) RETURNING id',
        (user_id, title, now, now)
    )
    
    decision_id = cursor.fetchone()[0]
    conn.commit()
    
    return jsonify({
        'id': decision_id,
        'user_id': user_id,
        'title': title,
        'archived': False,
        'created_at': now,
        'updated_at': now,
        'pros': [],
        'cons': []
    })

@app.route('/api/decisions/<int:decision_id>', methods=['PUT'])
def update_decision(decision_id):
    data = request.json
    title = data.get('title')
    archived = data.get('archived')
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    now = datetime.now().isoformat()
    
    query = 'UPDATE decisions SET updated_at = %s'
    params = [now]
    
    if title is not None:
        query += ', title = %s'
        params.append(title)
    
    if archived is not None:
        query += ', archived = %s'
        params.append(archived)
    
    query += ' WHERE id = %s RETURNING *'
    params.append(decision_id)
    
    cursor.execute(query, params)
    updated_decision = cursor.fetchone()
    conn.commit()
    
    if not updated_decision:
        return jsonify({'error': 'Decision not found'}), 404
    
    result = dict(updated_decision)
    result['pros'] = get_items(decision_id, 'pro')
    result['cons'] = get_items(decision_id, 'con')
    
    return jsonify(result)

@app.route('/api/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # First delete all items related to this decision
    cursor.execute('DELETE FROM items WHERE decision_id = %s', (decision_id,))
    
    # Then delete the decision
    cursor.execute('DELETE FROM decisions WHERE id = %s', (decision_id,))
    conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/decisions/<int:decision_id>/items', methods=['POST'])
def add_item(decision_id):
    data = request.json
    text = data.get('text', '')
    weight = data.get('weight', 0)
    item_type = data.get('type', 'pro')  # 'pro' or 'con'
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # Ensure the decision exists
    cursor.execute('SELECT id FROM decisions WHERE id = %s', (decision_id,))
    decision = cursor.fetchone()
    if not decision:
        return jsonify({'error': 'Decision not found'}), 404
    
    cursor.execute(
        'INSERT INTO items (decision_id, text, weight, type) VALUES (%s, %s, %s, %s) RETURNING id',
        (decision_id, text, weight, item_type)
    )
    
    item_id = cursor.fetchone()[0]
    
    # Update the decision's updated_at timestamp
    cursor.execute(
        'UPDATE decisions SET updated_at = %s WHERE id = %s',
        (datetime.now().isoformat(), decision_id)
    )
    
    conn.commit()
    
    return jsonify({
        'id': item_id,
        'decision_id': decision_id,
        'text': text,
        'weight': weight,
        'type': item_type
    })

@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    data = request.json
    text = data.get('text')
    weight = data.get('weight')
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # First get the current item to find its decision_id
    cursor.execute('SELECT * FROM items WHERE id = %s', (item_id,))
    item = cursor.fetchone()
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    decision_id = item['decision_id']
    
    updates = []
    params = []
    
    if text is not None:
        updates.append('text = %s')
        params.append(text)
    
    if weight is not None:
        updates.append('weight = %s')
        params.append(weight)
    
    if updates:
        query = f"UPDATE items SET {', '.join(updates)} WHERE id = %s RETURNING *"
        params.append(item_id)
        
        cursor.execute(query, params)
        updated_item = cursor.fetchone()
        
        # Update the decision's updated_at timestamp
        cursor.execute(
            'UPDATE decisions SET updated_at = %s WHERE id = %s',
            (datetime.now().isoformat(), decision_id)
        )
        
        conn.commit()
        
        return jsonify(dict(updated_item))
    
    return jsonify(dict(item))

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # First get the current item to find its decision_id
    cursor.execute('SELECT * FROM items WHERE id = %s', (item_id,))
    item = cursor.fetchone()
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    decision_id = item['decision_id']
    
    cursor.execute('DELETE FROM items WHERE id = %s', (item_id,))
    
    # Update the decision's updated_at timestamp
    cursor.execute(
        'UPDATE decisions SET updated_at = %s WHERE id = %s',
        (datetime.now().isoformat(), decision_id)
    )
    
    conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    username = data.get('username', '')
    email = data.get('email', '')
    password = data.get('password', '')  # In a real app, you'd hash this
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        cursor.execute(
            'INSERT INTO users (username, email, password) VALUES (%s, %s, %s) RETURNING id',
            (username, email, password)  # Again, hash the password in production
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        
        return jsonify({
            'id': user_id,
            'username': username,
            'email': email
        })
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({'error': 'Username or email already exists'}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')  # In a real app, you'd verify against a hash
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cursor.execute(
        'SELECT * FROM users WHERE username = %s AND password = %s',
        (username, password)  # Again, verify hash in production
    )
    user = cursor.fetchone()
    
    if user:
        return jsonify({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'token': f"dummy_token_{user['id']}"  # In a real app, generate a proper JWT
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Add a test CORS endpoint for debugging
@app.route('/api/test-cors', methods=['GET'])
def test_cors():
    return jsonify({"message": "CORS is working correctly!"}), 200

# Render health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        """)
        tables_exist = cursor.fetchone()[0]
        
        if not tables_exist:
            # Initialize the database if tables don't exist
            check_db_initialized()
            db_status = "initialized"
        else:
            db_status = "connected"
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'environment': os.environ.get('FLASK_ENV', 'development')
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'database': 'error',
            'error': str(e)
        }), 500

@app.errorhandler(Exception)
def handle_error(e):
    logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
