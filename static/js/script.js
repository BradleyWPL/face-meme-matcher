// ── script.js ─────────────────────────────────────────────────────────────
// Handles download button + Firebase save for the meme-me page.
// firebase-config.js must load before this so auth, db, storage are available.

const downloadButton = document.getElementById('download-button');
if (downloadButton) {
  downloadButton.addEventListener('click', downloadSnapshot);
}

// ── DOWNLOAD + SAVE TO FIREBASE ───────────────────────────────────────────
async function downloadSnapshot() {
  const video       = document.getElementById('video');
  const memeDisplay = document.getElementById('meme-display');
  const memeLabel   = document.getElementById('meme-label');

  // Guard: video must exist and have real dimensions
  if (!video) {
    console.error('downloadSnapshot: #video element not found.');
    alert('Camera not ready. Please allow camera access and try again.');
    return;
  }

  const w = video.videoWidth;
  const h = video.videoHeight;

  if (!w || !h) {
    console.error('downloadSnapshot: video has no dimensions. w=' + w + ' h=' + h);
    alert('Camera is still loading — wait a moment and try again.');
    return;
  }

  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  const memeName = memeLabel ? memeLabel.textContent.trim() : 'Unknown';

  // ── 1. Build side-by-side canvas ──────────────────────────────────────
  const snapCanvas = document.createElement('canvas');
  snapCanvas.width  = w * 2;
  snapCanvas.height = h;
  const ctx = snapCanvas.getContext('2d');

  // Left half = webcam
  ctx.drawImage(video, 0, 0, w, h);

  // Right half = matched meme or purple fallback
  if (memeDisplay && memeDisplay.src && memeDisplay.naturalWidth > 0) {
    ctx.drawImage(memeDisplay, w, 0, w, h);
  } else {
    ctx.fillStyle = '#6a35d8';
    ctx.fillRect(w, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.font = `${Math.floor(h * 0.06)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('No match yet!', w * 1.5, h / 2);
  }

  // ── 2. Always trigger local download first ────────────────────────────
  const timestamp = Date.now();
  const link = document.createElement('a');
  link.download = `meme-match-${timestamp}.png`;
  link.href = snapCanvas.toDataURL('image/png');
  link.click();

  // ── 3. Save to Firebase (real logged-in users only) ────────────────────
  if (!user || user.bypass) {
    console.log('Bypass/no session — skipping Firebase save.');
    return;
  }

  if (downloadButton) {
    downloadButton.textContent = '⏳ Saving…';
    downloadButton.disabled = true;
  }

  try {
    // Canvas → Blob
    const blob = await new Promise((resolve, reject) => {
      snapCanvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
        'image/png'
      );
    });

    console.log('Blob ready, size:', blob.size, 'bytes');

    // Upload to Firebase Storage: memeHistory/{uid}/{timestamp}.png
    const storagePath = `memeHistory/${user.uid}/${timestamp}.png`;
    const storageRef = storage.ref().child(storagePath);
    await storageRef.put(blob, { contentType: 'image/png' });
    const imageUrl = await storageRef.getDownloadURL();

    console.log('Upload done. URL:', imageUrl.substring(0, 80) + '…');

    // Write to Firestore: users/{uid}/memeHistory
    // NOTE: field names must EXACTLY match what history.js reads (imageUrl, memeName, savedAt)
    await db.collection('users')
      .doc(user.uid)
      .collection('memeHistory')
      .add({
        memeName: memeName,
        imageUrl: imageUrl,
        savedAt:  firebase.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Firestore record saved to users/' + user.uid + '/memeHistory');

    if (downloadButton) {
      downloadButton.textContent = '✅ Saved!';
      setTimeout(() => {
        downloadButton.textContent = '📸 Download';
        downloadButton.disabled = false;
      }, 2500);
    }

  } catch (err) {
    console.error('❌ Firebase save failed — code:', err.code, '— message:', err.message);

    // Tell the user what went wrong
    let hint = err.message;
    if (err.code === 'storage/unauthorized') {
      hint = 'Storage permission denied. Update Firebase Storage rules (see README).';
    } else if (err.code === 'permission-denied') {
      hint = 'Firestore permission denied. Check your Firestore security rules.';
    }

    alert('Downloaded locally ✅\nCloud save failed ❌: ' + hint);

    if (downloadButton) {
      downloadButton.textContent = '⚠️ Cloud save failed';
      setTimeout(() => {
        downloadButton.textContent = '📸 Download';
        downloadButton.disabled = false;
      }, 3000);
    }
  }
}