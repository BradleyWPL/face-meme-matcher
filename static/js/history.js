// history.js — Load and display meme history for the logged-in user
// KEY FIX: Wait for Firebase Auth state to be confirmed before querying
// Firestore — otherwise request.auth is null and rules deny the read.


async function loadHistory() {
  const user = requireAuth();
  if (!user) return;

  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = user.email;

  const grid = document.getElementById('history-grid');

  if (user.bypass) {
    grid.innerHTML = `
      <div class="state-msg">
        <span>🧪</span>
        Test account — no saved memes.<br>Log in with a real account to see your history.
      </div>`;
    return;
  }

  // ✅ CRITICAL FIX: Wait for Firebase Auth to confirm the session
  // before making any Firestore request. Without this, request.auth
  // is null when the page first loads, causing permission-denied errors.
  await new Promise(resolve => {
    const unsubscribe = auth.onAuthStateChanged(firebaseUser => {
      unsubscribe(); // stop listening after first event

      if (!firebaseUser) {
        // Auth session truly gone — redirect to login
        sessionStorage.removeItem('user');
        window.location.href = 'http://localhost:5001/login';
        return;
      }

      // Sync uid from Firebase Auth (most reliable source of truth)
      sessionStorage.setItem('user', JSON.stringify({
        email: firebaseUser.email,
        uid:   firebaseUser.uid
      }));

      resolve();
    });
  });

  // Re-read user from sessionStorage now that it's confirmed fresh
  const confirmedUser = JSON.parse(sessionStorage.getItem('user'));

  try {
    const snapshot = await db
      .collection('users')
      .doc(confirmedUser.uid)
      .collection('memeHistory')
      .orderBy('savedAt', 'desc')
      .get();

    if (snapshot.empty) {
      grid.innerHTML = `
        <div class="state-msg">
          <span>🎭</span>
          No memes saved yet!<br>Go match some poses and hit Download.
        </div>`;
      return;
    }

    grid.innerHTML = '';

    snapshot.forEach((doc, i) => {
      const data = doc.data();

      // Support both field name spellings
      const imgSrc   = data.imageUrl || data.Image_URL || data.image_url || '';
      const memeName = data.memeName || data.meme_name || 'Unknown meme';

      let dateStr = 'Just now';
      if (data.savedAt) {
        try {
          dateStr = new Date(data.savedAt.toDate()).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });
        } catch (_) {}
      }

      const card = document.createElement('div');
      card.className = 'history-card';
      card.style.animationDelay = `${i * 0.06}s`;

      card.innerHTML = `
        ${imgSrc ? `<img src="${imgSrc}" alt="${memeName}"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />` : ''}
        <div class="img-placeholder" style="display:${imgSrc ? 'none' : 'flex'}; height:100px;
          align-items:center; justify-content:center; font-size:2.5rem; background:rgba(0,0,0,0.2);">
          🖼️
        </div>
        <div class="history-card-info">
          <p>${memeName}</p>
          <small>${dateStr}</small>
        </div>`;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error('History load error:', err.code, err.message);

    let hint = err.message;
    if (err.code === 'permission-denied') {
      hint = 'Firestore permission denied — check your security rules cover users/{uid}/memeHistory.';
    }

    grid.innerHTML = `
      <div class="state-msg" style="color:#ffaaaa;">
        <span>⚠️</span>
        Error loading history.<br>
        <small style="color:rgba(255,150,150,0.7); font-size:0.8rem">${hint}</small>
      </div>`;
  }
}

loadHistory();