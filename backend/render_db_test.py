#!/usr/bin/env python
import psycopg2
import sys
import os
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Remote database connection (for Render deployment)
DATABASE_URL = "postgresql://pivotpoint_user:cz3dsklwcuWHBL1WfGHY8kD6fwBpaWwy@dpg-cvgd3plrie7s73bofiig-a.oregon-postgres.render.com/pivotpoint"

def test_db_connection():
    """Test direct connection to the remote database"""
    try:
        logger.info(f"Connecting to database at: {DATABASE_URL}")
        # Force sslmode for remote connections
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        
        # Create a cursor
        cur = conn.cursor()
        
        # Check if users table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            );
        """)
        users_table_exists = cur.fetchone()[0]
        
        if not users_table_exists:
            logger.info("Users table doesn't exist. Creating schema...")
            # Read and execute schema.sql
            with open('schema.sql', 'r') as f:
                schema_sql = f.read()
                cur.execute(schema_sql)
                conn.commit()
            logger.info("Schema created successfully!")
        else:
            logger.info("Users table exists. No need to create schema.")
            
            # Count users
            cur.execute("SELECT COUNT(*) FROM users;")
            user_count = cur.fetchone()[0]
            logger.info(f"Found {user_count} users in the database.")
            
            # Count decisions
            cur.execute("SELECT COUNT(*) FROM decisions;")
            decisions_count = cur.fetchone()[0] if cur.rowcount > 0 else 0
            logger.info(f"Found {decisions_count} decisions in the database.")
        
        # Close the cursor and connection
        cur.close()
        conn.close()
        
        logger.info("✅ Database connection and schema test successful.")
        return True
    except Exception as e:
        logger.error(f"❌ Database error: {e}")
        return False

if __name__ == "__main__":
    max_retries = 3
    retry_count = 0
    success = False
    
    while retry_count < max_retries and not success:
        if retry_count > 0:
            logger.info(f"Retrying connection ({retry_count+1}/{max_retries})...")
            time.sleep(2)  # Wait before retrying
        
        success = test_db_connection()
        retry_count += 1
        
    sys.exit(0 if success else 1)
