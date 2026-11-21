// main.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The app shell. It switches between the screens and runs the camera loop.
//
//   gallery  ->  pose challenge  ->  countdown  ->  result
//   (pick a      (webcam, skeleton,  (3, 2, 1,      (framed photo,
//    painting)    live score)          snapshot)      play again)
//
// All the clever work happens in the other modules; this file just connects
// them to the page.
// ---------------------------------------------------------------------------

import "./style.css";
import { startCamera, stopCamera } from "./camera";
import { detect, loadPoseModel, POSE_CONNECTIONS } from "./pose";
import type { PoseLandmarks } from "./pose";
import { scorePose } from "./scoring";
import { paintings } from "./paintings";
import type { Painting } from "./paintings";
import { createFramedResult } from "./composite";

// --- Grab the HTML elements we need (they are defined in index.html) --------

// Small helper: find an element by id, or crash with a clear message.
function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id} in index.html`);
  return element as T;
}

const screens = {
  gallery: byId("screen-gallery"),
  challenge: byId("screen-challenge"),
  result: byId("screen-result"),
};
const paintingList = byId("painting-list");
const paintingImage = byId<HTMLImageElement>("painting-image");
const paintingCaption = byId("painting-caption");
const video = byId<HTMLVideoElement>("video");
const cameraCanvas = byId<HTMLCanvasElement>("camera-canvas");
const ctx = cameraCanvas.getContext("2d")!;
const scoreText = byId("score");
const statusText = byId("status");
const countdownText = byId("countdown");
const readyButton = byId<HTMLButtonElement>("ready-button");
const backButton = byId<HTMLButtonElement>("back-button");
const resultHolder = byId("result-holder");
const againButton = byId<HTMLButtonElement>("again-button");

// --- App state ---------------------------------------------------------------

/** The painting the player picked in the gallery. */
let currentPainting: Painting | null = null;
/** The id of the running animation frame loop, so we can stop it. */
let loopId: number | null = null;

/** Show one screen and hide the others. */
function showScreen(name: keyof typeof screens): void {
  for (const [screenName, element] of Object.entries(screens)) {
    element.hidden = screenName !== name;
  }
}

// =============================================================================
// Screen 1: gallery
// =============================================================================

function showGallery(): void {
  // TODO (Person B): show thumbnails of the paintings instead of plain buttons.
  paintingList.innerHTML = "";
  for (const painting of paintings) {
    const button = document.createElement("button");
    button.textContent = `${painting.title} (${painting.artist})`;
    button.addEventListener("click", () => startChallenge(painting));
    paintingList.appendChild(button);
  }
  showScreen("gallery");
}

// =============================================================================
// Screen 2: pose challenge (webcam + skeleton + live score)
// =============================================================================

async function startChallenge(painting: Painting): Promise<void> {
  currentPainting = painting;
  paintingImage.src = painting.imageUrl;
  paintingImage.alt = `${painting.title} by ${painting.artist}`;
  paintingCaption.textContent = `${painting.title}, ${painting.artist}`;
  scoreText.textContent = "Score: –";
  readyButton.disabled = true;
  showScreen("challenge");

  statusText.textContent = "Starting camera and loading the pose model…";
  try {
    // Do both at the same time: they don't depend on each other.
    await Promise.all([startCamera(video), loadPoseModel()]);
  } catch (error) {
    statusText.textContent = `Something went wrong: ${(error as Error).message}`;
    console.error(error);
    return;
  }
  // If the player pressed "Back" while we were loading, turn the camera off again.
  if (screens.challenge.hidden) {
    stopCamera(video);
    return;
  }
  statusText.textContent = "Copy the pose!";
  readyButton.disabled = false;

  // Make the canvas the same size as the camera image.
  cameraCanvas.width = video.videoWidth;
  cameraCanvas.height = video.videoHeight;

  runCameraLoop();
}

/** Runs once per screen refresh (about 60 times a second). */
function runCameraLoop(): void {
  let lastVideoTime = -1;
  let landmarks: PoseLandmarks | null = null;

  const tick = () => {
    // The screen refreshes faster than the camera delivers new pictures.
    // Only run pose detection when there is a new camera frame.
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      landmarks = detect(video);

      if (landmarks && currentPainting?.targetPose) {
        const score = scorePose(landmarks, currentPainting.targetPose);
        scoreText.textContent = `Score: ${score} / 100`;
      }
    }

    drawFrame(landmarks);
    loopId = requestAnimationFrame(tick);
  };
  tick();
}

function stopCameraLoop(): void {
  if (loopId !== null) cancelAnimationFrame(loopId);
  loopId = null;
}

/** Draw the camera image and the skeleton on top of it. */
function drawFrame(landmarks: PoseLandmarks | null): void {
  const width = cameraCanvas.width;
  const height = cameraCanvas.height;

  ctx.save();
  // Flip horizontally so it looks like a mirror (raise your right hand and
  // the hand on the right of the screen goes up). Everything drawn until
  // ctx.restore() is flipped, so the skeleton stays lined up with the video.
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(video, 0, 0, width, height);
  if (landmarks) drawSkeleton(landmarks, width, height);

  ctx.restore();
}

/** Draw lines between joints, then a dot on each joint. */
function drawSkeleton(landmarks: PoseLandmarks, width: number, height: number): void {
  // Landmarks are 0..1, so multiply by the canvas size to get pixels.
  const isVisible = (index: number) => (landmarks[index]?.visibility ?? 0) > 0.5;

  ctx.strokeStyle = "#f5d76e"; // gold lines
  ctx.lineWidth = 4;
  for (const { start, end } of POSE_CONNECTIONS) {
    if (!isVisible(start) || !isVisible(end)) continue;
    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.stroke();
  }

  ctx.fillStyle = "#c0392b"; // red joints
  for (let i = 0; i < landmarks.length; i++) {
    if (!isVisible(i)) continue;
    ctx.beginPath();
    ctx.arc(landmarks[i].x * width, landmarks[i].y * height, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// =============================================================================
// Screen 3: countdown (shown on top of the challenge screen)
// =============================================================================

async function startCountdown(): Promise<void> {
  readyButton.disabled = true;

  // TODO (Person B): count down 3, 2, 1 (one second each) in countdownText,
  // maybe with a sound, before taking the photo. For now we wait one second.
  countdownText.hidden = false;
  countdownText.textContent = "📸";
  await new Promise((resolve) => setTimeout(resolve, 1000));
  countdownText.hidden = true;

  const photo = takeSnapshot();
  stopCameraLoop();
  stopCamera(video);
  await showResult(photo);
}

/** Copy the current camera image (mirrored, without the skeleton) into a new canvas. */
function takeSnapshot(): HTMLCanvasElement {
  const snapshot = document.createElement("canvas");
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  const snapshotCtx = snapshot.getContext("2d")!;
  snapshotCtx.translate(snapshot.width, 0);
  snapshotCtx.scale(-1, 1);
  snapshotCtx.drawImage(video, 0, 0);
  return snapshot;
}

// =============================================================================
// Screen 4: result
// =============================================================================

async function showResult(photo: HTMLCanvasElement): Promise<void> {
  if (!currentPainting) return;
  const framed = await createFramedResult(photo, currentPainting);

  // TODO (Person B): add a "Download" button (framed.toDataURL("image/png")).
  resultHolder.innerHTML = "";
  resultHolder.appendChild(framed);
  showScreen("result");
}

// --- Buttons -----------------------------------------------------------------

readyButton.addEventListener("click", () => startCountdown());

backButton.addEventListener("click", () => {
  stopCameraLoop();
  stopCamera(video);
  showGallery();
});

againButton.addEventListener("click", () => showGallery());

// --- Start the app -----------------------------------------------------------
showGallery();
