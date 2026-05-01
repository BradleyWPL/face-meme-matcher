// =============================================================================
// FILE: firebase-config.js
// PROJECT: Face Meme Matcher — Meme Me
// =============================================================================
// DESCRIPTION:
//   Initializes the Firebase client SDK in the browser. Exposes auth, db,
//   and storage objects used by all other JS files.
//
// IPO BREAKDOWN:
//   INPUT:
//     Firebase project config object (apiKey, authDomain, projectId,
//     storageBucket, etc.)
//     Firebase compat SDK scripts loaded via <script> tags in each HTML file
//
//   PROCESSING:
//     Calls firebase.initializeApp(firebaseConfig) with project credentials
//     Instantiates firebase.auth(), firebase.firestore(), firebase.storage()
//     Assigns them to global constants: auth, db, storage
//
//   OUTPUT:
//     auth   — Firebase Authentication instance for login/logout/session
//     db     — Firestore database client for reading and writing user data
//     storage — Firebase Storage client for uploading meme snapshot images
// =============================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyBEUYfN77dXMNNCfmBhIm3VQIGX59ogviM",
  authDomain:        "face-meme-matcher.firebaseapp.com",
  projectId:         "face-meme-matcher",
  // ⚠️  CRITICAL: Use .firebasestorage.app (the newer bucket format)
  storageBucket:     "face-meme-matcher.firebasestorage.app",
  messagingSenderId: "882025482874",
  appId:             "1:882025482874:web:371c3813a1c1690c1649c3",
  measurementId:     "G-36EZ5WSS28"
};

firebase.initializeApp(firebaseConfig);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

console.log('✅ Firebase initialized. Storage bucket:', firebaseConfig.storageBucket);