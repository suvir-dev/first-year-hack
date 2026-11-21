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
import { MIRROR_WEBCAM } from "./config";
import { detectAll, loadPoseModel, POSE_CONNECTIONS, setMaxPeople } from "./pose";
import type { DetectedPose } from "./pose";
import { prepareTarget, scorePose, TOLERANCE_DEGREES } from "./scoring";
import type { Difficulty, PoseScore, PreparedTarget } from "./scoring";
import { BestHold, LandmarkSmoother, LiveScore } from "./smoothing";
import { hintFor } from "./hints";
import { formatScore, formatYear, rankFor, toScore } from "./format";
import { duckMusic, isMuted, playChime, playGuideChime, setMuted, startMusic } from "./audio";
import {
  isNarrationOn,
  listEnglishVoices,
  narrate,
  preferredVoice,
  setNarrationOn,
  setPreferredVoice,
  speakSample,
  splitSentences,
  stopNarration,
} from "./narrator";
// The text of CREDITS.md, bundled into the app by Vite ("?raw" = as plain text).
import creditsMarkdown from "../CREDITS.md?raw";
import { figureCount, paintings, soloPaintings } from "./paintings";
import type { Figure, Painting } from "./paintings";
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
  intro: byId("screen-intro"),
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
const placardTitle = byId("placard-title");
const placardArtist = byId("placard-artist");
const placardYear = byId("placard-year");
const placardFact = byId("placard-fact");
const cameraExhibit = byId("camera-exhibit");
const sweep = byId("sweep");
const subtitles = byId("subtitles");
const musicButton = byId<HTMLButtonElement>("music-button");
const narrationButton = byId<HTMLButtonElement>("narration-button");
const figureTags = byId("figure-tags");
const duetIntro = byId("duet-intro");
const duetText = byId("duet-text");
const swapButton = byId<HTMLButtonElement>("swap-button");
const duetResults = byId("duet-results");
const video = byId<HTMLVideoElement>("video");
const cameraCanvas = byId<HTMLCanvasElement>("camera-canvas");
const ctx = cameraCanvas.getContext("2d")!;
const scoreOne = byId("score-one");
const scoreText = byId("score");
const scoreTwo = byId("score-two");
const bestHoldText = byId("best-hold");
const hintText = byId("hint");
const debugPanel = byId("debug");
const timerText = byId("timer");
const timeRing = document.getElementById("time-ring") as unknown as SVGCircleElement;
const holdRing = document.getElementById("hold-ring") as unknown as SVGCircleElement;
const holdLabel = byId("hold-label");
const flash = byId("flash");
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
/** The painting's pose, measured once when the round starts. */
let targets: (PreparedTarget | null)[] = [null, null];
/**
 * Which figure of the painting each player copies (index into
 * painting.figures). Solo painting: both copy figure 0. Duet: Player 1
 * (the LEFT player on the mirrored camera view) copies the LEFT figure.
 * The choice belongs to the PLAYER, so it stays the same if they swap sides.
 */
let figureOfPlayer = [0, 0];
/** Each player's latest pose (kept for the result screen). */
let latestPoses: (DetectedPose | null)[] = [null, null];
/** How forgiving the scoring is (chosen on the start screen). */
let difficulty: Difficulty = "medium";

// Per player (index 0 = Player 1, index 1 = Player 2):
/** Smooths each player's body points before scoring (removes jitter). */
const landmarkSmoothers = [new LandmarkSmoother(), new LandmarkSmoother()];
/** The live score on screen = average of the last 0.5 s. */
const liveScores = [new LiveScore(), new LiveScore()];
/** The final round score = best average over any 1 continuous second. */
const bestHolds = [new BestHold(), new BestHold()];
/** Each player's live score currently on screen (null = not seen yet). */
let currentScores: (number | null)[] = [null, null];
/** The latest detailed score (every feature) for each player. */
let latestScores: (PoseScore | null)[] = [null, null];
/** When the hint text last changed (it changes at most once a second). */
let lastHintTime = 0;
const HINT_INTERVAL_MS = 1000;
/** The debug overlay (press S) is showing. */
let debugOn = false;
/** Has each player already heard the 90+ chime this round? */
let celebrated = [false, false];
/** Decides which body is Player 1 and which is Player 2. */
const tracker = new PlayerTracker();
/** Lets the buttons finish or quit the round that is running. */
let roundControl: { takePhoto: () => void; quit: () => void } | null = null;
/** The finished framed picture, kept for the Download button. */
let resultCanvas: HTMLCanvasElement | null = null;

const COUNTDOWN_SECONDS = 3;
/** "Hold it!": stay at or above this score for HOLD_SECONDS to lock in early. */
const HOLD_SCORE = 80;
const HOLD_SECONDS = 3;

// Colours for the score and the skeleton's limbs.
const GOOD = "#2ecc71"; // green: 80 or more
const CLOSE = "#f39c12"; // amber: 50 to 79
const OFF = "#e74c3c"; // red: below 50
const NOT_SCORED = "#f5d76e"; // gold: limbs that aren't part of the score

/** Pick green / amber / red for a score out of 100. */
function scoreColour(score: number): string {
  if (score >= 80) return GOOD;
  if (score >= 50) return CLOSE;
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

/** Show the running camera in the small preview on the setup panel. */
function updateCameraPreview(): void {
  const preview = byId<HTMLVideoElement>("camera-preview");
  preview.srcObject = video.srcObject; // the same stream, shown twice
  preview.style.transform = MIRROR_WEBCAM ? "scaleX(-1)" : "";
  preview.play().catch(() => undefined);
}

/** Fill every camera dropdown with the cameras that are plugged in now. */
async function refreshCameraLists(): Promise<void> {
  updateCameraPreview();
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

function selectedDifficulty(): Difficulty {
  const value = document.querySelector<HTMLInputElement>('input[name="difficulty"]:checked')?.value;
  return value === "easy" || value === "hard" ? value : "medium";
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
  byId("single-start").hidden = tour;
  // The name fields slide in (CSS transition) when 2 players are chosen.
  playerNamesBox.classList.toggle("open", selectedPlayerCount() === 2);
}

/** Build one framed card per painting. Clicking a card starts that painting. */
function showStart(): void {
  stopCameraLoop();
  stopNarrating();
  paintingList.innerHTML = "";

  // 1 player: only solo paintings (one figure). 2 players: duets too.
  const choices = selectedPlayerCount() === 1 ? soloPaintings : paintings;
  for (const painting of choices) {
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
    artist.textContent = `${painting.artist}, ${formatYear(painting.year)}`;
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
  // The same timed round as the Gallery Tour: the photo is taken automatically.
  const result = await playRound(painting, { timeLimit: ROUND_SECONDS, label: null });
  if (result) await showResult(result);
}

async function playGalleryTour(): Promise<void> {
  players = readPlayers();
  const results = await runGalleryTour({
    playRound: (painting, round, total) =>
      playRound(painting, { timeLimit: ROUND_SECONDS, label: `Round ${round} of ${total}` }),
    showBreak,
  }, selectedDifficulty(), players.length === 2 ? 2 : 1);
  if (results) showSummary(results);
}

// =============================================================================
// One round: painting + camera + live score + snapshot
// =============================================================================

interface RoundOptions {
  /** Seconds before the photo is taken automatically. */
  timeLimit: number;
  /** Text at the top of the screen, e.g. "Round 2 of 5" (null = none). */
  label: string | null;
  /**
   * Read the painting's history aloud while posing (default: yes). A future
   * "Guess the Painting" mode must pass false, or it would give the answer away.
   */
  narrate?: boolean;
}

/**
 * Play one round and resolve with the result once the snapshot is taken,
 * or null if the player pressed "Back to start".
 */
async function playRound(painting: Painting, options: RoundOptions): Promise<RoundResult | null> {
  // Safety net: 1 player must never get a painting with two people.
  if (players.length === 1 && figureCount(painting) > 1) {
    console.warn(`"${painting.title}" has ${figureCount(painting)} figures: using a solo painting instead.`);
    painting = randomSolo(painting.id);
  }
  currentPainting = painting;
  paintingImage.src = painting.imageUrl;
  paintingImage.alt = `${painting.title} by ${painting.artist}`;
  // The museum placard beside the painting.
  placardTitle.textContent = painting.title;
  placardArtist.textContent = painting.artist;
  placardYear.textContent = formatYear(painting.year);
  placardFact.textContent = painting.funFact;
  roundLabel.textContent = options.label ?? "";
  roundLabel.hidden = !options.label;
  timerText.textContent = `${options.timeLimit}s`;
  waitingText.hidden = true;
  countdownText.hidden = true;

  // Fresh scores for everyone.
  difficulty = selectedDifficulty();
  currentScores = [null, null];
  latestScores = [null, null];
  landmarkSmoothers.forEach((smoother) => smoother.reset());
  liveScores.forEach((live) => live.reset());
  bestHolds.forEach((hold) => hold.reset());
  tracker.reset();
  celebrated = [false, false];
  fullBodyTipUntil = 0;
  fullBodyTipNext = 0;
  hintText.textContent = "";
  updateScoreDisplay();

  // Who copies which figure, then measure those figures' poses ONCE (not
  // every frame), in real pixels of the painting image as it loaded.
  await paintingImage.decode().catch(() => undefined);
  figureOfPlayer = isDuet(painting) ? [0, 1] : [0, 0];
  prepareTargets(painting);
  renderFigureTags(painting);

  readyButton.disabled = true;
  backButton.disabled = false;
  statusText.textContent = "Getting the camera ready…";
  showScreen("challenge");
  const sweepDone = playSpotlightSweep();

  // Wait for the camera + model (normally ready long before this).
  if (!(await ready)) {
    showStart();
    showNotice("The camera isn't ready yet. See the message on the start screen.");
    return null;
  }
  await setMaxPeople(players.length === 2 ? 2 : 1);
  startCameraLoop();
  await sweepDone;
  // The player may have pressed "Back to start" during the sweep.
  if (screens.challenge.hidden) {
    stopCameraLoop();
    return null;
  }

  // Duet: show who copies whom for 3 seconds (with a "Swap figures" button).
  if (isDuet(painting)) {
    await showDuetIntro(painting);
    if (screens.challenge.hidden) {
      stopCameraLoop();
      return null;
    }
  }

  statusText.textContent = isDuet(painting)
    ? "Duet! Each of you copies your own figure."
    : players.length === 2
      ? "Both copy the same figure! Player 1 stands on the left."
      : `Copy the pose! Stay above ${HOLD_SCORE} for ${HOLD_SECONDS} seconds to lock it in early.`;
  readyButton.disabled = false;

  return new Promise((resolve) => {
    let finished = false;
    let tickerId = 0;

    const finish = async (takePhoto: boolean) => {
      if (finished) return;
      finished = true;
      clearInterval(tickerId);
      stopNarrating(); // the round is over: stop talking
      roundControl = null;
      readyButton.disabled = true;
      holdLabel.hidden = true;

      if (!takePhoto) {
        stopCameraLoop();
        resolve(null);
        return;
      }

      // "Hold still… 3, 2, 1" big on top of the camera. The camera loop keeps
      // running underneath, so the score keeps updating.
      backButton.disabled = true;
      countdownText.hidden = false;
      countdownText.textContent = "Hold still…";
      await wait(900);
      for (let n = COUNTDOWN_SECONDS; n > 0; n--) {
        countdownText.textContent = String(n);
        await wait(1000);
      }
      countdownText.hidden = true;

      // Snap! A camera flash, and each player's final score is their best
      // 1-second hold (or their live score if they never held a full
      // second). Always a whole number 0..100.
      cameraFlash();
      const scores = bestHolds
        .slice(0, players.length)
        .map((hold, i) => toScore(hold.best() ?? currentScores[i]));
      const photo = takeSnapshot();
      await wait(400); // let the flash be seen
      stopCameraLoop();
      backButton.disabled = false;
      resolve({ painting, photo, scores, figureOfPlayer: [...figureOfPlayer], poses: [...latestPoses] });
    };

    roundControl = {
      takePhoto: () => finish(true), // the optional "Snap now" button
      quit: () => finish(false),
    };

    // The museum guide tells the painting's story while you pose.
    if (options.narrate !== false) startNarration(painting.history);

    // Every 0.1 s: update the countdown ring, and check the "Hold it!" rule.
    const startedAt = performance.now();
    let holdingSince: number | null = null;
    setRing(timeRing, 1);
    setRing(holdRing, 0);
    tickerId = window.setInterval(() => {
      const now = performance.now();
      const secondsLeft = Math.max(0, options.timeLimit - (now - startedAt) / 1000);
      setRing(timeRing, secondsLeft / options.timeLimit);
      timerText.textContent = `${Math.ceil(secondsLeft)}s`;

      // "Hold it!": every player above HOLD_SCORE for HOLD_SECONDS in a row
      // locks in early.
      const everyoneHolding = players.every(
        (_, i) => latestScores[i] !== null && toScore(currentScores[i]) >= HOLD_SCORE,
      );
      holdingSince = everyoneHolding ? (holdingSince ?? now) : null;
      const held = holdingSince === null ? 0 : (now - holdingSince) / (HOLD_SECONDS * 1000);
      setRing(holdRing, Math.min(1, held));
      holdLabel.hidden = holdingSince === null;

      if (held >= 1 || secondsLeft <= 0) finish(true);
    }, 100);
  });
}

/** Fill a progress ring (an SVG circle) to a fraction 0..1. */
function setRing(ring: SVGCircleElement, fraction: number): void {
  const length = 2 * Math.PI * ring.r.baseVal.value; // the circle's circumference
  ring.style.strokeDasharray = String(length);
  ring.style.strokeDashoffset = String(length * (1 - fraction));
}

/** A white camera flash over the webcam picture. */
function cameraFlash(): void {
  flash.classList.remove("go");
  void flash.offsetWidth; // restart the CSS animation
  flash.classList.add("go");
}

/** Runs once per screen refresh (about 60 times a second). */
function startCameraLoop(): void {
  stopCameraLoop();
  let lastVideoTime = -1;
  let shownPoses: (DetectedPose | null)[] = [];

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
      const now = performance.now();
      const poses = detectAll(video);

      // 1 player: just take the first person. 2 players: left = Player 1.
      const assigned = players.length === 2 ? tracker.assign(poses) : [poses[0] ?? null];
      // Nobody in the picture at all: the live score is 0 (shown with a message).
      if (poses.length === 0) currentScores = currentScores.map(() => 0);

      // Smooth each player's points to remove jitter.
      shownPoses = assigned.map((pose, i) => {
        if (!pose) {
          // Not in the picture: their score pauses, their "continuous
          // second" is broken, and smoothing starts fresh when they return.
          landmarkSmoothers[i].reset();
          bestHolds[i].add(null, now);
          return null;
        }
        return landmarkSmoothers[i].smooth(pose);
      });

      latestPoses = shownPoses;
      latestScores = shownPoses.map((pose, i) => {
        const target = targets[i];
        if (!pose || !target) return null;
        // Each player is scored only against THEIR figure.
        const result = scorePose(pose, target, { difficulty });
        currentScores[i] = liveScores[i].add(result.overall, now);
        // A little chime the first time someone reaches 90 in a round.
        if (currentScores[i] >= 90 && !celebrated[i]) {
          celebrated[i] = true;
          playChime();
        }
        // Every frame where we can see the player counts (never blocked, even
        // if they aren't fully in shot: hidden legs simply aren't scored).
        bestHolds[i].add(result.overall, now);
        if (result.legsMissing) maybeShowFullBodyTip(now);
        return result;
      });

      updateMessages(poses.length, shownPoses, now);
      updateHints(now);
      updateScoreDisplay();
      if (debugOn) updateDebug();
    }

    drawFrame(shownPoses, latestScores);
    loopId = requestAnimationFrame(tick);
  };
  tick();
}

function stopCameraLoop(): void {
  if (loopId !== null) cancelAnimationFrame(loopId);
  loopId = null;
}

/**
 * The message across the bottom of the camera picture: who we're waiting
 * for (2 players), or "step back" when too much of a body is hidden.
 */
function updateMessages(peopleFound: number, shownPoses: (DetectedPose | null)[], now: number): void {
  let message = "";
  if (peopleFound === 0) {
    message = "We can't see you yet: step into the picture";
  } else if (players.length === 2 && shownPoses.includes(null)) {
    message = `Waiting for ${players[shownPoses.indexOf(null)].name}…`;
  } else {
    const hidden = latestScores.findIndex((score) => score !== null && !score.inFrame);
    if (hidden !== -1) {
      message =
        players.length === 2
          ? `Step back a little, ${players[hidden].name}: we can't see your arms`
          : "Step back a little: we can't see your arms";
    } else if (now < fullBodyTipUntil) {
      message = "Tip: step back to show your full body for an even more accurate score.";
    }
  }
  waitingText.hidden = message === "";
  waitingText.textContent = message;
}

/** Until when the "show your full body" tip is visible, and when it may show again. */
let fullBodyTipUntil = 0;
let fullBodyTipNext = 0;
const FULL_BODY_TIP_MS = 4000;

/**
 * The painting's legs count, but we can't see the player's legs. That's not
 * a problem (legs are then left out of the score), so we just show a gentle
 * tip for a few seconds, at most once every 20 seconds.
 */
function maybeShowFullBodyTip(now: number): void {
  if (now < fullBodyTipNext) return;
  fullBodyTipUntil = now + FULL_BODY_TIP_MS;
  fullBodyTipNext = now + 20000;
}

/** One tip per player for their worst limb, updated at most once a second. */
function updateHints(now: number): void {
  if (now - lastHintTime < HINT_INTERVAL_MS) return;
  lastHintTime = now;
  const tips = latestScores
    .slice(0, players.length)
    .map((score, i) => {
      if (!score) return "";
      const tip = hintFor(score);
      return players.length === 2 ? `${players[i].name}: ${tip}` : tip;
    })
    .filter((tip) => tip !== "");
  hintText.textContent = tips.length > 0 ? `💡 ${tips.join("   ·   ")}` : "";
}

/** Show the big score (1 player) or both players' scores (2 players). */
function updateScoreDisplay(): void {
  updateFigureTagScores();
  const two = players.length === 2;
  scoreOne.hidden = two;
  scoreTwo.hidden = !two;

  // The final score is the best 1-second hold, so show that too.
  bestHoldText.textContent = two
    ? `Best 1-second hold: ${players.map((player, i) => `${player.name} ${formatScore(bestHolds[i].best())}`).join(" · ")}`
    : `Best 1-second hold: ${formatScore(bestHolds[0].best())} (this is your final score)`;

  if (!two) {
    const score = currentScores[0];
    scoreText.textContent = formatScore(score);
    scoreText.style.color = scoreColour(toScore(score));
    return;
  }

  scoreTwo.innerHTML = "";
  players.forEach((player, i) => {
    const item = document.createElement("span");
    item.style.color = player.colour;
    item.textContent = `${player.name}: ${formatScore(currentScores[i])}`;
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
  if (MIRROR_WEBCAM) {
    // Flip horizontally so it looks like a mirror (raise your right hand and
    // the hand on the right of the screen goes up). Everything drawn until
    // ctx.restore() is flipped, so the skeleton stays lined up with the video.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, width, height);
  shownPoses.forEach((pose, i) => {
    if (!pose) return;
    // 2 players: an outline in each player's own colour, so you can tell
    // the two skeletons apart. The limbs themselves show how well they match.
    const outline = players.length === 2 ? players[i].colour : null;
    drawSkeleton(pose.landmarks, poseScores[i], width, height, outline);
  });

  ctx.restore();

  // Name tags are drawn AFTER restore(), otherwise the text would be mirrored.
  if (players.length === 2) {
    shownPoses.forEach((pose, i) => {
      if (pose) drawNameTag(pose, players[i], currentScores[i], width, height);
    });
  }
}

/** "11-13": the same name for a bone whichever end comes first. */
function boneKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * The score of each limb (bone), from the per-feature results: e.g. the
 * upper arm bone gets the upper arm direction's score, and the 4 sides of
 * the torso get the torso's score.
 */
function limbScores(poseScore: PoseScore | null): Map<string, number> {
  const scores = new Map<string, number>();
  for (const feature of poseScore?.features ?? []) {
    const [a, b, c, d] = feature.playerPoints;
    if (feature.name === "torso") {
      // points = hips (a, b) and shoulders (c, d)
      for (const [x, y] of [[a, b], [c, d], [a, c], [b, d]]) scores.set(boneKey(x, y), feature.score);
    } else if (/UpperArm|Forearm|Thigh|Shin/.test(feature.name)) {
      scores.set(boneKey(a, b), feature.score);
    }
  }
  return scores;
}

/**
 * Draw lines between joints, then a dot on each joint. Each limb is green
 * (80+), amber (50-79) or red (below 50); limbs that aren't scored are gold.
 * @param outline (2 players) the player's colour drawn around each limb
 */
function drawSkeleton(
  landmarks: DetectedPose["landmarks"],
  poseScore: PoseScore | null,
  width: number,
  height: number,
  outline: string | null,
): void {
  // Landmarks are 0..1, so multiply by the canvas size to get pixels.
  const isVisible = (index: number) => (landmarks[index]?.visibility ?? 0) > 0.5;
  const scores = limbScores(poseScore);
  const bones = POSE_CONNECTIONS.filter(({ start, end }) => isVisible(start) && isVisible(end));

  const line = (start: number, end: number) => {
    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.stroke();
  };

  if (outline) {
    ctx.lineWidth = 14;
    ctx.strokeStyle = outline;
    for (const { start, end } of bones) line(start, end);
  }

  ctx.lineWidth = 6;
  for (const { start, end } of bones) {
    const score = scores.get(boneKey(start, end));
    ctx.strokeStyle = score === undefined ? NOT_SCORED : scoreColour(score);
    line(start, end);
  }

  ctx.fillStyle = outline ?? "#ffffff";
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
  // If the picture is mirrored on screen, x becomes (1 - x).
  const x = (MIRROR_WEBCAM ? 1 - nose.x : nose.x) * width;
  const y = Math.max(40, nose.y * height - 90);
  const text = `${player.name} ${formatScore(score)}`;

  ctx.font = "bold 36px Georgia, serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = player.colour;
  ctx.fillText(text, x, y);
}

/** Copy the current camera image (as shown on screen, without the skeleton) into a new canvas. */
function takeSnapshot(): HTMLCanvasElement {
  const snapshot = document.createElement("canvas");
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  const snapshotCtx = snapshot.getContext("2d")!;
  if (MIRROR_WEBCAM) {
    snapshotCtx.translate(snapshot.width, 0);
    snapshotCtx.scale(-1, 1);
  }
  snapshotCtx.drawImage(video, 0, 0);
  return snapshot;
}

// =============================================================================
// Debug overlay (press S): every feature's numbers
// =============================================================================

function updateDebug(): void {
  const degrees = (n: number | null) => (n === null ? "–" : `${Math.round(n)}°`).padStart(7);
  const lines: string[] = [`difficulty ${difficulty} (tolerance ${TOLERANCE_DEGREES[difficulty]}°)`, ""];
  players.forEach((player, i) => {
    const score = latestScores[i];
    if (!score) {
      lines.push(`${player.name}: not detected`, "");
      return;
    }
    lines.push(
      `${player.name}: overall ${score.overall}  live ${formatScore(currentScores[i])}  best hold ${formatScore(bestHolds[i].best())}`,
      `mirrored version used: ${score.mirrored ? "yes" : "no"}   seen ${Math.round(score.seenFraction * 100)}%${score.inFrame ? "" : "  (STEP BACK)"}`,
      "feature          target  player    diff  score  weight",
    );
    for (const f of score.features) {
      lines.push(
        `${f.name.padEnd(15)}${degrees(f.targetAngle)}${degrees(f.playerAngle)}${f.seen ? degrees(f.diff) : " unseen"}${String(f.score).padStart(7)}${f.weight.toFixed(1).padStart(8)}`,
      );
    }
    lines.push("");
  });
  debugPanel.textContent = lines.join("\n");
}

document.addEventListener("keydown", (event) => {
  // Don't react while someone is typing a name.
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key.toLowerCase() !== "s") return;
  debugOn = !debugOn;
  debugPanel.hidden = !debugOn;
  if (debugOn) updateDebug();
});

// =============================================================================
// After a round
// =============================================================================

/** "Ana 81 · Ben 77" */
function scoresLine(scores: (number | null)[], result?: RoundResult): string {
  return players
    .map((player, i) => {
      // Duet: also say which figure each player copied ("Ana as The Husband 84").
      const figure = result && isDuet(result.painting) ? ` as ${result.painting.figures[result.figureOfPlayer[i]].label}` : "";
      return `${player.name}${figure} ${formatScore(scores[i])}`;
    })
    .join(" · ");
}

/** Gallery Tour: the 3-second "Next painting…" break between rounds. */
async function showBreak(result: RoundResult, round: number, total: number): Promise<void> {
  breakRound.textContent = `Round ${round} of ${total} done`;
  breakScore.textContent =
    players.length === 2
      ? `${scoresLine(result.scores, result)} — ${winnerText(players, result.scores)}`
      : `Score: ${formatScore(result.scores[0])} / 100`;
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
      ? `${scoresLine(result.scores, result)} — ${winnerText(players, result.scores)}`.toUpperCase()
      : undefined;
  resultCanvas = await createFramedResult(result.photo, result.painting, result.scores[0], plaqueLine);
  resultHolder.appendChild(resultCanvas);
  showDuetResults(result);
  resultStatus.textContent = "";
  downloadButton.disabled = false;
}

/**
 * Duet results: each player's photo next to the figure they copied, their
 * score and rank, and who matched their figure better (higher score wins;
 * within 2 points is a draw). 1 player: just the rank.
 */
function showDuetResults(result: RoundResult): void {
  duetResults.innerHTML = "";
  duetResults.hidden = !isDuet(result.painting);
  if (players.length === 1) {
    resultWinner.hidden = false;
    resultWinner.textContent = rankFor(result.scores[0]);
    return;
  }
  if (!isDuet(result.painting)) return;

  players.forEach((player, i) => {
    const figure = result.painting.figures[result.figureOfPlayer[i]];
    const item = document.createElement("figure");
    item.className = "duet-result";
    item.style.setProperty("--tag-colour", player.colour);
    const pair = document.createElement("div");
    pair.className = "pair";
    // The figure, cut out of the painting (its joints + some padding)...
    pair.appendChild(crop(paintingImage, paintingImage.naturalWidth, paintingImage.naturalHeight, figureBox(figure)));
    // ...and the player, cut out of the photo.
    const pose = result.poses[i];
    if (pose) pair.appendChild(crop(result.photo, result.photo.width, result.photo.height, playerBox(pose)));
    const caption = document.createElement("figcaption");
    caption.innerHTML = "";
    const line = document.createElement("div");
    line.textContent = `${player.name} as ${figure.label}: ${formatScore(result.scores[i])}`;
    const rank = document.createElement("div");
    rank.className = "rank";
    rank.textContent = rankFor(result.scores[i]);
    caption.append(line, rank);
    item.append(pair, caption);
    duetResults.appendChild(item);
  });

  const winner = pickWinner(result.scores);
  resultWinner.hidden = false;
  resultWinner.textContent =
    winner === null
      ? "Draw! You matched your figures equally well."
      : `${players[winner].name} matched ${result.painting.figures[result.figureOfPlayer[winner]].label} better!`;
}

/** The part of the photo a player takes up (0..1, as shown on screen). */
function playerBox(pose: DetectedPose): { left: number; top: number; right: number; bottom: number } {
  const points = pose.landmarks.filter((landmark) => landmark.visibility > 0.5);
  const xs = points.map((p) => (MIRROR_WEBCAM ? 1 - p.x : p.x)); // the photo is mirrored like the screen
  const ys = points.map((p) => p.y);
  return {
    left: Math.max(0, Math.min(...xs) - 0.05),
    right: Math.min(1, Math.max(...xs) + 0.05),
    top: Math.max(0, Math.min(...ys) - 0.12), // room for the top of the head
    bottom: Math.min(1, Math.max(...ys) + 0.05),
  };
}

/** Copy part of an image (box in 0..1) into a new canvas. */
function crop(
  source: CanvasImageSource,
  width: number,
  height: number,
  box: { left: number; top: number; right: number; bottom: number },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const sx = box.left * width;
  const sy = box.top * height;
  canvas.width = Math.max(1, (box.right - box.left) * width);
  canvas.height = Math.max(1, (box.bottom - box.top) * height);
  canvas.getContext("2d")!.drawImage(source, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
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
    score.textContent = players.length === 2 ? scoresLine(result.scores, result) : `${formatScore(result.scores[0])} / 100`;
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

// =============================================================================
// Figures: who copies whom, and the name tags on the painting
// =============================================================================

/** A duet round = a 2-figure painting played by 2 players. */
function isDuet(painting: Painting): boolean {
  return figureCount(painting) === 2 && players.length === 2;
}

/** A random solo painting (not the given one). */
function randomSolo(exceptId: string): Painting {
  const options = soloPaintings.filter((painting) => painting.id !== exceptId);
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Measure each player's figure once, in real pixels of the painting image.
 *
 * FAIRNESS NOTE: in a duet the two figures can be harder or easier to copy
 * (one may be standing still, the other dancing). We don't adjust for that:
 * each player is simply scored on how well they match THEIR figure, and the
 * higher score wins. "Swap figures" lets players choose who takes which.
 */
function prepareTargets(painting: Painting): void {
  targets = [0, 1].map((player) => {
    const figure = painting.figures[figureOfPlayer[player]];
    if (!figure) return null;
    return prepareTarget(figure.targetPose, {
      width: paintingImage.naturalWidth || figure.targetPose.width,
      height: paintingImage.naturalHeight || figure.targetPose.height,
      upperBodyOnly: figure.upperBodyOnly,
      signatureJoints: painting.signatureJoints,
    });
  });
}

/**
 * Name tags (and a soft glow) drawn ON the painting, in each player's colour.
 * They are positioned in % of the painting, so they stay in the right place
 * whatever size the painting is shown at.
 */
function renderFigureTags(painting: Painting): void {
  figureTags.innerHTML = "";
  if (players.length < 2) return; // 1 player: no tags needed

  const addTag = (figure: Figure, text: string, colour: string, player: number | null) => {
    // A soft glow around the figure's body (the box around its joints).
    if (player !== null) {
      const box = figureBox(figure);
      const glow = document.createElement("div");
      glow.className = "figure-glow";
      glow.style.left = `${box.left * 100}%`;
      glow.style.top = `${box.top * 100}%`;
      glow.style.width = `${(box.right - box.left) * 100}%`;
      glow.style.height = `${(box.bottom - box.top) * 100}%`;
      glow.style.setProperty("--tag-colour", colour);
      figureTags.appendChild(glow);
    }
    // The tag: a small plaque with a pointer down to the figure's head.
    const tag = document.createElement("div");
    tag.className = "figure-tag";
    tag.style.left = `${figure.anchor.x * 100}%`;
    tag.style.top = `${figure.anchor.y * 100}%`;
    tag.style.setProperty("--tag-colour", colour);
    const name = document.createElement("span");
    name.textContent = text;
    const score = document.createElement("strong");
    score.className = "figure-tag-score";
    if (player !== null) score.dataset.player = String(player);
    tag.append(name, score);
    figureTags.appendChild(tag);
  };

  if (isDuet(painting)) {
    players.forEach((player, i) => {
      const figure = painting.figures[figureOfPlayer[i]];
      addTag(figure, `${player.name} · ${figure.label}`, player.colour, i);
    });
  } else {
    // Solo painting, 2 players: both copy the same figure.
    addTag(painting.figures[0], `Both: ${players[0].name} & ${players[1].name}`, "#f8e8a6", null);
  }
  updateFigureTagScores();
}

/** The live score next to each player's name tag on the painting. */
function updateFigureTagScores(): void {
  for (const element of figureTags.querySelectorAll<HTMLElement>(".figure-tag-score[data-player]")) {
    element.textContent = formatScore(currentScores[Number(element.dataset.player)]);
  }
}

/** The area of the painting a figure takes up (0..1), from its joints. */
function figureBox(figure: Figure): { left: number; top: number; right: number; bottom: number } {
  const points = figure.targetPose.landmarks.filter((landmark) => landmark.visibility > 0.5);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 0.04;
  return {
    left: Math.max(0, Math.min(...xs) - pad),
    right: Math.min(1, Math.max(...xs) + pad),
    top: Math.max(0, Math.min(figure.anchor.y, ...ys)),
    bottom: Math.min(1, Math.max(...ys) + pad),
  };
}

/** "Duet! Ana is The Husband, Ben is The Wife" for 3 seconds, with a Swap button. */
async function showDuetIntro(painting: Painting): Promise<void> {
  const update = () => {
    duetText.textContent = `Duet! ${players
      .map((player, i) => `${player.name} is ${painting.figures[figureOfPlayer[i]].label}`)
      .join(", ")}`;
  };
  update();
  duetIntro.hidden = false;
  swapButton.onclick = () => {
    figureOfPlayer = [figureOfPlayer[1], figureOfPlayer[0]];
    prepareTargets(painting);
    renderFigureTags(painting);
    update();
  };
  await wait(3000);
  duetIntro.hidden = true;
}

// =============================================================================
// Spotlight sweep and narration
// =============================================================================

/**
 * The start of a round: the screen dims, a spotlight sweeps onto the
 * painting, then the webcam view fades in (the animation is in style.css).
 * Resolves when it's done (about 1.6 s).
 */
async function playSpotlightSweep(): Promise<void> {
  // Aim the spotlight at the painting's centre (as % of the screen).
  const box = paintingImage.getBoundingClientRect();
  sweep.style.setProperty("--target-x", `${((box.left + box.width / 2) / window.innerWidth) * 100}%`);
  sweep.style.setProperty("--target-y", `${((box.top + box.height / 2) / window.innerHeight) * 100}%`);

  // Removing and re-adding the class restarts the CSS animations.
  sweep.hidden = false;
  sweep.classList.remove("play");
  cameraExhibit.classList.remove("appear");
  void sweep.offsetWidth; // forces the browser to notice the removal
  sweep.classList.add("play");
  cameraExhibit.classList.add("appear");
  await wait(1600);
  sweep.hidden = true;
}

/** Read the history aloud, with subtitles and the music turned down. */
function startNarration(text: string): void {
  // One <span> per sentence, so the current one can be highlighted.
  subtitles.innerHTML = "";
  for (const sentence of splitSentences(text)) {
    const span = document.createElement("span");
    span.textContent = sentence + " ";
    subtitles.appendChild(span);
  }

  narrate(text, {
    onStart: () => {
      // A soft audio-guide "ding", and the music fades down to 25%.
      playGuideChime();
      duckMusic(true);
    },
    onSentence: (index) => {
      subtitles.hidden = false;
      [...subtitles.children].forEach((span, i) => span.classList.toggle("current", i === index));
    },
    onDone: endNarration,
  });
}

/** Narration finished: hide the subtitles and bring the music back up. */
function endNarration(): void {
  subtitles.hidden = true;
  duckMusic(false);
}

/** Stop the narrator straight away (round over, or narration switched off). */
function stopNarrating(): void {
  stopNarration();
  endNarration();
}

/** Fill the "Narrator voice" dropdown in Settings with the English voices. */
async function fillVoiceList(): Promise<void> {
  const select = byId<HTMLSelectElement>("voice-select");
  const voices = await listEnglishVoices();
  select.innerHTML = "";
  const automatic = document.createElement("option");
  automatic.value = "";
  automatic.textContent = voices[0] ? `Automatic (${voices[0].name})` : "Automatic";
  select.appendChild(automatic);
  for (const voice of voices) {
    const option = document.createElement("option");
    option.value = voice.name;
    // Label the default voice so the user knows which one will be used.
    const isDefault = voice.name.trim().toLowerCase().includes("google uk english female");
    option.textContent = isDefault
      ? `${voice.name} (${voice.lang}) (default)`
      : `${voice.name} (${voice.lang})`;
    select.appendChild(option);
  }
  select.value = preferredVoice();
  select.disabled = voices.length === 0;
}

/** Show the music and narration buttons' current state. */
function updateSoundButtons(): void {
  musicButton.textContent = isMuted() ? "🔇" : "🎵";
  musicButton.title = isMuted() ? "Music is off (click to turn on)" : "Music is on (click to mute)";
  narrationButton.textContent = isNarrationOn() ? "🔊" : "🔈";
  narrationButton.classList.toggle("off", !isNarrationOn());
  narrationButton.title = isNarrationOn() ? "Narration is on (click to turn off)" : "Narration is off (click to turn on)";
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

// "Surprise me": a random painting that has a target pose.
byId("surprise-button").addEventListener("click", () => {
  const playable = selectedPlayerCount() === 1 ? soloPaintings : paintings;
  playSinglePainting(playable[Math.floor(Math.random() * playable.length)]);
});
byId("play-again-button").addEventListener("click", () => playGalleryTour());
byId("to-start-button").addEventListener("click", () => showStart());

for (const input of document.querySelectorAll('input[name="mode"], input[name="players"]')) {
  input.addEventListener("change", updateStartScreen);
}
// Changing the number of players changes which paintings are offered.
for (const input of document.querySelectorAll('input[name="players"]')) {
  input.addEventListener("change", showStart);
}

for (const select of cameraSelects) {
  select.addEventListener("change", () => switchCamera(select.value));
}

byId("refresh-cameras").addEventListener("click", () => {
  refreshCameraLists();
});

byId("settings-button").addEventListener("click", () => {
  fillVoiceList();
  settingsDialog.showModal();
});

byId<HTMLSelectElement>("voice-select").addEventListener("change", (event) => {
  const selected = (event.target as HTMLSelectElement).value;
  setPreferredVoice(selected);
  speakSample(selected || undefined); // let them hear the selected voice
});

musicButton.addEventListener("click", () => {
  setMuted(!isMuted());
  updateSoundButtons();
});

narrationButton.addEventListener("click", () => {
  setNarrationOn(!isNarrationOn());
  if (!isNarrationOn()) endNarration();
  updateSoundButtons();
});

byId("credits-text").textContent = creditsMarkdown;
byId("credits-button").addEventListener("click", () => byId<HTMLDialogElement>("credits-dialog").showModal());

// The intro button: this first click is also what lets the browser play
// sound, so the music starts here. Then the camera starts.
byId("intro-button").addEventListener("click", () => {
  startMusic();
  ready = prepare();
  showStart();
});

retryButton.addEventListener("click", () => {
  ready = prepare();
});

watchCameras(() => {
  onCamerasChanged();
});

// --- Start the app -----------------------------------------------------------
updateSoundButtons();
showScreen("intro");
