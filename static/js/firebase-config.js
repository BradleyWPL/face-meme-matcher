// firebase-config.js
// IMPORTANT: Use ONE consistent config for your entire app.
// Your Firebase project has TWO registered web apps (image-storage and login page).
// We use the ORIGINAL one that matches your existing users collection.

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