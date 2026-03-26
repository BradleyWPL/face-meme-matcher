// Load and display meme history for logged-in user
async function loadHistory() {
  const user = requireAuth();
  if (!user) return;

  document.getElementById('user-email-display').textContent = user.email;

  if (user.bypass) {
    document.getElementById('history-grid').innerHTML = 
      '<p style="color:#ccc">Test account — no saved memes. Log in with a real account to see history.</p>';
    return;
  }

  try {
    const snapshot = await db.collection('users')
      .doc(user.uid)
      .collection('memeHistory')
      .orderBy('savedAt', 'desc')
      .get();

    const grid = document.getElementById('history-grid');

    if (snapshot.empty) {
      grid.innerHTML = '<p style="color:#ccc">No memes saved yet. Go match some poses!</p>';
      return;
    }

    grid.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.memeName}" />
        <p>${data.memeName}</p>
        <small>${new Date(data.savedAt?.toDate()).toLocaleDateString()}</small>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('History load error:', err);
    document.getElementById('history-grid').innerHTML = '<p style="color:red">Error loading history.</p>';
  }
}

loadHistory();