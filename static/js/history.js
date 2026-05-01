// =============================================================================
// FILE: history.js
// PROJECT: Face Meme Matcher — Meme Me
// =============================================================================
// DESCRIPTION:
//   Loads and renders the user's personal meme history gallery. Authenticates
//   via Firebase Auth, fetches memeHistory collection from Firestore, and
//   dynamically builds image cards for each saved meme.
//
// IPO BREAKDOWN:
//   INPUT:
//     Firebase Auth session — onAuthStateChanged resolves current user
//     Firestore collection: users/{uid}/memeHistory ordered by savedAt desc
//     Each document: imageUrl (Storage URL), memeName (string),
//       savedAt (Timestamp)
//
//   PROCESSING:
//     Wraps auth.onAuthStateChanged in a Promise to await user confirmation
//     Redirects to /login if no authenticated user found
//     Updates sessionStorage with fresh Firebase Auth user data
//     Queries Firestore memeHistory ordered by savedAt desc using .get()
//     Iterates snapshot docs and builds .history-card div elements per entry
//     Formats savedAt Timestamp to readable date via toDate().toLocaleDateString()
//     Renders <img> if imageUrl exists, placeholder div if empty
//     Shows empty state message if snapshot has zero documents
//     Catches and displays Firestore errors inline in the grid
//
//   OUTPUT:
//     History grid populated with cards: image, meme name, save date
//     User email displayed in header via #user-email-display
//     Empty state message if no memes saved yet
//     Error message in grid if Firestore query fails
//     Redirect to /login if session is invalid or expired
// =============================================================================
async function loadHistory() {
  const grid = document.getElementById('history-grid');
  if (!grid) return;

  // ── Wait for Firebase Auth to confirm session ──
  const firebaseUser = await new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(user => {
      unsub();
      resolve(user);
    });
  });

  if (!firebaseUser) {
    sessionStorage.removeItem('user');
    // FIXED: Use a relative path so it doesn't break when you move files
    window.location.href = 'login.html'; 
    return;
  }

  // FIXED: Ensure we update the UI immediately so the user knows they are logged in
  const emailDisplay = document.getElementById('user-email-display');
  if (emailDisplay) {
      emailDisplay.textContent = firebaseUser.email;
      emailDisplay.style.display = 'inline'; // Ensure it isn't hidden by CSS
  }

  // Sync session storage for other parts of the app
  sessionStorage.setItem('user', JSON.stringify({
    email: firebaseUser.email,
    uid:   firebaseUser.uid
  }));

  // Show email in header if element exists
  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = firebaseUser.email;

  try {
    const snapshot = await db
      .collection('users')
      .doc(firebaseUser.uid)
      .collection('memeHistory')
      .orderBy('savedAt', 'desc')
      .get();

    if (snapshot.empty) {
      grid.innerHTML = `
        <div style="text-align:center; color:rgba(255,255,255,0.5); padding:40px; font-size:1rem;">
          🎭 No memes saved yet!<br>Go match some poses and hit Download.
        </div>`;
      return;
    }

    grid.innerHTML = '';

    snapshot.forEach((doc, i) => {
      const data = doc.data();
      const imgSrc   = data.imageUrl || '';
      const memeName = data.memeName || 'Meme Match';

      let dateStr = '';
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
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${memeName}" style="width:100%; border-radius:8px; margin-bottom:8px;" />`
          : `<div style="height:100px; background:rgba(0,0,0,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:8px;">🖼️</div>`
        }
        <div class="history-card-info">
          <p style="font-weight:700; font-size:0.9rem;">${memeName}</p>
          <small style="color:rgba(255,255,255,0.5); font-size:0.75rem;">${dateStr}</small>
        </div>`;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error('History load error:', err.code, err.message);
    grid.innerHTML = `
      <div style="text-align:center; color:#ffaaaa; padding:40px;">
        ⚠️ Error loading history.<br>
        <small style="font-size:0.8rem; color:rgba(255,150,150,0.7);">${err.message}</small>
      </div>`;
  }
}

loadHistory();