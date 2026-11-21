// main.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The app shell. It switches between the screens and runs the camera loop.
//
//   gallery  ->  pose challenge  ->  countdown  ->  result
//   (pick a      (webcam, skeleton,  (3, 2, 1,      (framed photo,
//    painting)    live score)          snapshot)      download, try another)
//
// All the clever work happens in the other modules; this file just connects
// them to the page.
// ---------------------------------------------------------------------------

import "./style.css";
import { startCamera, stopCamera } from "./camera";
import { detect, loadPoseModel, POSE_CONNECTIONS } from "./pose";
import type { DetectedPose } from "./pose";
import { JOINTS, scorePose, ScoreSmoother } from "./scoring";
import type { PoseScore } from "./scoring";
import { paintings } from "./paintings";
import type { Painting } from "./paintings";
import { createFramedResult, loadSegmenter } from "./composite";

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
const resultStatus = byId("result-status");
const resultHolder = byId("result-holder");
const downloadButton = byId<HTMLButtonElement>("download-button");
const againButton = byId<HTMLButtonElement>("again-button");

// --- App state ---------------------------------------------------------------

/** The painting the player picked in the gallery. */
let currentPainting: Painting | null = null;
/** The id of the running animation frame loop, so we can stop it. */
let loopId: number | null = null;
/** Averages the last 10 scores so the big number doesn't flicker. */
const smoother = new ScoreSmoother(10);
/** The score currently on screen (this is what goes on the plaque). */
let currentScore: number | null = null;
/** The finished framed picture, kept for the Download button. */
let resultCanvas: HTMLCanvasElement | null = null;

const COUNTDOWN_SECONDS = 3;

// Colours for the score and the skeleton's limbs.
const GOOD = "#2ecc71"; // green
const CLOSE = "#f39c12"; // amber
const OFF = "#e74c3c"; // red
const NOT_SCORED = "#f5d76e"; // gold: limbs that aren't part of the score

/** Pick green / amber / red for a score out of 100. */
function scoreColour(score: number): string {
  if (score >= 70) return GOOD;
  if (score >= 40) return CLOSE;
  return OFF;
}

/** Show one screen and hide the others. */
function showScreen(name: keyof typeof screens): void {
  for (const [screenName, element] of Object.entries(screens)) {
    element.hidden = screenName !== name;
  }
  window.scrollTo(0, 0);
}

/** Wait for some milliseconds (use with await). */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Screen 1: gallery
// =============================================================================

/** Build one framed card per painting. Clicking a card starts the challenge. */
function showGallery(): void {
  paintingList.innerHTML = "";

  for (const painting of paintings) {
    // <button class="card">
    //   <div class="gilt"><img></div>
    //   <div class="label"><strong>Title</strong><span>Artist, year</span></div>
    // </button>
    const card = document.createElement("button");
    card.className = "card";

    const frame = document.createElement("div");
    frame.className = "gilt";
    const image = document.createElement("img");
    image.src = painting.imageUrl;
    image.alt = `${painting.title} by ${painting.artist}`;
    frame.appendChild(image);

    const label = document.createElement("div");
    label.className = "label";
    const title = document.createElement("strong");
    title.textContent = painting.title;
    const artist = document.createElement("span");
    artist.textContent = `${painting.artist}, ${painting.year}`;
    label.append(title, artist);

    card.append(frame, label);
    card.addEventListener("click", () => startChallenge(painting));
    paintingList.appendChild(card);
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
  paintingCaption.textContent = `${painting.title}, ${painting.artist} (${painting.year})`;
  showScore(null);
  smoother.reset();
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
  statusText.textContent = painting.targetPose
    ? 'Copy the pose! When the score is high, press "Take my portrait".'
    : "This painting has no target pose yet (see tools/pose-picker.html).";
  readyButton.disabled = false;

  // Start downloading the background-removal model now, while the player
  // is posing, so the result appears quickly. If it fails, composite.ts
  // simply keeps the background.
  loadSegmenter().catch((error) => console.warn("Could not load the segmenter yet.", error));

  // Make the canvas the same size as the camera image.
  cameraCanvas.width = video.videoWidth;
  cameraCanvas.height = video.videoHeight;

  runCameraLoop();
}

/** Runs once per screen refresh (about 60 times a second). */
function runCameraLoop(): void {
  let lastVideoTime = -1;
  let pose: DetectedPose | null = null;
  let poseScore: PoseScore | null = null;

  const tick = () => {
    // The screen refreshes faster than the camera delivers new pictures.
    // Only run pose detection when there is a new camera frame.
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      pose = detect(video);
      poseScore = null;

      if (pose && currentPainting?.targetPose) {
        poseScore = scorePose(pose, currentPainting.targetPose);
        // If no joint could be compared (e.g. you're out of shot), keep
        // showing the last score instead of jumping around.
        if (poseScore.overall !== null) {
          showScore(smoother.add(poseScore.overall));
        }
      }
    }

    drawFrame(pose, poseScore);
    loopId = requestAnimationFrame(tick);
  };
  tick();
}

/** Show the big score number (or a dash if there is no score). */
function showScore(score: number | null): void {
  currentScore = score;
  scoreText.textContent = score === null ? "–" : String(score);
  scoreText.style.color = score === null ? "" : scoreColour(score);
}

function stopCameraLoop(): void {
  if (loopId !== null) cancelAnimationFrame(loopId);
  loopId = null;
}

/** Draw the camera image and the skeleton on top of it. */
function drawFrame(pose: DetectedPose | null, poseScore: PoseScore | null): void {
  const width = cameraCanvas.width;
  const height = cameraCanvas.height;

  ctx.save();
  // Flip horizontally so it looks like a mirror (raise your right hand and
  // the hand on the right of the screen goes up). Everything drawn until
  // ctx.restore() is flipped, so the skeleton stays lined up with the video.
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(video, 0, 0, width, height);
  if (pose) drawSkeleton(pose.landmarks, poseScore, width, height);

  ctx.restore();
}

/**
 * Draw lines between joints (coloured by how well each limb matches the
 * painting), then a dot on each joint.
 */
function drawSkeleton(
  landmarks: DetectedPose["landmarks"],
  poseScore: PoseScore | null,
  width: number,
  height: number,
): void {
  // Landmarks are 0..1, so multiply by the canvas size to get pixels.
  const isVisible = (index: number) => (landmarks[index]?.visibility ?? 0) > 0.5;

  // Which landmark has which score? e.g. landmark 13 (left elbow) gets the
  // left elbow's score. Landmarks that aren't scored joints are left out.
  const scoreAtLandmark = new Map<number, number>();
  for (const joint of JOINTS) {
    const score = poseScore?.joints[joint.name];
    if (score !== undefined) scoreAtLandmark.set(joint.points[1], score);
  }

  ctx.lineWidth = 6;
  for (const { start, end } of POSE_CONNECTIONS) {
    if (!isVisible(start) || !isVisible(end)) continue;

    // A bone gets the colour of the WORSE of the joints at its two ends,
    // e.g. the upper arm is red if either the shoulder or the elbow is off.
    const endScores = [scoreAtLandmark.get(start), scoreAtLandmark.get(end)]
      .filter((score) => score !== undefined);
    ctx.strokeStyle =
      endScores.length > 0 ? scoreColour(Math.min(...endScores)) : NOT_SCORED;

    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff"; // white joints
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
  // No leaving or restarting while counting down.
  readyButton.disabled = true;
  backButton.disabled = true;

  // 3... 2... 1... shown big on top of the camera. The camera loop keeps
  // running underneath, so the player can still adjust and the score updates.
  countdownText.hidden = false;
  for (let n = COUNTDOWN_SECONDS; n > 0; n--) {
    countdownText.textContent = String(n);
    await wait(1000);
  }
  countdownText.hidden = true;

  // Snap! Remember the score at this exact moment for the plaque.
  const finalScore = currentScore;
  const photo = takeSnapshot();
  stopCameraLoop();
  stopCamera(video);
  backButton.disabled = false;

  await showResult(photo, finalScore);
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

async function showResult(photo: HTMLCanvasElement, score: number | null): Promise<void> {
  if (!currentPainting) return;

  // Show the screen straight away with a message, because removing the
  // background takes a moment.
  resultHolder.innerHTML = "";
  resultCanvas = null;
  downloadButton.disabled = true;
  resultStatus.textContent = "Framing your portrait…";
  showScreen("result");

  resultCanvas = await createFramedResult(photo, currentPainting, score);
  resultHolder.appendChild(resultCanvas);
  resultStatus.textContent = "";
  downloadButton.disabled = false;
}

/** Save the framed picture as a PNG file. */
function downloadResult(): void {
  if (!resultCanvas || !currentPainting) return;
  // A temporary link with the "download" attribute makes the browser save
  // the file instead of opening it.
  const link = document.createElement("a");
  link.download = `you-after-${currentPainting.id}.png`;
  link.href = resultCanvas.toDataURL("image/png");
  link.click();
}

// --- Buttons -----------------------------------------------------------------

readyButton.addEventListener("click", () => startCountdown());

backButton.addEventListener("click", () => {
  stopCameraLoop();
  stopCamera(video);
  showGallery();
});

downloadButton.addEventListener("click", () => downloadResult());

againButton.addEventListener("click", () => showGallery());

// --- Start the app -----------------------------------------------------------
showGallery();
