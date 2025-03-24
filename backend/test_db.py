#!/usr/bin/env python
import psycopg2
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

try:
    # Attempt to connect to the database
    print(f"Connecting to: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    
    # Create a cursor
    cur = conn.cursor()
    
    # Execute a simple query
    cur.execute("SELECT version();")
    
    # Fetch the result
    version = cur.fetchone()
    
    # Close the cursor and connection
    cur.close()
    conn.close()
    
    print("Successfully connected to PostgreSQL!")
    print(f"PostgreSQL version: {version[0]}")
    print("Database connection test successful.")
    
    sys.exit(0)  # Success
    
except Exception as e:
    print(f"Error: {e}")
    print("\nTroubleshooting tips:")
    print("1. Make sure PostgreSQL is running")
    print("2. Check if the database 'pivotpoint' exists")
    print("3. Verify your user has permission to access PostgreSQL")
    print("4. If needed, create the database with: createdb pivotpoint")
    
    sys.exit(1)  # Error
