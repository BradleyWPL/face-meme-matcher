// =============================================================================
// FILE: script.js
// PROJECT: Face Meme Matcher — Meme Me
// =============================================================================
// DESCRIPTION:
//   Handles the Download Match button. Captures the live camera and matched
//   meme side-by-side onto an HTML canvas, uploads the image to Firebase
//   Storage, and saves the metadata record to Firestore meme history.
//
// IPO BREAKDOWN:
//   INPUT:
//     Click event on #download-button element
//     auth.currentUser — authenticated Firebase user (secure, not sessionStorage)
//     Live <video> element with active webcam stream
//     #meme-display image element with current matched meme
//     #meme-label text content for the meme name
//
//   PROCESSING:
//     Validates camera is ready (video.videoWidth > 0)
//     Checks auth.currentUser — blocks save if not logged in
//     Creates canvas sized at video.videoWidth * 2 x video.videoHeight
//     Draws webcam frame on left half, meme image on right half
//     Converts canvas to Blob via canvas.toBlob() for binary upload
//     Uploads blob to Firebase Storage: memeHistory/{uid}/{timestamp}.png
//     Retrieves public download URL via storageRef.getDownloadURL()
//     Writes Firestore doc to users/{uid}/memeHistory with imageUrl,
//       memeName, savedAt server timestamp
//     Triggers local file download via programmatic <a> click
//     Updates button state: Saving → Saved! → reset after 2.5 seconds
//
//   OUTPUT:
//     Side-by-side PNG image downloaded to user's local device
//     Image stored in Firebase Storage: memeHistory/{uid}/{timestamp}.png
//     Firestore doc created in users/{uid}/memeHistory
//     Button visual feedback ( Saving →  Saved! → reset)
//     Error alert with Firebase error code if upload or write fails
// =============================================================================

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