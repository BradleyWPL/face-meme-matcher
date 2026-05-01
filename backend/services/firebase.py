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

import firebase_admin
from firebase_admin import credentials, firestore
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cred = credentials.Certificate(os.path.join(BASE_DIR, "serviceAccountKey.json"))
firebase_admin.initialize_app(cred)

db = firestore.client()
