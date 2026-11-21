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
import type { DetectedPose } from "./pose";
import { JOINTS, scorePose, ScoreSmoother } from "./scoring";
import type { PoseScore } from "./scoring";
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
/** The most recent pose seen on the webcam (used by the T key, see below). */
let latestPose: DetectedPose | null = null;
/** Averages the last 10 scores so the big number doesn't flicker. */
const smoother = new ScoreSmoother(10);

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
  showScore(null);
  smoother.reset();
  latestPose = null;
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
    ? "Copy the pose!"
    : "This painting has no target pose yet. Strike the pose and press T to record one.";
  readyButton.disabled = false;

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
      latestPose = pose;
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

// Developer shortcut: on the challenge screen, press T to save your current
// pose as this painting's target. It is printed in the console (F12) so you
// can paste it into paintings.ts and keep it. Until then it is forgotten when
// the page reloads.
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "t") return;
  if (screens.challenge.hidden || !currentPainting || !latestPose) return;

  currentPainting.targetPose = latestPose;
  smoother.reset();
  statusText.textContent = "Target pose recorded! Now try to match it.";
  console.log(
    `targetPose for "${currentPainting.id}" (paste into paintings.ts):\n` +
      JSON.stringify(latestPose),
  );
});

// --- Start the app -----------------------------------------------------------
showGallery();
