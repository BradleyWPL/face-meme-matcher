// ============================================
// FACE MEME MATCHER — app.js
// ============================================

const video       = document.getElementById('video');
const memeDisplay = document.getElementById('meme-display');
const memeLabel   = document.getElementById('meme-label');
const matchStatus = document.getElementById('match-status'); // new status dot

// Create overlay canvas — hidden by CSS (detection runs but no dots shown)
const canvas = document.createElement('canvas');
canvas.id = 'landmark-canvas';
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.pointerEvents = 'none';
canvas.style.display = 'none';  // hidden — landmarks run silently
const cameraPanel = document.getElementById('camera-panel');
cameraPanel.style.position = 'relative';
cameraPanel.appendChild(canvas);

// ── STICKY MEME STATE ─────────────────────────
const HOLD_MS = 2000;
let lastMatchTime = 0;
let lastMatch     = null;

// ── MEME DEFINITIONS ─────────────────────────
const MEME_POSES = [
  {
    id: "Cat_smile",
    name: "Cat Smile",
    image: "/static/memes/Cat_smile.png",
    instructions: "Open your mouth wide and keep your head straight. Tongue out helps!",
    match: (f) => f.mouthOpen && !f.eyesClosed && f.headTilt === 'none' && !f.lipsPuckered
  },
  {
    id: "reading_meme",
    name: "Reading Meme",
    image: "/static/memes/reading_meme.png",
    instructions: "Open your mouth and keep your head perfectly level.",
    match: (f) => f.mouthOpen && f.mouthRatio < 0.30 && !f.eyesClosed && f.headTilt === 'none'
  },
  {
    id: "scared_guy",
    name: "Scared Guy",
    image: "/static/memes/scared_guy.png",
    instructions: "Close your eyes gently, keep head straight, mouth closed.",
    match: (f) => f.eyesClosed && !f.browLow && f.headTilt === 'none' && !f.mouthOpen
  },
  {
    id: "squint_pucker",
    name: "Squint Pucker",
    image: "/static/memes/squint_pucker.png",
    instructions: "Squint your eyes AND pucker your lips — head straight.",
    match: (f) => f.eyesClosed && f.lipsPuckered && f.headTilt === 'none'
  },
  {
    id: "confused_dog",
    name: "Confused Dog",
    image: "/static/memes/confused_dog.png",
    instructions: "Tilt your head to the LEFT and keep your mouth closed.",
    match: (f) => f.headTilt === 'left' && !f.mouthOpen
  },
  {
    id: "thinking_guy",
    name: "Thinking Guy",
    image: "/static/memes/thinking_guy.png",
    instructions: "Tilt your head to the RIGHT, mouth closed, eyes open.",
    match: (f) => f.headTilt === 'right' && !f.mouthOpen && !f.eyesClosed
  },
];

// ── LOAD MODELS ──────────────────────────────
async function loadModels() {
  const MODEL_URL = '/static/models';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  if (matchStatus) matchStatus.textContent = 'Ready — show your face!';
}

// ── START WEBCAM ─────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise(resolve => video.onloadedmetadata = resolve);
  } catch (err) {
    if (matchStatus) matchStatus.textContent = '⚠️ Camera access denied';
    console.error('Camera error:', err);
  }
}

// ── HELPERS ──────────────────────────────────
function dist(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
function eyeAspectRatio(p1, p2, p3, p4, cL, cR) {
  return (dist(p1, p4) + dist(p2, p3)) / (2.0 * dist(cL, cR));
}

// ── EXTRACT FEATURES ─────────────────────────
function extractFeatures(landmarks) {
  const p = landmarks.positions;

  const leftEAR  = eyeAspectRatio(p[37], p[38], p[40], p[41], p[36], p[39]);
  const rightEAR = eyeAspectRatio(p[43], p[44], p[46], p[47], p[42], p[45]);
  const avgEAR   = (leftEAR + rightEAR) / 2;
  const eyesClosed = avgEAR < 0.265;

  const mouthWidth   = dist(p[48], p[54]);
  const faceWidth    = dist(p[0],  p[16]);
  const mouthRatio   = mouthWidth / faceWidth;
  const lipsPuckered = mouthRatio < 0.330;

  const faceHeight = dist(p[8], p[27]);
  const lipGap     = dist(p[62], p[66]) / faceHeight;
  const mouthOpen  = lipGap > 0.08;

  const leftBrowToEye  = Math.abs(p[19].y - p[37].y) / faceHeight;
  const rightBrowToEye = Math.abs(p[24].y - p[44].y) / faceHeight;
  const browLow        = ((leftBrowToEye + rightBrowToEye) / 2) < 0.145;

  const eyeHeightDiff = p[36].y - p[45].y;
  const tiltThreshold = faceWidth * 0.06;
  const lookingUp     = ((p[36].y + p[45].y) / 2 - p[30].y) / faceHeight > 0.32;

  let headTilt = 'none';
  if      (lookingUp)                        headTilt = 'up';
  else if (eyeHeightDiff > tiltThreshold)    headTilt = 'right';
  else if (eyeHeightDiff < -tiltThreshold)   headTilt = 'left';

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

    if (!detection) {
      if (matchStatus) {
        matchStatus.className = 'match-status';
        matchStatus.textContent = 'No face detected';
      }
      return;
    }

    // Resize results (needed for accuracy) but canvas stays hidden
    const dims    = faceapi.matchDimensions(canvas, video, true);
    const resized = faceapi.resizeResults(detection, dims);
    // NOTE: we intentionally do NOT call faceapi.draw.drawFaceLandmarks()
    // Canvas is hidden so dots never show on screen

    const features = extractFeatures(resized.landmarks);
    const match    = findBestMatch(features);
    const now      = Date.now();

    if (match) {
      lastMatch     = match;
      lastMatchTime = now;
      checkGamePose(match); 
      memeDisplay.src = match.image;
      if (memeLabel)   memeLabel.textContent   = match.name;
      if (matchStatus) {
        matchStatus.className   = 'match-status active';
        matchStatus.textContent = '✓ ' + match.name;
      }
    } else if (lastMatch && (now - lastMatchTime) < HOLD_MS) {
      memeDisplay.src = lastMatch.image;
      if (memeLabel)   memeLabel.textContent   = lastMatch.name;
    } else {
      lastMatch = null;
      memeDisplay.src = '';
      if (memeLabel)   memeLabel.textContent   = 'Strike a pose!';
      if (matchStatus) {
        matchStatus.className   = 'match-status';
        matchStatus.textContent = 'Detecting…';
      }
    }
  }, 200);
}

// ── GALLERY CAROUSEL ─────────────────────────
const memeList = [
  { src: "/static/memes/squint_pucker.png",     label: "Squint Pucker" },
  { src: "/static/memes/scared_guy.png",        label: "Scared Guy" },
  { src: "/static/memes/thinking_guy.png",      label: "Thinking Guy" },
  { src: "/static/memes/reading_meme.png",      label: "Reading Meme" },
  { src: "/static/memes/confused_dog.png",      label: "Confused Dog" },
  { src: "/static/memes/Cat_smile.png",         label: "Cat Smile" },
];

let currentSlide = 0;

function changeSlide(direction) {
  currentSlide = (currentSlide + direction + memeList.length) % memeList.length;
  const item = memeList[currentSlide];
  document.getElementById('gallery-display').src   = item.src;
  document.getElementById('gallery-label').textContent = item.label;

  // Update instructions for the selected meme
  const pose = MEME_POSES.find(p => p.name === item.label);
  const instrEl = document.getElementById('instructions-text');
  if (instrEl && pose) instrEl.textContent = pose.instructions;
}

// ── DOWNLOAD + FIREBASE SAVE ──────────────────
async function downloadSnapshot() {
  const w = video.videoWidth;
  const h = video.videoHeight;

  if (!w || !h) {
    alert('Camera is still loading — wait a moment and try again.');
    return;
  }

  const user      = JSON.parse(sessionStorage.getItem('user') || 'null');
  const memeName  = memeLabel ? memeLabel.textContent.trim() : 'Unknown';
  const timestamp = Date.now();

  // Build side-by-side canvas
  const snapCanvas = document.createElement('canvas');
  snapCanvas.width  = w * 2;
  snapCanvas.height = h;
  const ctx = snapCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);

  if (memeDisplay.src && memeDisplay.naturalWidth > 0) {
    ctx.drawImage(memeDisplay, w, 0, w, h);
  } else {
    ctx.fillStyle = '#6a35d8';
    ctx.fillRect(w, 0, w, h);
    ctx.fillStyle = 'white';
    ctx.font = `${Math.floor(h * 0.06)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('No match yet!', w * 1.5, h / 2);
  }

  // Local download
  const link = document.createElement('a');
  link.download = `meme-match-${timestamp}.png`;
  link.href = snapCanvas.toDataURL('image/png');
  link.click();


  const btn = document.getElementById('download-btn');
  if (btn) { btn.textContent = '⏳ Saving…'; btn.disabled = true; }

  try {
    const blob = await new Promise((resolve, reject) => {
      snapCanvas.toBlob(
        b => b ? resolve(b) : reject(new Error('toBlob returned null')),
        'image/png'
      );
    });

    const storageRef = storage.ref().child(`memeHistory/${user.uid}/${timestamp}.png`);
    await storageRef.put(blob, { contentType: 'image/png' });
    const imageUrl = await storageRef.getDownloadURL();

    await db.collection('users').doc(user.uid).collection('memeHistory').add({
    imageUrl: downloadURL,
    memeName: currentMeme.name,
    savedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

    console.log('✅ Saved to Firebase!');
    if (btn) {
      btn.innerHTML = '✅ Saved!';
      setTimeout(() => { btn.innerHTML = '⬇ Download<br>Match'; btn.disabled = false; }, 2500);
    }
  } catch (err) {
    console.error('❌ Firebase save failed:', err.code, err.message);
    let hint = err.code === 'storage/unauthorized' ? 'Check Storage rules.' : err.message;
    alert('Downloaded locally ✅\nCloud save failed ❌: ' + hint);
    if (btn) {
      btn.innerHTML = '⚠️ Retry';
      setTimeout(() => { btn.innerHTML = '⬇ Download<br>Match'; btn.disabled = false; }, 3000);
    }
  }
}

// ── BOOT ─────────────────────────────────────
(async () => {
  if (matchStatus) matchStatus.textContent = 'Loading models…';
  await loadModels();
  await startCamera();
  await runDetection();
  console.log('Face Meme Matcher running ✅');
})();

// ══════════════════════════════════════════════
// GAME MODE SYSTEM
// ══════════════════════════════════════════════

// ── GAME STATE ───────────────────────────────
const GAME_DURATION_MS  = 10000;  // 10 second game
const POSE_WINDOW_MS    = 1500;   // 1.5s to hit each pose
const GETREADY_SECS     = 5;

let gameActive       = false;
let gameScore        = 0;
let gameTarget       = null;    // current meme to hit
let gamePoseDeadline = 0;       // timestamp by which pose must be hit
let gameEndTime      = 0;       // when the whole game ends
let gameTimerLoop    = null;
let joyCoins         = 0;

// ── LOAD JOY COINS FROM FIREBASE ─────────────
async function loadJoyCoins() {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.bypass) {
    updateCoinDisplay(0);
    return;
  }
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      joyCoins = doc.data().joyCoins || 0;
    }
    updateCoinDisplay(joyCoins);
  } catch (err) {
    console.error('Could not load joy coins:', err);
  }
}

function updateCoinDisplay(coins) {
  const el = document.getElementById('joy-coins-display');
  if (el) el.textContent = `🪙 ${coins}`;
}

// ── SAVE JOY COINS TO FIREBASE ───────────────
async function saveJoyCoins(newTotal) {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.bypass) return;
  try {
    await db.collection('users').doc(user.uid).update({ joyCoins: newTotal });
    console.log('Joy coins saved:', newTotal);
  } catch (err) {
    console.error('Could not save joy coins:', err);
  }
}

// ── PICK RANDOM MEME ─────────────────────────
function pickRandomMeme(excludeId = null) {
  const pool = MEME_POSES.filter(m => m.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── SHOW OVERLAY ─────────────────────────────
function showOverlay(show) {
  const el = document.getElementById('game-overlay');
  el.style.display = show ? 'flex' : 'none';
}

// ── START GAME ───────────────────────────────
async function startGame() {
  if (gameActive) return;

  // ── GET READY countdown ──────────────────
  showOverlay(true);
  document.getElementById('game-timer-bar-wrap').style.display = 'none';
  document.getElementById('game-score-display').textContent = '';
  document.getElementById('game-prompt').textContent = 'Get Ready!';

  for (let i = GETREADY_SECS; i >= 1; i--) {
    document.getElementById('game-countdown').textContent = i;
    await sleep(1000);
  }
  document.getElementById('game-countdown').textContent = 'GO!';
  await sleep(600);
  document.getElementById('game-countdown').textContent = '';

  // ── Init game state ───────────────────────
  gameActive = true;
  gameScore  = 0;
  gameEndTime = Date.now() + GAME_DURATION_MS;
  document.getElementById('game-timer-bar-wrap').style.display = 'block';

  nextPose();

  // ── Game clock — ends after 10s ───────────
  gameTimerLoop = setInterval(() => {
    const remaining = gameEndTime - Date.now();
    // Update overall timer bar
    const pct = Math.max(0, remaining / GAME_DURATION_MS * 100);
    document.getElementById('game-timer-bar').style.width = pct + '%';

    if (remaining <= 0) {
      endGame();
    }
  }, 100);
}

// ── NEXT POSE ────────────────────────────────
function nextPose() {
  if (!gameActive) return;

  const prevId = gameTarget ? gameTarget.id : null;
  gameTarget = pickRandomMeme(prevId);
  gamePoseDeadline = Date.now() + POSE_WINDOW_MS;

  document.getElementById('game-prompt').textContent = `👉 ${gameTarget.name}`;
  document.getElementById('game-score-display').textContent = `Score: ${gameScore}`;
}

// ── CALLED BY DETECTION LOOP DURING GAME ─────
function checkGamePose(match) {
  if (!gameActive || !gameTarget || !match) return;
  if (match.id !== gameTarget.id) return;

  // Correct pose hit within window!
  if (Date.now() <= gameEndTime) {
    gameScore++;
    document.getElementById('game-score-display').textContent = `Score: ${gameScore} ✅`;

    // Flash green feedback
    document.getElementById('game-prompt').style.color = '#7fff7f';
    setTimeout(() => {
      document.getElementById('game-prompt').style.color = '#fff';
      nextPose();
    }, 400);
  }
}

async function endGame() {
  if (!gameActive) return;
  gameActive = false;
  clearInterval(gameTimerLoop);

  showOverlay(false);

  const earned = gameScore;
  joyCoins += earned;

  const modal = document.getElementById('game-end-modal');
  modal.style.display = 'flex';
  document.getElementById('end-score').textContent = `You matched ${gameScore} memes!`;
  
  updateCoinDisplay(joyCoins);
  await saveJoyCoins(joyCoins);
  // Note: We removed the db.collection('memeHistory').add logic from here
}

// ── CLOSE END MODAL ───────────────────────────
function closeGameEnd() {
  document.getElementById('game-end-modal').style.display = 'none';
  gameTarget = null;
  gameScore  = 0;
}

// ── SLEEP HELPER ─────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── LOAD COINS ON PAGE LOAD ───────────────────
loadJoyCoins();