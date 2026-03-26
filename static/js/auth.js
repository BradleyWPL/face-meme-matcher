// ── BYPASS LOGIN ──────────────────────────────
function bypassLogin() {
  sessionStorage.setItem('user', JSON.stringify({ email: 'test@user.com', uid: 'bypass-user', bypass: true }));
  window.location.href = '/meme-me.html';
}

// ── LOGIN ─────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorBox = document.getElementById('auth-error');

  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = '/meme-me.html';
  } catch (err) {
    showError(friendlyError(err.code));
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

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;
    // Save user profile to Firestore
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    sessionStorage.setItem('user', JSON.stringify({ email: user.email, uid: user.uid }));
    window.location.href = '/meme-me.html';
  } catch (err) {
    showError(friendlyError(err.code));
  }
}

// ── LOGOUT ────────────────────────────────────
async function handleLogout() {
  await auth.signOut();
  sessionStorage.removeItem('user');
  window.location.href = '/login';
}

// ── GUARD — redirect if not logged in ─────────
function requireAuth() {
  const user = sessionStorage.getItem('user');
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return JSON.parse(user);
}

function goBack() {
  window.location.href = '/meme-me.html';
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
    'auth/user-not-found':     'No account found with that email.',
    'auth/wrong-password':     'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email':      'Please enter a valid email address.',
    'auth/weak-password':      'Password must be at least 6 characters.',
    'auth/too-many-requests':  'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}


async function downloadSnapshot() {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');

  const snapCanvas = document.createElement('canvas');
  snapCanvas.width  = video.videoWidth * 2;
  snapCanvas.height = video.videoHeight;
  const ctx = snapCanvas.getContext('2d');

  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

  const memeName = memeLabel ? memeLabel.textContent : 'Unknown';

  if (memeDisplay.src && memeDisplay.naturalWidth > 0) {
    ctx.drawImage(memeDisplay, video.videoWidth, 0, video.videoWidth, video.videoHeight);
  } else {
    ctx.fillStyle = '#6a5acd';
    ctx.fillRect(video.videoWidth, 0, video.videoWidth, video.videoHeight);
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No match yet!', video.videoWidth * 1.5, video.videoHeight / 2);
  }

  // Always trigger local download
  const link = document.createElement('a');
  link.download = 'meme-match.png';
  link.href = snapCanvas.toDataURL('image/png');
  link.click();

  // Save to Firebase if logged in (not bypass)
if (user && !user.bypass) {
  try {
    // 1. Convert the canvas to a blob
    const blob = await new Promise(resolve => snapCanvas.toBlob(resolve, 'image/png'));
    
    // 2. Create the reference using the 'storage' constant from firebase-config.js
    const filename = `memeHistory/${user.uid}/${Date.now()}.png`;
    const ref = storage.ref().child(filename); // Added .child() for v8 compatibility

    // 3. Upload the blob
    await ref.put(blob);
    const imageUrl = await ref.getDownloadURL();

    // 4. Save to the sub-collection your history.js expects
    await db.collection('users').doc(user.uid)
      .collection('memeHistory').add({
        memeName: memeName,
        imageUrl: imageUrl,
        savedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('Saved to meme history ✅');
  } catch (err) {
    console.error('Save failed:', err);
  }
}}