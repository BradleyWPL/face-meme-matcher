// Firebase configuration — fill in your project values
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBEUYfN77dXMNNCfmBhIm3VQIGX59ogviM",
  authDomain: "face-meme-matcher.firebaseapp.com",
  projectId: "face-meme-matcher",
  storageBucket: "face-meme-matcher.firebasestorage.app",
  messagingSenderId: "882025482874",
  appId: "1:882025482874:web:371c3813a1c1690c1649c3",
  measurementId: "G-36EZ5WSS28"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
const storage = firebase.storage();