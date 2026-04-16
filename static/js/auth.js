// ── auth.js ───────────────────────────────────────────────────────────────
// KEY FIX: Firebase Firestore security rules use request.auth on the SERVER.
// For request.auth to be non-null, the browser must have an active Firebase
// Auth session — not just a sessionStorage entry. This file sets persistence
// to LOCAL so the auth token survives page navigations and browser refreshes.



// ── LOGIN ─────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }

  const btn = document.querySelector('.auth-btn:not(.bypass-btn)');
  if (btn) { btn.textContent = 'Logging in…'; btn.disabled = true; }

  try {
    // ✅ LOCAL persistence = auth token survives page navigations
    // This makes request.auth work in Firestore security rules
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = 'meme-me.html';
  } catch (err) {
    console.error('Login error code:', err.code);
    showError(friendlyError(err.code));
    if (btn) { btn.textContent = 'Login'; btn.disabled = false; }
  }
}

// ── SIGNUP ────────────────────────────────────
async function handleSignup() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirm-password').value;

  if (!email || !password || !confirm) {
    showError('Please fill in all fields.');
    return;
  }
  if (password !== confirm) {
    showError('Passwords do not match.');
    return;
  }
  if (password.length < 8) {
    showError('Password must be at least 8 characters.');
    return;
  }
  if (!/[A-Z]/.test(password)) {
    showError('Password must contain at least one uppercase letter.');
    return;
  }
  if (!/[0-9]/.test(password)) {
    showError('Password must contain at least one number.');
    return;
  }

  const btn = document.querySelector('.auth-btn');
  if (btn) { btn.textContent = 'Creating account…'; btn.disabled = true; }

  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = 'meme-me.html';
  } catch (err) {
    console.error('Signup error code:', err.code);
    showError(friendlyError(err.code));
    if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
  }
}

// ── LOGOUT ────────────────────────────────────
async function handleLogout() {
  await auth.signOut();
  sessionStorage.removeItem('user');
  window.location.href = 'http://localhost:5001/login';
}

// ── GUARD — checks both sessionStorage AND Firebase Auth ──────────────────
function requireAuth() {
  const stored = sessionStorage.getItem('user');
  if (!stored) {
    window.location.href = 'http://localhost:5001/login';
    return null;
  }
  const user = JSON.parse(stored);

  // Watch for Firebase Auth session expiry (keeps rules working)
  if (!user.bypass) {
    auth.onAuthStateChanged(firebaseUser => {
      if (!firebaseUser) {
        console.warn('Firebase Auth session expired — redirecting to login.');
        sessionStorage.removeItem('user');
        window.location.href = 'http://localhost:5001/login';
      } else {
        // Keep sessionStorage fresh with latest auth info
        sessionStorage.setItem('user', JSON.stringify({
          email: firebaseUser.email,
          uid:   firebaseUser.uid
        }));
      }
    });
  }

  return user;
}

function goBack() {
  window.location.href = 'meme-me.html';
  
}

// ── ERROR HELPERS ─────────────────────────────
function showError(msg) {
  const box = document.getElementById('auth-error');
  if (box) {
    box.textContent = msg;
    box.classList.remove('hidden');
  }
}

function friendlyError(code) {
  const map = {
    'auth/invalid-credential':         'Incorrect email or password. Please try again.',
    'auth/invalid-login-credentials':  'Incorrect email or password. Please try again.',
    'auth/user-not-found':             'No account found with that email.',
    'auth/wrong-password':             'Incorrect password. Please try again.',
    'auth/email-already-in-use':       'An account with this email already exists.',
    'auth/invalid-email':              'Please enter a valid email address.',
    'auth/weak-password':              'Password must be at least 8 characters.',
    'auth/too-many-requests':          'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':     'Network error — check your internet connection.',
    'auth/user-disabled':              'This account has been disabled.',
    'auth/operation-not-allowed':      'Email/password login is not enabled. Contact support.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ✅ ADD THIS TO THE VERY BOTTOM OF auth.js
function requireAuth() {
  const userStr = sessionStorage.getItem('user');
  
  // If no session exists, check if Firebase is still "waking up"
  if (!userStr && !auth.currentUser) {
    window.location.href = 'login.html';
    return null;
  }
  return userStr ? JSON.parse(userStr) : auth.currentUser;
}

// Ensure your redirects don't use "localhost:5001"
function goBack() {
  window.location.href = 'meme-me.html';
}