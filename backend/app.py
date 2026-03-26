from flask import Flask, render_template
from flask_cors import CORS
from services.firebase import db
import os

app = Flask(__name__, template_folder=os.path.join('..', 'templates'), static_folder=os.path.join('..', 'static'))
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/meme-me.html')
def meme_me():
    return render_template('meme-me.html')

@app.route('/api/health')
def health():
    return {"status": "Backend is running!"}

@app.route('/api/test-firebase')
def test_firebase():
    doc_ref = db.collection('test').document('ping')
    doc_ref.set({"message": "Firebase connected!"})
    return {"status": "Firebase is working!"}

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/history')
def history():
    return render_template('history.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)