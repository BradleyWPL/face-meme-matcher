# =============================================================================
# FILE: services/firebase.py
# PROJECT: Face Meme Matcher — Meme Me
# =============================================================================
# DESCRIPTION:
#   Firebase Admin SDK initializer. Establishes a secure server-side
#   connection to Firebase using service account credentials.
#
# IPO BREAKDOWN:
#   INPUT:
#     serviceAccountKey.json — private Firebase service account credentials
#     os.path module to resolve the absolute file path dynamically
#
#   PROCESSING:
#     Reads serviceAccountKey.json using BASE_DIR path resolution
#     Calls credentials.Certificate() to load the service account
#     Calls firebase_admin.initialize_app(cred) to authenticate the server
#     Instantiates firestore.client() and assigns it to global db variable
#
#   OUTPUT:
#     db — authenticated Firestore client available for import into app.py
#     Secure server-side Firebase connection ready for Firestore operations
# =============================================================================

import json
import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  

key_path = os.environ.get("FIREBASE_KEY_PATH", "serviceAccountKey.json")  # Fallback to serviceAccountKey.json 

cred = credentials.Certificate(
    os.path.join(BASE_DIR, key_path)
)

firebase_admin.initialize_app(cred)

db = firestore.client()
