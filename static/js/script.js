// ── script.js ─────────────────────────────────────────────────────────────
// Handles download button + Firebase save for the meme-me page.
// NOTE: firebase-config.js must be loaded before this file so that
//       `auth`, `db`, and `storage` globals are available.

const downloadButton = document.getElementById('download-button');
if (downloadButton) {
  downloadButton.addEventListener('click', downloadSnapshot);
}

// ── DOWNLOAD + SAVE TO FIREBASE ───────────────────────────────────────────
async function downloadSnapshot() {
  // Grab elements that live on meme-me.html
  const video       = document.getElementById('video');        // <video> element
  const memeDisplay = document.getElementById('meme-display'); // <img> showing matched meme
  const memeLabel   = document.getElementById('meme-label');   // <p>/<span> with meme name

  if (!video) {
    console.error('downloadSnapshot: #video element not found on this page.');
    return;
  }

  const user = JSON.parse(sessionStorage.getItem('user') || 'null');

  // ── 1. Build the side-by-side canvas (webcam | meme) ──────────────────
  const snapCanvas = document.createElement('canvas');
  snapCanvas.width  = video.videoWidth * 2;
  snapCanvas.height = video.videoHeight;
  const ctx = snapCanvas.getContext('2d');

  // Left half = webcam frame
  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

  const memeName = memeLabel ? memeLabel.textContent.trim() : 'Unknown';

  // Right half = meme image (or fallback purple panel)
  if (memeDisplay && memeDisplay.src && memeDisplay.naturalWidth > 0) {
    ctx.drawImage(memeDisplay, video.videoWidth, 0, video.videoWidth, video.videoHeight);
  } else {
    ctx.fillStyle = '#6a35d8';
    ctx.fillRect(video.videoWidth, 0, video.videoWidth, video.videoHeight);
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No match yet!', video.videoWidth * 1.5, video.videoHeight / 2);
  }

  // ── 2. Always download locally ─────────────────────────────────────────
  const link = document.createElement('a');
  link.download = `meme-match-${Date.now()}.png`;
  link.href = snapCanvas.toDataURL('image/png');
  link.click();

  // ── 3. Save to Firebase Storage + Firestore (real users only) ──────────
  if (!user || user.bypass) {
    console.log('Bypass/no user — skipping Firebase save.');
    return;
  }

  try {
    // Convert canvas → Blob
    const blob = await new Promise((resolve, reject) => {
      snapCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
    });

    // Upload to Firebase Storage: memeHistory/{uid}/{timestamp}.png
    const filename = `memeHistory/${user.uid}/${Date.now()}.png`;
    const ref = storage.ref().child(filename);
    await ref.put(blob);
    const imageUrl = await ref.getDownloadURL();

    // Save metadata to Firestore: users/{uid}/memeHistory/{auto-id}
    await db.collection('users').doc(user.uid)
      .collection('memeHistory').add({
        memeName:  memeName,
        imageUrl:  imageUrl,
        savedAt:   firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('✅ Meme saved to Firebase history!');

    // Optional: brief visual feedback on the button
    if (downloadButton) {
      const original = downloadButton.textContent;
      downloadButton.textContent = '✅ Saved!';
      setTimeout(() => { downloadButton.textContent = original; }, 2000);
    }

  } catch (err) {
    console.error('❌ Firebase save failed:', err);
    // Don't block the user — local download already happened
  }
}