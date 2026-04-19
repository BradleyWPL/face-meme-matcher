// ── script.js ─────────────────────────────────────────────────────────────

// script code to handle non-engine and app functionality


console.log("Script loaded successfully!");


// Toggle password visibility with icon
document.addEventListener('DOMContentLoaded', () => {
console.log("DOM READY");

const toggles = document.querySelectorAll('.toggle-icon');
console.log("toggles found:", toggles.length);

toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        console.log("clicked!");

        const input = toggle.parentElement.querySelector('input');

        if (input.type === 'password') {
            input.type = 'text';
            toggle.textContent = '👀';
        } else {
            input.type = 'password';
            toggle.textContent = '😎';
        }
    });
});
});


const downloadButton = document.getElementById('download-button');
if (downloadButton) {
  downloadButton.addEventListener('click', downloadSnapshot);
}

async function downloadSnapshot() {
  const video       = document.getElementById('video');
  const memeDisplay = document.getElementById('meme-display');
  const memeLabel   = document.getElementById('meme-label');

  if (!video || !video.videoWidth) {
    alert('Camera not ready.');
    return;
  }

  // 1. Get the current SECURE Firebase user
  const user = auth.currentUser; 
  if (!user) {
    alert('You must be logged in to save memes to history!');
    return;
  }

  const memeName = memeLabel ? memeLabel.textContent.trim() : 'Unknown Meme';

  // ── 2. Create the Image Canvas ──
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth * 2;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  // Draw Camera & Meme side-by-side
  ctx.drawImage(video, 0, 0);
  ctx.drawImage(memeDisplay, video.videoWidth, 0, video.videoWidth, video.videoHeight);

  const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

// ── 3. UPLOAD TO FIREBASE STORAGE FIRST ──
try {
    const filename = `memeHistory/${user.uid}/${Date.now()}.png`;
    const storageRef = firebase.storage().ref(filename);
    const uploadTask = await storageRef.put(imageBlob);
    const downloadURL = await uploadTask.ref.getDownloadURL();

    // ── 4. SAVE URL TO FIRESTORE ──
    await db.collection('users')
      .doc(user.uid)
      .collection('memeHistory')
      .add({
        memeName: memeName,
        imageUrl: downloadURL,  // ← real URL, not base64
        savedAt:  firebase.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Saved to Firebase History');

    // ── 4. LOCAL DOWNLOAD ──
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();

    if (downloadButton) {
      downloadButton.textContent = '✅ Saved!';
      setTimeout(() => {
        downloadButton.textContent = '📸 Download';
        downloadButton.disabled = false;
      }, 2000);
    }

  } catch (err) {
    console.error('❌ Save failed:', err);
    alert('Saved locally, but could not sync to history. Check your Firebase Rules!');
    
    if (downloadButton) {
      downloadButton.textContent = '📸 Download';
      downloadButton.disabled = false;
    }
  }
}