// ============================================
// FACE MEME MATCHER — app.js
// Bradley: Landmark detection + pose engine
// ============================================

const video = document.getElementById('video');
const memeDisplay = document.getElementById('meme-display');
const memeLabel = document.getElementById('meme-label');

const canvas = document.createElement('canvas');
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
const cameraPanel = document.getElementById('camera-panel');
cameraPanel.style.position = 'relative';
cameraPanel.appendChild(canvas);

// ── MEME POSE DATA ───────────────────────────
// Squint meme: eyes nearly closed + lips puckered
const MEME_POSES = [
  {
    id: "squint_pucker",
    name: "Squint Pucker Guy",
    image: "/static/memes/squint_pucker.png",
    match: (f) => f.eyesClosed && f.lipsPuckered
  }
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

// ── EXTRACT FEATURES FROM 68 LANDMARKS ───────
function extractFeatures(landmarks) {
  const p = landmarks.positions;

  // Eye openness ratio
  // Left eye: points 37-41, right eye: 43-47
  // EAR = Eye Aspect Ratio: vertical distance / horizontal distance
  const leftEAR = eyeAspectRatio(p[37], p[38], p[40], p[41], p[36], p[39]);
  const rightEAR = eyeAspectRatio(p[43], p[44], p[46], p[47], p[42], p[45]);
  const avgEAR = (leftEAR + rightEAR) / 2;
  const eyesClosed = avgEAR < 0.265;; // below this = squinting/closed

  // Lip protrusion (pucker)
  // Compare mouth width to face width
  // Puckered lips = narrow mouth width relative to face
  const mouthWidth = dist(p[48], p[54]);   // left corner to right corner
  const faceWidth = dist(p[0], p[16]);      // jaw width
  const mouthRatio = mouthWidth / faceWidth;
  const lipsPuckered = mouthRatio < 0.350;   // narrow mouth = puckered

  return { eyesClosed, lipsPuckered, avgEAR, mouthRatio };
}

// Eye Aspect Ratio helper
function eyeAspectRatio(p1, p2, p3, p4, cornerL, cornerR) {
  const vertical1 = dist(p1, p4);
  const vertical2 = dist(p2, p3);
  const horizontal = dist(cornerL, cornerR);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// Distance between two points
function dist(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

// ── POSE MATCHING ENGINE ──────────────────────
function findBestMatch(features) {
  for (const meme of MEME_POSES) {
    if (meme.match(features)) return meme;
  }
  return null; // neutral face = no match = no meme
}

// ── DETECTION LOOP ────────────────────────────
async function runDetection() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  setInterval(async () => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) {
      memeDisplay.src = '';
      if (memeLabel) memeLabel.textContent = '';
      return;
    }

    // Resize canvas to match video
    const dims = faceapi.matchDimensions(canvas, video, true);
    const resized = faceapi.resizeResults(detection, dims);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    // Extract + match
    const features = extractFeatures(resized.landmarks);
    const match = findBestMatch(features);

    if (match) {
      memeDisplay.src = match.image;
      if (memeLabel) memeLabel.textContent = match.name;
    } else {
      memeDisplay.src = '';
      if (memeLabel) memeLabel.textContent = 'Neutral — try the pose!';
    }

    // Debug: print values to console so you can tune thresholds
    console.log(`EAR: ${features.avgEAR.toFixed(3)} | MouthRatio: ${features.mouthRatio.toFixed(3)} | eyesClosed: ${features.eyesClosed} | lipsPuckered: ${features.lipsPuckered}`);

  }, 200);
}

// ── BOOT ──────────────────────────────────────
(async () => {
  await loadModels();
  await startCamera();
  await runDetection();
  console.log("Face Meme Matcher running ✅");
})();