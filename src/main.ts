// main.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// The app shell. It switches between the screens and runs the camera loop.
//
//   start screen ──Single Painting──> pick painting -> round -> framed result
//                └─Gallery Tour────> 5 rounds (break between) -> summary
//
// One "round" = show a painting, run the camera + live score, then take a
// snapshot. playRound() below does exactly that and is used by both modes
// (rounds.ts runs the Gallery Tour by calling it 5 times).
//
// The camera starts once when the page opens and keeps running, so rounds
// start instantly and the camera can be switched at any time.
// ---------------------------------------------------------------------------

import "./style.css";
import { activeCameraId, listCameras, startCamera, watchCameras } from "./camera";
import { detectAll, loadPoseModel, POSE_CONNECTIONS, setMaxPeople } from "./pose";
import type { DetectedPose } from "./pose";
import { JOINTS, scorePose, ScoreSmoother } from "./scoring";
import type { PoseScore } from "./scoring";
import { paintings } from "./paintings";
import type { Painting } from "./paintings";
import { createFramedResult, loadSegmenter } from "./composite";
import { PLAYER_COLOURS, PlayerTracker, pickWinner, winnerText } from "./players";
import type { Player } from "./players";
import { BREAK_SECONDS, ROUND_SECONDS, runGalleryTour, tourTotals } from "./rounds";
import type { RoundResult } from "./rounds";

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
  break: byId("screen-break"),
  result: byId("screen-result"),
  summary: byId("screen-summary"),
};
const paintingList = byId("painting-list");
const tourStart = byId("tour-start");
const playerNamesBox = byId("player-names");
const nameInputs = [byId<HTMLInputElement>("name-1"), byId<HTMLInputElement>("name-2")];
const cameraSelects = [...document.querySelectorAll<HTMLSelectElement>(".camera-select")];
const cameraStatus = byId("camera-status");
const retryButton = byId<HTMLButtonElement>("retry-button");
const settingsDialog = byId<HTMLDialogElement>("settings-dialog");
const notice = byId("notice");

const roundLabel = byId("round-label");
const paintingImage = byId<HTMLImageElement>("painting-image");
const paintingCaption = byId("painting-caption");
const video = byId<HTMLVideoElement>("video");
const cameraCanvas = byId<HTMLCanvasElement>("camera-canvas");
const ctx = cameraCanvas.getContext("2d")!;
const scoreOne = byId("score-one");
const scoreText = byId("score");
const scoreTwo = byId("score-two");
const timerText = byId("timer");
const waitingText = byId("waiting");
const statusText = byId("status");
const countdownText = byId("countdown");
const readyButton = byId<HTMLButtonElement>("ready-button");
const backButton = byId<HTMLButtonElement>("back-button");

const breakRound = byId("break-round");
const breakScore = byId("break-score");

const resultWinner = byId("result-winner");
const resultStatus = byId("result-status");
const resultHolder = byId("result-holder");
const downloadButton = byId<HTMLButtonElement>("download-button");
const againButton = byId<HTMLButtonElement>("again-button");

const summaryWinner = byId("summary-winner");
const summaryList = byId("summary-list");
const summaryTotals = byId("summary-totals");

// --- App state ---------------------------------------------------------------

/** Resolves true once the camera and pose model are ready (false = failed). */
let ready: Promise<boolean> = Promise.resolve(false);

/** The players in the current game (1 or 2). */
let players: Player[] = [];
/** The painting being played right now. */
let currentPainting: Painting | null = null;
/** The id of the running animation frame loop, so we can stop it. */
let loopId: number | null = null;
/** One score smoother per player, so the numbers don't flicker. */
const smoothers = [new ScoreSmoother(10), new ScoreSmoother(10)];
/** Each player's score currently on screen (null = not seen yet). */
let currentScores: (number | null)[] = [null, null];
/** Decides which body is Player 1 and which is Player 2. */
const tracker = new PlayerTracker();
/** Lets the buttons finish or quit the round that is running. */
let roundControl: { takePhoto: () => void; quit: () => void } | null = null;
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

/** Show a short message at the top of the screen for a few seconds. */
let noticeTimer = 0;
function showNotice(message: string): void {
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => (notice.hidden = true), 5000);
}

// =============================================================================
// Start-up: camera + pose model
// =============================================================================

/**
 * Start the camera (this also asks for permission), fill the camera
 * dropdowns, and load the pose model. Returns false if something failed;
 * the message is shown on the start screen with a "Try again" button.
 */
async function prepare(): Promise<boolean> {
  retryButton.hidden = true;
  cameraStatus.textContent = "Starting the camera…";
  try {
    await startCamera(video);
    // Now that permission is granted, the cameras' real names are available.
    await refreshCameraLists();
  } catch (error) {
    cameraStatus.textContent = (error as Error).message;
    retryButton.hidden = false;
    return false;
  }

  cameraStatus.textContent = "Loading the pose model…";
  try {
    await loadPoseModel();
  } catch (error) {
    console.error(error);
    cameraStatus.textContent =
      "Couldn't download the pose model. Check the internet (or use local files, see the README).";
    retryButton.hidden = false;
    return false;
  }

  cameraStatus.textContent = "";
  // Download the background-removal model in the background for later.
  loadSegmenter().catch((error) => console.warn("Could not load the segmenter yet.", error));
  return true;
}

// =============================================================================
// Camera dropdowns (start screen + settings window)
// =============================================================================

/** Fill every camera dropdown with the cameras that are plugged in now. */
async function refreshCameraLists(): Promise<void> {
  const cameras = await listCameras();
  const activeId = activeCameraId();
  for (const select of cameraSelects) {
    select.innerHTML = "";
    cameras.forEach((camera, index) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.textContent = camera.label || `Camera ${index + 1}`;
      select.appendChild(option);
    });
    select.value = activeId;
    select.disabled = cameras.length === 0;
  }
}

/** The user picked another camera from a dropdown. */
async function switchCamera(deviceId: string): Promise<void> {
  try {
    await startCamera(video, deviceId);
    // The pose loop keeps running: it just reads from the new stream.
  } catch (error) {
    showNotice((error as Error).message);
  }
  await refreshCameraLists();
}

/** A camera was plugged in or unplugged. */
async function onCamerasChanged(): Promise<void> {
  const cameras = await listCameras();
  const activeId = activeCameraId();
  const stillThere = cameras.some((camera) => camera.deviceId === activeId);
  if (activeId && !stillThere) {
    // The camera we were using is gone: switch to the default one.
    showNotice("Your camera was disconnected, so we switched to the default camera.");
    try {
      await startCamera(video);
    } catch (error) {
      showNotice((error as Error).message);
    }
  }
  await refreshCameraLists();
}

// =============================================================================
// Start screen: mode, players, paintings
// =============================================================================

function selectedMode(): "single" | "tour" {
  return document.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value === "tour"
    ? "tour"
    : "single";
}

function selectedPlayerCount(): 1 | 2 {
  return document.querySelector<HTMLInputElement>('input[name="players"]:checked')?.value === "2"
    ? 2
    : 1;
}

/** Read the players from the start screen (names default to "Player 1/2"). */
function readPlayers(): Player[] {
  const count = selectedPlayerCount();
  const result: Player[] = [];
  for (let i = 0; i < count; i++) {
    const typed = nameInputs[i].value.trim();
    result.push({ name: typed || `Player ${i + 1}`, colour: PLAYER_COLOURS[i] });
  }
  return result;
}

/** Show/hide the bits of the start screen that depend on the choices. */
function updateStartScreen(): void {
  const tour = selectedMode() === "tour";
  tourStart.hidden = !tour;
  paintingList.hidden = tour;
  playerNamesBox.hidden = selectedPlayerCount() === 1;
}

/** Build one framed card per painting. Clicking a card starts that painting. */
function showStart(): void {
  stopCameraLoop();
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
    card.addEventListener("click", () => playSinglePainting(painting));
    paintingList.appendChild(card);
  }
  updateStartScreen();
  showScreen("gallery");
}

// =============================================================================
// The two game modes
// =============================================================================

async function playSinglePainting(painting: Painting): Promise<void> {
  players = readPlayers();
  // No time limit: the player presses "Take my portrait" when ready.
  const result = await playRound(painting, { timeLimit: null, label: null });
  if (result) await showResult(result);
}

async function playGalleryTour(): Promise<void> {
  players = readPlayers();
  const results = await runGalleryTour({
    playRound: (painting, round, total) =>
      playRound(painting, { timeLimit: ROUND_SECONDS, label: `Round ${round} of ${total}` }),
    showBreak,
  });
  if (results) showSummary(results);
}

// =============================================================================
// One round: painting + camera + live score + snapshot
// =============================================================================

interface RoundOptions {
  /** Seconds before the snapshot is taken automatically (null = no limit). */
  timeLimit: number | null;
  /** Text at the top of the screen, e.g. "Round 2 of 5" (null = none). */
  label: string | null;
}

/**
 * Play one round and resolve with the result once the snapshot is taken,
 * or null if the player pressed "Back to start".
 */
async function playRound(painting: Painting, options: RoundOptions): Promise<RoundResult | null> {
  currentPainting = painting;
  paintingImage.src = painting.imageUrl;
  paintingImage.alt = `${painting.title} by ${painting.artist}`;
  paintingCaption.textContent = `${painting.title}, ${painting.artist} (${painting.year})`;
  roundLabel.textContent = options.label ?? "";
  roundLabel.hidden = !options.label;
  timerText.hidden = options.timeLimit === null;
  timerText.textContent = "";
  waitingText.hidden = true;
  countdownText.hidden = true;

  // Fresh scores for everyone.
  currentScores = [null, null];
  smoothers.forEach((smoother) => smoother.reset());
  tracker.reset();
  updateScoreDisplay();

  readyButton.disabled = true;
  backButton.disabled = false;
  statusText.textContent = "Getting the camera ready…";
  showScreen("challenge");

  // Wait for the camera + model (normally ready long before this).
  if (!(await ready)) {
    showStart();
    showNotice("The camera isn't ready yet. See the message on the start screen.");
    return null;
  }
  await setMaxPeople(players.length === 2 ? 2 : 1);

  statusText.textContent =
    players.length === 2
      ? "Both copy the same figure! Player 1 stands on the left."
      : 'Copy the pose! When the score is high, press "Take my portrait".';
  readyButton.disabled = false;
  startCameraLoop();

  return new Promise((resolve) => {
    let finished = false;
    let timerId = 0;

    const finish = async (takePhoto: boolean) => {
      if (finished) return;
      finished = true;
      clearInterval(timerId);
      roundControl = null;
      readyButton.disabled = true;

      if (!takePhoto) {
        stopCameraLoop();
        resolve(null);
        return;
      }

      // 3... 2... 1... shown big on top of the camera. The camera loop keeps
      // running underneath, so players can still adjust and the score updates.
      backButton.disabled = true;
      countdownText.hidden = false;
      for (let n = COUNTDOWN_SECONDS; n > 0; n--) {
        countdownText.textContent = String(n);
        await wait(1000);
      }
      countdownText.hidden = true;

      // Snap! Remember the scores at this exact moment.
      const scores = currentScores.slice(0, players.length);
      const photo = takeSnapshot();
      stopCameraLoop();
      backButton.disabled = false;
      resolve({ painting, photo, scores });
    };

    roundControl = { takePhoto: () => finish(true), quit: () => finish(false) };

    // Gallery Tour: count down the seconds, then take the photo automatically.
    if (options.timeLimit !== null) {
      let secondsLeft = options.timeLimit;
      timerText.textContent = `${secondsLeft}s`;
      timerId = window.setInterval(() => {
        secondsLeft--;
        timerText.textContent = `${secondsLeft}s`;
        if (secondsLeft <= 0) finish(true);
      }, 1000);
    }
  });
}

/** Runs once per screen refresh (about 60 times a second). */
function startCameraLoop(): void {
  stopCameraLoop();
  let lastVideoTime = -1;
  let shownPoses: (DetectedPose | null)[] = [];
  let poseScores: (PoseScore | null)[] = [];

  const tick = () => {
    // After switching cameras the picture size may change: follow it.
    if (video.videoWidth > 0 && cameraCanvas.width !== video.videoWidth) {
      cameraCanvas.width = video.videoWidth;
      cameraCanvas.height = video.videoHeight;
    }

    // The screen refreshes faster than the camera delivers new pictures.
    // Only run pose detection when there is a new camera frame.
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const poses = detectAll(video);

      // 1 player: just take the first person. 2 players: left = Player 1.
      shownPoses = players.length === 2 ? tracker.assign(poses) : [poses[0] ?? null];

      poseScores = shownPoses.map((pose, i) => {
        if (!pose || !currentPainting?.targetPose) return null;
        const result = scorePose(pose, currentPainting.targetPose);
        // If no joint could be compared (e.g. you're out of shot), keep
        // showing the last score instead of jumping around. A player who
        // isn't detected at all keeps their last score too ("paused").
        if (result.overall !== null) currentScores[i] = smoothers[i].add(result.overall);
        return result;
      });

      updateWaitingMessage(poses.length, shownPoses);
      updateScoreDisplay();
    }

    drawFrame(shownPoses, poseScores);
    loopId = requestAnimationFrame(tick);
  };
  tick();
}

function stopCameraLoop(): void {
  if (loopId !== null) cancelAnimationFrame(loopId);
  loopId = null;
}

/** 2-player mode: say who we're waiting for if someone is missing. */
function updateWaitingMessage(peopleFound: number, shownPoses: (DetectedPose | null)[]): void {
  if (players.length < 2 || peopleFound === 0) {
    waitingText.hidden = true;
    return;
  }
  const missing = shownPoses.findIndex((pose) => pose === null);
  waitingText.hidden = missing === -1;
  if (missing !== -1) waitingText.textContent = `Waiting for ${players[missing].name}…`;
}

/** Show the big score (1 player) or both players' scores (2 players). */
function updateScoreDisplay(): void {
  const two = players.length === 2;
  scoreOne.hidden = two;
  scoreTwo.hidden = !two;

  if (!two) {
    const score = currentScores[0];
    scoreText.textContent = score === null ? "–" : String(score);
    scoreText.style.color = score === null ? "" : scoreColour(score);
    return;
  }

  scoreTwo.innerHTML = "";
  players.forEach((player, i) => {
    const item = document.createElement("span");
    item.style.color = player.colour;
    item.textContent = `${player.name}: ${currentScores[i] ?? "–"}`;
    scoreTwo.appendChild(item);
  });
}

// =============================================================================
// Drawing the camera picture
// =============================================================================

/** Draw the camera image, the skeleton(s), and (2 players) name tags. */
function drawFrame(shownPoses: (DetectedPose | null)[], poseScores: (PoseScore | null)[]): void {
  const width = cameraCanvas.width;
  const height = cameraCanvas.height;
  if (width === 0) return;

  ctx.save();
  // Flip horizontally so it looks like a mirror (raise your right hand and
  // the hand on the right of the screen goes up). Everything drawn until
  // ctx.restore() is flipped, so the skeleton stays lined up with the video.
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(video, 0, 0, width, height);
  shownPoses.forEach((pose, i) => {
    if (!pose) return;
    // 1 player: limbs coloured by how well they match. 2 players: each
    // player in their own colour so you can tell them apart.
    const colour = players.length === 2 ? players[i].colour : null;
    drawSkeleton(pose.landmarks, poseScores[i], width, height, colour);
  });

  ctx.restore();

  // Name tags are drawn AFTER restore(), otherwise the text would be mirrored.
  if (players.length === 2) {
    shownPoses.forEach((pose, i) => {
      if (pose) drawNameTag(pose, players[i], currentScores[i], width, height);
    });
  }
}

/**
 * Draw lines between joints, then a dot on each joint.
 * @param colour one colour for the whole skeleton, or null to colour each
 *               limb by how well it matches the painting
 */
function drawSkeleton(
  landmarks: DetectedPose["landmarks"],
  poseScore: PoseScore | null,
  width: number,
  height: number,
  colour: string | null,
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

    if (colour) {
      ctx.strokeStyle = colour;
    } else {
      // A bone gets the colour of the WORSE of the joints at its two ends,
      // e.g. the upper arm is red if either the shoulder or the elbow is off.
      const endScores = [scoreAtLandmark.get(start), scoreAtLandmark.get(end)]
        .filter((score) => score !== undefined);
      ctx.strokeStyle = endScores.length > 0 ? scoreColour(Math.min(...endScores)) : NOT_SCORED;
    }

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

/** "Ana 72" above a player's head, in their colour. */
function drawNameTag(
  pose: DetectedPose,
  player: Player,
  score: number | null,
  width: number,
  height: number,
): void {
  const nose = pose.landmarks[0];
  // The picture is mirrored on screen, so x becomes (1 - x).
  const x = (1 - nose.x) * width;
  const y = Math.max(40, nose.y * height - 90);
  const text = `${player.name} ${score ?? "–"}`;

  ctx.font = "bold 36px Georgia, serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = player.colour;
  ctx.fillText(text, x, y);
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
// After a round
// =============================================================================

/** "Ana 81 · Ben 77" */
function scoresLine(scores: (number | null)[]): string {
  return players.map((player, i) => `${player.name} ${scores[i] ?? "–"}`).join(" · ");
}

/** Gallery Tour: the 3-second "Next painting…" break between rounds. */
async function showBreak(result: RoundResult, round: number, total: number): Promise<void> {
  breakRound.textContent = `Round ${round} of ${total} done`;
  breakScore.textContent =
    players.length === 2
      ? `${scoresLine(result.scores)} — ${winnerText(players, result.scores)}`
      : `Score: ${result.scores[0] ?? "–"} / 100`;
  showScreen("break");
  await wait(BREAK_SECONDS * 1000);
}

/** Single Painting mode: the framed picture with the plaque. */
async function showResult(result: RoundResult): Promise<void> {
  // Show the screen straight away with a message, because removing the
  // background takes a moment.
  resultHolder.innerHTML = "";
  resultCanvas = null;
  downloadButton.disabled = true;
  resultStatus.textContent = "Framing your portrait…";
  resultWinner.hidden = players.length < 2;
  resultWinner.textContent = players.length === 2 ? winnerText(players, result.scores) : "";
  showScreen("result");

  const plaqueLine =
    players.length === 2
      ? `${scoresLine(result.scores)} — ${winnerText(players, result.scores)}`.toUpperCase()
      : undefined;
  resultCanvas = await createFramedResult(result.photo, result.painting, result.scores[0], plaqueLine);
  resultHolder.appendChild(resultCanvas);
  resultStatus.textContent = "";
  downloadButton.disabled = false;
}

/** Gallery Tour: every round's photo + score, then totals and the winner. */
function showSummary(results: RoundResult[]): void {
  summaryList.innerHTML = "";
  for (const [i, result] of results.entries()) {
    // <figure class="summary-item"><img><figcaption>Round 1: Title<br>Score</figcaption></figure>
    const item = document.createElement("figure");
    item.className = "summary-item";
    const thumbnail = document.createElement("img");
    thumbnail.src = thumbnailOf(result.photo);
    thumbnail.alt = `Your photo for ${result.painting.title}`;
    const caption = document.createElement("figcaption");
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${result.painting.title}`;
    const score = document.createElement("span");
    score.textContent = players.length === 2 ? scoresLine(result.scores) : `${result.scores[0] ?? "–"} / 100`;
    caption.append(title, score);
    item.append(thumbnail, caption);
    summaryList.appendChild(item);
  }

  const totals = tourTotals(results, players.length);
  summaryTotals.textContent = players
    .map((player, i) => `${players.length === 2 ? player.name + ": " : ""}total ${totals[i].total} / ${results.length * 100}, average ${totals[i].average}`)
    .join("   ·   ");

  summaryWinner.hidden = players.length < 2;
  if (players.length === 2) {
    const winner = pickWinner(totals.map((t) => t.total));
    summaryWinner.textContent = winner === null ? "It's a draw!" : `${players[winner].name} wins the tour!`;
  }
  showScreen("summary");
}

/** A small JPEG copy of a photo for the summary screen. */
function thumbnailOf(photo: HTMLCanvasElement): string {
  const thumb = document.createElement("canvas");
  thumb.width = 320;
  thumb.height = Math.round((320 * photo.height) / photo.width);
  thumb.getContext("2d")!.drawImage(photo, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", 0.8);
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

// --- Buttons and inputs ---------------------------------------------------------

readyButton.addEventListener("click", () => roundControl?.takePhoto());

backButton.addEventListener("click", () => {
  roundControl?.quit();
  showStart();
});

downloadButton.addEventListener("click", () => downloadResult());
againButton.addEventListener("click", () => showStart());
byId("tour-button").addEventListener("click", () => playGalleryTour());
byId("play-again-button").addEventListener("click", () => playGalleryTour());
byId("to-start-button").addEventListener("click", () => showStart());

for (const input of document.querySelectorAll('input[name="mode"], input[name="players"]')) {
  input.addEventListener("change", updateStartScreen);
}

for (const select of cameraSelects) {
  select.addEventListener("change", () => switchCamera(select.value));
}

byId("settings-button").addEventListener("click", () => settingsDialog.showModal());

retryButton.addEventListener("click", () => {
  ready = prepare();
});

watchCameras(() => {
  onCamerasChanged();
});

// --- Start the app -----------------------------------------------------------
showStart();
ready = prepare();
