// pose-picker.ts: developer tool for making the paintings' target poses.
// ---------------------------------------------------------------------------
// Open http://localhost:5173/tools/pose-picker.html while `npm run dev` runs.
//
// 1. Load a painting (from paintings.ts, or any image file).
// 2. If the painting already has a target pose, show it. Otherwise run
//    PoseLandmarker on the image to find the joints automatically.
// 3. Let the user fix joints by hand: select a joint, click the painting.
// 4. Print TypeScript code to paste into src/paintings.ts.
//
// This page is NOT part of the game; `npm run build` ignores it.
// ---------------------------------------------------------------------------

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSE_MODEL_URL, WASM_FOLDER_URL } from "../src/config";
import { KEY_JOINTS, keyJointsFromPose } from "../src/landmarks";
import type { KeyJointName, KeyJointPositions } from "../src/landmarks";
import { paintings } from "../src/paintings";

// --- Page elements ------------------------------------------------------------

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const paintingSelect = byId<HTMLSelectElement>("painting-select");
const fileInput = byId<HTMLInputElement>("file-input");
const detectButton = byId<HTMLButtonElement>("detect-button");
const clearButton = byId<HTMLButtonElement>("clear-button");
const hideButton = byId<HTMLButtonElement>("hide-button");
const copyButton = byId<HTMLButtonElement>("copy-button");
const statusText = byId("status");
const jointList = byId("joint-list");
const output = byId<HTMLTextAreaElement>("output");
const canvas = byId<HTMLCanvasElement>("canvas");
const ctx = canvas.getContext("2d")!;

// --- State --------------------------------------------------------------------

const JOINT_NAMES = Object.keys(KEY_JOINTS) as KeyJointName[];

/** The image being edited. */
let image = new Image();
/** Where each joint is (0..1). Missing = not placed / not visible. */
let joints: KeyJointPositions = {};
/** The joint that the next click on the painting will move. */
let selectedJoint: KeyJointName = "nose";

// Lines to draw between joints, so the dots look like a skeleton.
const BONES: [KeyJointName, KeyJointName][] = [
  ["leftShoulder", "rightShoulder"], ["leftHip", "rightHip"],
  ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"], ["rightShoulder", "rightHip"],
  ["leftHip", "leftKnee"], ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"],
];

// --- Pose detection on a still image -------------------------------------------

let landmarker: PoseLandmarker | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarker) {
    const vision = await FilesetResolver.forVisionTasks(WASM_FOLDER_URL);
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
      runningMode: "IMAGE", // one still picture, not a video
      numPoses: 1,
      // Paintings aren't photos, so accept less confident detections.
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
    });
  }
  return landmarker;
}

async function detectAutomatically(): Promise<void> {
  statusText.textContent = "Looking for a person in the painting…";
  const result = (await getLandmarker()).detect(image);
  const landmarks = result.landmarks[0];

  if (!landmarks) {
    joints = {};
    selectedJoint = "nose";
    statusText.textContent =
      "No person found automatically. Place the joints by hand: click each one on the painting.";
  } else {
    joints = keyJointsFromPose({ landmarks, width: image.naturalWidth, height: image.naturalHeight });
    statusText.textContent =
      "Found a pose automatically. Check every dot is on the right body part and fix any that aren't.";
  }
  redraw();
}

// --- Loading images -------------------------------------------------------------

function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

async function loadPainting(id: string): Promise<void> {
  const painting = paintings.find((p) => p.id === id);
  if (!painting) return;
  await loadImage(painting.imageUrl);
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  if (painting.targetPose) {
    // Show the pose saved in paintings.ts so it can be checked or fixed.
    joints = keyJointsFromPose(painting.targetPose);
    statusText.textContent =
      'Showing the target pose saved in paintings.ts. Press "Detect automatically" to start again.';
    redraw();
  } else {
    await detectAutomatically();
  }
}

// --- Drawing ----------------------------------------------------------------------

/** Blue for the person's left side, pink for the right, white for the nose. */
function jointColour(name: KeyJointName): string {
  if (name === "nose") return "#ffffff";
  return name.startsWith("left") ? "#4fc3ff" : "#ff5fa2";
}

function redraw(): void {
  const w = canvas.width;
  const h = canvas.height;
  ctx.drawImage(image, 0, 0, w, h);

  // Sizes relative to the image so they look the same on big and small images.
  const unit = Math.max(w, h) / 200;

  // Bones
  ctx.lineWidth = unit * 0.8;
  ctx.strokeStyle = "rgba(255, 213, 74, 0.9)";
  for (const [a, b] of BONES) {
    const pa = joints[a];
    const pb = joints[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa[0] * w, pa[1] * h);
    ctx.lineTo(pb[0] * w, pb[1] * h);
    ctx.stroke();
  }

  // Joints, with a short label like "L elbow"
  ctx.font = `bold ${unit * 3}px system-ui, sans-serif`;
  for (const name of JOINT_NAMES) {
    const p = joints[name];
    if (!p) continue;
    const x = p[0] * w;
    const y = p[1] * h;

    ctx.fillStyle = jointColour(name);
    ctx.beginPath();
    ctx.arc(x, y, unit * 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (name === selectedJoint) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = unit * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, unit * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.lineWidth = unit * 0.6;
    ctx.strokeStyle = "black";
    ctx.strokeText(shortLabel(name), x + unit * 2.5, y - unit * 1.5);
    ctx.fillText(shortLabel(name), x + unit * 2.5, y - unit * 1.5);
  }

  updateJointList();
  updateOutput();
}

/** "leftElbow" -> "L elbow" */
function shortLabel(name: KeyJointName): string {
  if (name === "nose") return "nose";
  const side = name.startsWith("left") ? "L" : "R";
  return `${side} ${name.replace(/^(left|right)/, "").toLowerCase()}`;
}

function updateJointList(): void {
  jointList.innerHTML = "";
  for (const name of JOINT_NAMES) {
    const button = document.createElement("button");
    button.textContent = `${joints[name] ? "✓" : "–"} ${shortLabel(name)}`;
    button.style.color = jointColour(name);
    button.classList.toggle("selected", name === selectedJoint);
    button.classList.toggle("missing", !joints[name]);
    button.addEventListener("click", () => {
      selectedJoint = name;
      redraw();
    });
    const item = document.createElement("li");
    item.appendChild(button);
    jointList.appendChild(item);
  }
}

/** Write the TypeScript snippet to paste into paintings.ts. */
function updateOutput(): void {
  const round = (n: number) => Math.round(n * 1000) / 1000; // 3 decimal places is plenty
  const lines = JOINT_NAMES.filter((name) => joints[name]).map((name) => {
    const [x, y] = joints[name]!;
    return `      ${name}: [${round(x)}, ${round(y)}],`;
  });
  output.value =
    `    targetPose: poseFromKeyJoints(${image.naturalWidth}, ${image.naturalHeight}, {\n` +
    lines.join("\n") +
    `\n    }),`;
}

// --- Clicking and buttons ----------------------------------------------------------

canvas.addEventListener("click", (event) => {
  // The canvas may be shown smaller than its real size, so use fractions
  // of the displayed size: these are exactly the 0..1 coordinates we need.
  const x = event.offsetX / canvas.clientWidth;
  const y = event.offsetY / canvas.clientHeight;
  joints[selectedJoint] = [x, y];

  // Move on to the next joint that hasn't been placed yet (handy when
  // placing everything by hand).
  const next = JOINT_NAMES.find((name) => !joints[name]);
  if (next) selectedJoint = next;
  redraw();
});

hideButton.addEventListener("click", () => {
  delete joints[selectedJoint];
  redraw();
});

clearButton.addEventListener("click", () => {
  joints = {};
  selectedJoint = "nose";
  redraw();
});

detectButton.addEventListener("click", () => detectAutomatically());

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value);
  statusText.textContent = "Copied! Paste it over the targetPose line in src/paintings.ts.";
});

paintingSelect.addEventListener("change", () => loadPainting(paintingSelect.value));

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  await loadImage(URL.createObjectURL(file));
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  await detectAutomatically();
});

// --- Start ---------------------------------------------------------------------------

for (const painting of paintings) {
  const option = document.createElement("option");
  option.value = painting.id;
  option.textContent = `${painting.title} (${painting.artist})`;
  paintingSelect.appendChild(option);
}

// ?painting=<id> in the address bar picks a painting straight away.
const requested = new URLSearchParams(location.search).get("painting");
if (requested) paintingSelect.value = requested;
loadPainting(paintingSelect.value).catch((error) => {
  statusText.textContent = `Something went wrong: ${(error as Error).message}`;
  console.error(error);
});
