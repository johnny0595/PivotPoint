#!/bin/bash
# Create the PostgreSQL database
echo "Creating database 'pivotpoint'..."
createdb pivotpoint

# Initialize the database schema
echo "Initializing database schema..."
python init_db.py

echo "Database setup complete!"
