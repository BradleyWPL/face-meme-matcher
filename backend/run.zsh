#!/bin/bash

echo "Starting Meme Me Backend Server..."

cd ~/Documents/dev/school/software-eng/face-meme-matcher/backend

source venv/bin/activate

python3 app.py

open http://localhost:5000/api/health

echo "Meme Me Backend Server is running at http://localhost:5000"