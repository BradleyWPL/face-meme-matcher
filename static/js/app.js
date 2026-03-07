// Face Meme Matcher - Main App
// Bradley: connects pose engine to meme display
// Hager: connects UI interactions here

const video = document.getElementById('video');
const memeDisplay = document.getElementById('meme-display');

// Start webcam
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

startCamera();
