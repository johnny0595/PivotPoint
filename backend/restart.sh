#!/bin/bash

# Stop any running Flask processes
echo "Stopping any running Flask servers..."
pkill -f "python -m flask run"
pkill -f "flask run"

# Activate virtual environment
source venv/bin/activate

# Export CORS_DEBUG for extra debugging
export FLASK_APP=app.py
export FLASK_DEBUG=1
export CORS_DEBUG=1

# Start Flask with verbose output
echo "Starting Flask server with CORS debugging..."
flask run --no-debugger
