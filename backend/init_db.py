#!/usr/bin/env python
from app import init_db, app
import sys

try:
    with app.app_context():
        init_db()
        print("Database initialized successfully!")
    sys.exit(0)
except Exception as e:
    print(f"Error initializing database: {e}")
    print("\nTry running python test_db.py to diagnose connection issues.")
    sys.exit(1)
