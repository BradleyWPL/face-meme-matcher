from flask import Flask
from flask_cors import CORS
from services.firebase import db

app = Flask(__name__)
CORS(app)

@app.route('/api/health')
def health():
    return {"status": "Backend is running!"}

@app.route('/api/test-firebase')
def test_firebase():
    doc_ref = db.collection('test').document('ping')
    doc_ref.set({"message": "Firebase connected!"})
    return {"status": "Firebase is working!"}

if __name__ == '__main__':
    app.run(debug=True, port=5000)