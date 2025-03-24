# PivotPoint Backend Setup

## Prerequisites

- Python 3.9+ installed
- PostgreSQL installed and running

## Setup Instructions

### 1. Setup the Database

```bash
# Create the PostgreSQL database
createdb pivotpoint
```

### 2. Setup the Python Environment

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Copy the example .env file (or create one)
cp .env.example .env
```

Edit the `.env` file if needed to match your PostgreSQL configuration.

### 4. Initialize the Database

```bash
# Run the initialization script
python init_db.py
```

### 5. Start the Server

```bash
# Run the development server
flask run
```

The server should now be running at http://localhost:5000

## Troubleshooting

If you have issues connecting to the database, try:

```bash
# Test the database connection
python test_db.py
```

Common issues:
- PostgreSQL service not running
- Database 'pivotpoint' doesn't exist
- Incorrect credentials in .env file

## API Endpoints

- `GET /api/decisions` - List all decisions for a user
- `POST /api/decisions` - Create a new decision
- `PUT /api/decisions/<id>` - Update a decision
- `DELETE /api/decisions/<id>` - Delete a decision
- `POST /api/decisions/<id>/items` - Add an item to a decision
- `PUT /api/items/<id>` - Update an item
- `DELETE /api/items/<id>` - Delete an item
