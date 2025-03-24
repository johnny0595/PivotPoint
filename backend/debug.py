#!/usr/bin/env python
import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the port from environment or default to 5001
PORT = os.environ.get('FLASK_RUN_PORT', '5001')
BASE_URL = f'http://localhost:{PORT}'

def check_server():
    try:
        print(f"Testing server on {BASE_URL}...")
        
        # Health check endpoint
        response = requests.get(f'{BASE_URL}/health')
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Test CORS with origin header
        headers = {
            'Origin': 'http://localhost:3000',
        }
        response = requests.get(f'{BASE_URL}/api/test-cors', headers=headers)
        print(f"\nCORS test status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        # Check if database is initialized
        response = requests.get(f'{BASE_URL}/api/decisions?user_id=1', headers=headers)
        print(f"\nAPI test status: {response.status_code}")
        if response.status_code == 200:
            print("API is working correctly!")
            return 0
        else:
            print(f"API error: {response.text}")
            return 1
    
    except requests.exceptions.ConnectionError:
        print(f"Error: Cannot connect to server. Make sure Flask is running on port {PORT}.")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(check_server())
