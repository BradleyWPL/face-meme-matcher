#!/bin/bash

echo "Starting Meme Me Backend Server..."

cd ~/Documents/dev/school/software-eng/face-meme-matcher/backend

source venv/bin/activate

python3 app.py &

sleep 2

open http://127.0.0.1:5001

echo "Meme Me Backend Server is running at http://localhost:5000"