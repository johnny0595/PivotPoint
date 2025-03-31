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

def test_cors():
    try:
        print(f"Testing CORS configuration on {BASE_URL}...")
        
        # Test with OPTIONS request (preflight)
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        # First test OPTIONS (preflight) request
        options_response = requests.options(f'{BASE_URL}/api/test-cors', headers=headers)
        print(f"OPTIONS status code: {options_response.status_code}")
        print(f"OPTIONS headers: {dict(options_response.headers)}")
        
        # Then test actual GET request
        headers = {
            'Origin': 'http://localhost:3000',
        }
        get_response = requests.get(f'{BASE_URL}/api/test-cors', headers=headers)
        print(f"\nGET status code: {get_response.status_code}")
        print(f"GET headers: {dict(get_response.headers)}")
        print(f"GET response: {get_response.text}")
        
        if 'Access-Control-Allow-Origin' in get_response.headers:
            print("\n✅ CORS appears to be configured correctly!")
            return 0
        else:
            print("\n❌ CORS headers are missing in the response!")
            return 1
        
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(test_cors())
