// ── BYPASS LOGIN ──────────────────────────────
function bypassLogin() {
  sessionStorage.setItem('user', JSON.stringify({ email: 'test@user.com', uid: 'bypass-user', bypass: true }));
  window.location.href = 'http://localhost:5001/meme-me.html';
}

// ── LOGIN ─────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }

  // Show loading state
  const btn = document.querySelector('.auth-btn:not(.bypass-btn)');
  if (btn) { btn.textContent = 'Logging in…'; btn.disabled = true; }

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = 'http://localhost:5001/meme-me.html';
  } catch (err) {
    console.error('Login error code:', err.code); // DEV: shows raw code in console
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
  if (password.length < 6) {
    showError('Password must be at least 6 characters.');
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
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = 'http://localhost:5001/meme-me.html';
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

// ── GUARD — redirect if not logged in ─────────
function requireAuth() {
  const user = sessionStorage.getItem('user');
  if (!user) {
    window.location.href = 'http://localhost:5001/login';
    return null;
  }
  return JSON.parse(user);
}

function goBack() {
  window.location.href = 'http://localhost:5001/meme-me.html';
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
    // Modern Firebase v9+ codes (what you're actually getting now)
    'auth/invalid-credential':         'Incorrect email or password. Please try again.',
    'auth/invalid-login-credentials':  'Incorrect email or password. Please try again.',
    // Legacy codes (kept for safety)
    'auth/user-not-found':             'No account found with that email.',
    'auth/wrong-password':             'Incorrect password. Please try again.',
    // Common errors
    'auth/email-already-in-use':       'An account with this email already exists.',
    'auth/invalid-email':              'Please enter a valid email address.',
    'auth/weak-password':              'Password must be at least 6 characters.',
    'auth/too-many-requests':          'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':     'Network error — check your internet connection.',
    'auth/user-disabled':              'This account has been disabled. Contact support.',
    'auth/operation-not-allowed':      'Email/password login is not enabled. Contact support.',
  };
  // In dev, raw code shows in console. This message is user-friendly.
  return map[code] || 'Something went wrong. Please try again.';
}