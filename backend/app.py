import os
from flask import Flask, render_template
from flask_cors import CORS
from services.firebase import db

# Get absolute paths so you can run app from anywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, '..', 'templates'),
    static_folder=os.path.join(BASE_DIR, '..', 'static')
)

CORS(app)

# Pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/meme-me')
def meme_me():
    return render_template('meme-me.html')

# Example dynamic route
@app.route('/user/<username>')
def profile(username):
    return render_template('profile.html', username=username)

# API Endpoints
@app.route('/api/health')
def health():
    return {"status": "Backend is running!"}

@app.route('/api/test-firebase')
def test_firebase():
    doc_ref = db.collection('test').document('ping')
    doc_ref.set({"message": "Firebase connected!"})
    return {"status": "Firebase is working!"}

# Run the app
if __name__ == '__main__':
    app.run(debug=True, port=5000)