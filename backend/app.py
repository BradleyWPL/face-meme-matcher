import os
from flask import Flask, render_template
from flask_cors import CORS
from services.firebase import db

# get absolute paths so you can run app from anywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# init flask app, tell it where templates and static files are
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, '..', 'templates'),
    static_folder=os.path.join(BASE_DIR, '..', 'static')
)

# allow cross-origin requests (so frontend JS can talk to backend)
CORS(app)

# pages / templates
@app.route('/')
def index():
    # main welcome page
    return render_template('index.html')

@app.route('/meme-me')
def meme_me():
    # meme-me page where AI does stuff
    return render_template('meme-me.html')

@app.route('/login')
def login():
    # login page
    return render_template('login.html')

@app.route('/signup')
def signup():
    # signup page
    return render_template('signup.html')

@app.route('/history')
def history():
    # history page (past memes, etc.)
    return render_template('history.html')

# example of dynamic route, not hardcoded
@app.route('/user/<username>')
def profile(username):
    # shows profile page for any username
    return render_template('profile.html', username=username)

# API endpoints
@app.route('/api/health')
def health():
    # simple backend check
    return {"status": "Backend is running!"}

@app.route('/api/test-firebase')
def test_firebase():
    # test connection to firebase, make sure db works
    doc_ref = db.collection('test').document('ping')
    doc_ref.set({"message": "Firebase connected!"})
    return {"status": "Firebase is working!"}

# run the server
if __name__ == '__main__':
    # debug=True for dev so you see errors in console
    # port 5000 is default for Flask, can change if needed
    app.run(debug=True, host='0.0.0.0', port=5001)
