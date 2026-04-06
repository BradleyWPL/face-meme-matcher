
// ============================================
// FACE MEME MATCHER — app.js
// Week 3: sticky delay + sharper conditions
// ============================================

const video = document.getElementById('video');
const memeDisplay = document.getElementById('meme-display');
const memeLabel = document.getElementById('meme-label');

const canvas = document.createElement('canvas');
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.pointerEvents = 'none';
const cameraPanel = document.getElementById('camera-panel');
cameraPanel.style.position = 'relative';
cameraPanel.appendChild(canvas);

// ── STICKY MEME STATE ─────────────────────────
// Meme stays visible for HOLD_MS after pose drops
const HOLD_MS = 2000;
let lastMatchTime = 0;
let lastMatch = null;

// ── MEME DEFINITIONS ─────────────────────────
// Features available:
// f.eyesClosed      — EAR < threshold
// f.lipsPuckered    — mouth narrow (not open)
// f.mouthOpen       — mouth vertically open
// f.headTilt        — 'left' | 'right' | 'up' | 'none'
// f.browLow         — eyebrows pulled down (angry/squint)

const MEME_POSES = [
  {
    id: "Cat_smile",
    name: "Cat Smile",
    image: "/static/memes/Cat_smile.png",
    // Tongue out = mouth open + head straight + eyes open
    match: (f) => f.mouthOpen && !f.eyesClosed && f.headTilt === 'none' && !f.lipsPuckered
  },
  {
    id: "reading_meme",
    name: "Reading Meme",
    image: "/static/memes/reading_meme.png",
    // Mouth wide open + leaning/straight + eyes open
    match: (f) => f.mouthOpen && f.mouthRatio < 0.30 && !f.eyesClosed && f.headTilt === 'none'
  },
  {
    id: "tyler_the_creator",
    name: "Tyler The Creator",
    image: "/static/memes/tyler_the_creator.png",
    // Angry squint: eyes nearly closed + brow low + head straight
    match: (f) => f.eyesClosed && f.browLow && f.headTilt === 'none' && !f.mouthOpen
  },
  {
    id: "scared_guy",
    name: "Scared Guy",
    image: "/static/memes/scared_guy.png",
    // Eyes closed/wide + mouth covered = mouth ratio drops + no pucker
    match: (f) => f.eyesClosed && !f.browLow && f.headTilt === 'none' && !f.mouthOpen
  },
  {
    id: "squint_pucker",
    name: "Squint Pucker",
    image: "/static/memes/squint_pucker.png",
    // Eyes squinted + lips puckered (narrow) + straight
    match: (f) => f.eyesClosed && f.lipsPuckered && f.headTilt === 'none'
  },
  {
    id: "confused_dog",
    name: "Confused Dog",
    image: "/static/memes/confused_dog.png",
    // Strong head tilt left
    match: (f) => f.headTilt === 'left' && !f.mouthOpen
  },
  {
    id: "thinking_guy",
    name: "Thinking Guy",
    image: "/static/memes/thinking_guy.png",
    // Head tilt right + mouth closed
    match: (f) => f.headTilt === 'right' && !f.mouthOpen && !f.eyesClosed
  },
  {
    id: "thinking_monkey",
    name: "Thinking Monkey",
    image: "/static/memes/thinking_monkey.png",
    // Looking up + mouth closed
    match: (f) => f.headTilt === 'up' && !f.mouthOpen
  },
];

// ── LOAD MODELS ──────────────────────────────
async function loadModels() {
  const MODEL_URL = '/static/models';
  console.log("Loading models...");
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  console.log("Models loaded ✅");
}

// ── START WEBCAM ─────────────────────────────
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise(resolve => video.onloadedmetadata = resolve);
}

// ── HELPERS ───────────────────────────────────
function dist(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function eyeAspectRatio(p1, p2, p3, p4, cL, cR) {
  return (dist(p1, p4) + dist(p2, p3)) / (2.0 * dist(cL, cR));
}

// ── EXTRACT FEATURES ─────────────────────────
function extractFeatures(landmarks) {
  const p = landmarks.positions;

  // ── Eyes ──
  const leftEAR  = eyeAspectRatio(p[37], p[38], p[40], p[41], p[36], p[39]);
  const rightEAR = eyeAspectRatio(p[43], p[44], p[46], p[47], p[42], p[45]);
  const avgEAR   = (leftEAR + rightEAR) / 2;
  const eyesClosed = avgEAR < 0.265;

  // ── Mouth width (puckered = narrow) ──
  const mouthWidth = dist(p[48], p[54]);
  const faceWidth  = dist(p[0],  p[16]);
  const mouthRatio = mouthWidth / faceWidth;
  const lipsPuckered = mouthRatio < 0.330;

  // ── Mouth open (vertical gap between lips) ──
  const topLip    = p[62];  // inner top lip
  const bottomLip = p[66];  // inner bottom lip
  const faceHeight = dist(p[8], p[27]);
  const lipGap    = dist(topLip, bottomLip) / faceHeight;
  const mouthOpen = lipGap > 0.08;

  // ── Brow low (angry/furrowed) ──
  // Distance from brow to eye — smaller = brow pulled down
  const leftBrowToEye  = Math.abs(p[19].y - p[37].y) / faceHeight;
  const rightBrowToEye = Math.abs(p[24].y - p[44].y) / faceHeight;
  const avgBrowDist    = (leftBrowToEye + rightBrowToEye) / 2;
  const browLow        = avgBrowDist < 0.145;

  // ── Head tilt ──
  const leftEyeY  = p[36].y;
  const rightEyeY = p[45].y;
  const eyeHeightDiff  = leftEyeY - rightEyeY;
  const tiltThreshold  = faceWidth * 0.06;

  const noseTip  = p[30];
  const eyeMidY  = (p[36].y + p[45].y) / 2;
  const lookingUp = (eyeMidY - noseTip.y) / faceHeight > 0.32;

  let headTilt = 'none';
  if (lookingUp) {
    headTilt = 'up';
  } else if (eyeHeightDiff > tiltThreshold) {
    headTilt = 'right';
  } else if (eyeHeightDiff < -tiltThreshold) {
    headTilt = 'left';
  }

  return { eyesClosed, lipsPuckered, mouthOpen, mouthRatio, browLow, headTilt, avgEAR, lipGap };
}

// ── MATCH ENGINE ─────────────────────────────
function findBestMatch(f) {
  for (const meme of MEME_POSES) {
    if (meme.match(f)) return meme;
  }
  return null;
}

// ── DETECTION LOOP ────────────────────────────
async function runDetection() {
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) return;

    const dims    = faceapi.matchDimensions(canvas, video, true);
    const resized = faceapi.resizeResults(detection, dims);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    const features = extractFeatures(resized.landmarks);
    const match    = findBestMatch(features);
    const now      = Date.now();

    if (match) {
      // New match — show it and reset hold timer
      lastMatch    = match;
      lastMatchTime = now;
      memeDisplay.src = match.image;
      if (memeLabel) memeLabel.textContent = match.name;
    } else if (lastMatch && (now - lastMatchTime) < HOLD_MS) {
      // No match but within hold window — keep showing last meme
      memeDisplay.src = lastMatch.image;
      if (memeLabel) memeLabel.textContent = lastMatch.name;
    } else {
      // Hold expired — clear
      lastMatch = null;
      memeDisplay.src = '';
      if (memeLabel) memeLabel.textContent = 'Neutral — try a pose!';
    }

    console.log(`EAR:${features.avgEAR.toFixed(3)} | mouth:${features.mouthRatio.toFixed(3)} | gap:${features.lipGap.toFixed(3)} | open:${features.mouthOpen} | brow:${features.browLow} | tilt:${features.headTilt}`);

  }, 200);
}

// ── GALLERY CAROUSEL ─────────────────────────
const memeList = [
  { src: "/static/memes/squint_pucker.png",     label: "Squint Pucker" },
  { src: "/static/memes/scared_guy.png",        label: "Scared Guy" },
  { src: "/static/memes/thinking_guy.png",      label: "Thinking Guy" },
  { src: "/static/memes/thinking_monkey.png",   label: "Thinking Monkey" },
  { src: "/static/memes/tyler_the_creator.png", label: "Tyler The Creator" },
  { src: "/static/memes/reading_meme.png",      label: "Reading Meme" },
  { src: "/static/memes/confused_dog.png",      label: "Confused Dog" },
  { src: "/static/memes/Cat_smile.png",         label: "Cat Smile" },
];

let currentSlide = 0;

function changeSlide(direction) {
  currentSlide = (currentSlide + direction + memeList.length) % memeList.length;
  document.getElementById('gallery-display').src = memeList[currentSlide].src;
  document.getElementById('gallery-label').textContent = memeList[currentSlide].label;
}

// ── BOOT ─────────────────────────────────────
(async () => {
  await loadModels();
  await startCamera();
  await runDetection();
  console.log("Face Meme Matcher running ✅");
})();


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
      const blob = await new Promise(resolve => snapCanvas.toBlob(resolve, 'image/png'));
      const filename = `memeHistory/${user.uid}/${Date.now()}.png`;
      const ref = storage.ref(filename);
      await ref.put(blob);
      const imageUrl = await ref.getDownloadURL();

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
  }
}