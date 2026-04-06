// history.js — Load and display meme history for the logged-in user

async function loadHistory() {
  const user = requireAuth(); // redirects to /login if not logged in
  if (!user) return;

  // Show the user's email in the header
  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = user.email;

  const grid = document.getElementById('history-grid');

  // Bypass users have no real Firebase account — show friendly message
  if (user.bypass) {
    grid.innerHTML = `
      <div class="state-msg">
        <span>🧪</span>
        Test account — no saved memes.<br>Log in with a real account to see your history.
      </div>`;
    return;
  }

  try {
    const snapshot = await db.collection('users')
      .doc(user.uid)
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

    grid.innerHTML = ''; // clear loading state

    snapshot.forEach((doc, i) => {
      const data = doc.data();

      // Format date safely (savedAt may be null if server timestamp hasn't resolved)
      let dateStr = 'Just now';
      if (data.savedAt) {
        try {
          dateStr = new Date(data.savedAt.toDate()).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });
        } catch (_) { /* keep default */ }
      }

      const card = document.createElement('div');
      card.className = 'history-card';
      card.style.animationDelay = `${i * 0.06}s`; // staggered reveal

      card.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.memeName || 'Meme match'}"
             onerror="this.src=''; this.style.display='none'" />
        <div class="history-card-info">
          <p>${data.memeName || 'Unknown meme'}</p>
          <small>${dateStr}</small>
        </div>`;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error('History load error:', err);
    grid.innerHTML = `
      <div class="state-msg" style="color:#ffaaaa;">
        <span>⚠️</span>
        Error loading history.<br>
        <small style="color:rgba(255,150,150,0.7)">${err.message}</small>
      </div>`;
  }
}

loadHistory();