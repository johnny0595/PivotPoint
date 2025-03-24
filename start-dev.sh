#!/bin/bash

# Start the backend in a separate terminal
osascript -e 'tell app "Terminal" to do script "cd \"$PWD/backend\" && source venv/bin/activate && flask run"'

# Start the frontend
cd frontend/pivot-point && npm start
