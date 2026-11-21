// pose-picker.ts: developer tool for making the paintings' figures.
// ---------------------------------------------------------------------------
// Open http://localhost:5173/tools/pose-picker.html while `npm run dev` runs.
//
// 1. Load a painting (from paintings.ts, or any image file).
// 2. Choose 1 figure (solo) or 2 figures (duet). Figure 1 = the LEFT person.
// 3. If the painting already has figures, show them. Otherwise run
//    PoseLandmarker (up to 2 people) and give the leftmost to Figure 1.
// 4. Fix joints by hand: select a joint, click the painting. Set each
//    figure's label and its name-tag position (just above its head).
// 5. Copy the `figures: [...]` code into src/paintings.ts.
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
const figureCountSelect = byId<HTMLSelectElement>("figure-count");
const figureTabs = byId("figure-tabs");
const labelInput = byId<HTMLInputElement>("label-input");
const anchorButton = byId<HTMLButtonElement>("anchor-button");
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

interface FigureDraft {
  label: string;
  joints: KeyJointPositions;
  /** Where the name tag goes (just above the head), 0..1. */
  anchor: { x: number; y: number } | null;
}

let image = new Image();
let figures: FigureDraft[] = [{ label: "", joints: {}, anchor: null }];
/** Which figure we are editing (0 = Figure 1 = left). */
let current = 0;
/** The joint that the next click on the painting will move. */
let selectedJoint: KeyJointName = "nose";
/** true = the next click sets the name-tag position instead of a joint. */
let placingAnchor = false;

const FIGURE_COLOURS = ["#f5c542", "#2ec4b6"]; // gold, teal (same as the players)

// Lines to draw between joints, so the dots look like a skeleton.
const BONES: [KeyJointName, KeyJointName][] = [
  ["leftShoulder", "rightShoulder"], ["leftHip", "rightHip"],
  ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"], ["rightShoulder", "rightHip"],
  ["leftHip", "leftKnee"], ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"],
];

// --- Pose detection on a still image (up to 2 people) ---------------------------

let landmarker: PoseLandmarker | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarker) {
    const vision = await FilesetResolver.forVisionTasks(WASM_FOLDER_URL);
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
      runningMode: "IMAGE", // one still picture, not a video
      numPoses: 2,
      // Paintings aren't photos, so accept less confident detections.
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
    });
  }
  return landmarker;
}

/** Middle of a figure's shoulders and hips across the image (0..1). */
function centreX(joints: KeyJointPositions): number {
  const xs = (["leftShoulder", "rightShoulder", "leftHip", "rightHip"] as KeyJointName[])
    .map((name) => joints[name]?.[0])
    .filter((x): x is number => x !== undefined);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5;
}

/** A name-tag position just above the head, worked out from the joints. */
function guessAnchor(joints: KeyJointPositions): { x: number; y: number } | null {
  const nose = joints.nose;
  const ls = joints.leftShoulder;
  const rs = joints.rightShoulder;
  if (!nose || !ls || !rs) return null;
  const shoulderY = (ls[1] + rs[1]) / 2;
  return { x: nose[0], y: Math.max(0.02, nose[1] - Math.max(0.04, 1.1 * (shoulderY - nose[1]))) };
}

async function detectAutomatically(): Promise<void> {
  statusText.textContent = "Looking for people in the painting…";
  const result = (await getLandmarker()).detect(image);
  const found = result.landmarks
    .map((landmarks) => keyJointsFromPose({ landmarks, width: image.naturalWidth, height: image.naturalHeight }))
    .sort((a, b) => centreX(a) - centreX(b)); // left to right

  figures.forEach((figure, i) => {
    figure.joints = found[i] ?? {};
    figure.anchor = guessAnchor(figure.joints);
  });
  statusText.textContent =
    found.length === 0
      ? "Nobody found automatically. Place the joints by hand: click each one on the painting."
      : `Found ${found.length} ${found.length === 1 ? "person" : "people"} (left = Figure 1). Check every dot, the labels and the name-tag positions.`;
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

  // Show the figures saved in paintings.ts so they can be checked or fixed.
  figures = painting.figures.map((figure) => ({
    label: figure.label,
    joints: keyJointsFromPose(figure.targetPose),
    anchor: { ...figure.anchor },
  }));
  figureCountSelect.value = String(figures.length);
  current = 0;
  statusText.textContent = 'Showing the figures saved in paintings.ts. Press "Detect automatically" to start again.';
  redraw();
}

async function loadFile(file: File): Promise<void> {
  await loadImage(URL.createObjectURL(file));
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  // A new image: start with fresh, empty figures.
  figures = Array.from({ length: Number(figureCountSelect.value) }, () => ({ label: "", joints: {}, anchor: null }));
  current = 0;
  await detectAutomatically();
}

function setFigureCount(count: number): void {
  while (figures.length < count) figures.push({ label: "", joints: {}, anchor: null });
  figures.length = count;
  current = Math.min(current, count - 1);
}

// --- Drawing ----------------------------------------------------------------------

function redraw(): void {
  const w = canvas.width;
  const h = canvas.height;
  ctx.drawImage(image, 0, 0, w, h);
  const unit = Math.max(w, h) / 200; // sizes relative to the image

  figures.forEach((figure, f) => {
    const colour = FIGURE_COLOURS[f];
    const faded = f !== current;
    ctx.globalAlpha = faded ? 0.45 : 1;

    // Bones
    ctx.lineWidth = unit * 0.8;
    ctx.strokeStyle = colour;
    for (const [a, b] of BONES) {
      const pa = figure.joints[a];
      const pb = figure.joints[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa[0] * w, pa[1] * h);
      ctx.lineTo(pb[0] * w, pb[1] * h);
      ctx.stroke();
    }

    // Joints, with a short label like "L elbow"
    ctx.font = `bold ${unit * 2.6}px system-ui, sans-serif`;
    for (const name of JOINT_NAMES) {
      const p = figure.joints[name];
      if (!p) continue;
      const x = p[0] * w;
      const y = p[1] * h;
      ctx.fillStyle = name === "nose" ? "#fff" : name.startsWith("left") ? "#4fc3ff" : "#ff5fa2";
      ctx.beginPath();
      ctx.arc(x, y, unit * 1.3, 0, Math.PI * 2);
      ctx.fill();
      if (!faded && name === selectedJoint && !placingAnchor) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = unit * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, unit * 2.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!faded) {
        ctx.lineWidth = unit * 0.5;
        ctx.strokeStyle = "black";
        ctx.strokeText(shortLabel(name), x + unit * 2.2, y - unit * 1.2);
        ctx.fillStyle = "#fff";
        ctx.fillText(shortLabel(name), x + unit * 2.2, y - unit * 1.2);
      }
    }

    // Name-tag position: a little flag with the figure's label
    if (figure.anchor) {
      const x = figure.anchor.x * w;
      const y = figure.anchor.y * h;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(x, y + unit * 2.5);
      ctx.lineTo(x - unit * 1.5, y);
      ctx.lineTo(x + unit * 1.5, y);
      ctx.fill();
      ctx.font = `bold ${unit * 3}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = unit * 0.6;
      ctx.strokeStyle = "black";
      const text = figure.label || `Figure ${f + 1}`;
      ctx.strokeText(text, x, y - unit);
      ctx.fillText(text, x, y - unit);
      ctx.textAlign = "start";
    }
  });
  ctx.globalAlpha = 1;

  updateTabs();
  updateJointList();
  updateOutput();
}

/** "leftElbow" -> "L elbow" */
function shortLabel(name: KeyJointName): string {
  if (name === "nose") return "nose";
  const side = name.startsWith("left") ? "L" : "R";
  return `${side} ${name.replace(/^(left|right)/, "").toLowerCase()}`;
}

function updateTabs(): void {
  figureTabs.innerHTML = "";
  figures.forEach((_, f) => {
    const button = document.createElement("button");
    const side = figures.length === 2 ? (f === 0 ? " (left)" : " (right)") : "";
    button.textContent = `Figure ${f + 1}${side}`;
    button.style.borderColor = FIGURE_COLOURS[f];
    button.classList.toggle("selected", f === current);
    button.addEventListener("click", () => {
      current = f;
      placingAnchor = false;
      redraw();
    });
    figureTabs.appendChild(button);
  });
  labelInput.value = figures[current].label;
  anchorButton.classList.toggle("selected", placingAnchor);
}

function updateJointList(): void {
  const joints = figures[current].joints;
  jointList.innerHTML = "";
  for (const name of JOINT_NAMES) {
    const button = document.createElement("button");
    button.textContent = `${joints[name] ? "✓" : "–"} ${shortLabel(name)}`;
    button.classList.toggle("selected", name === selectedJoint && !placingAnchor);
    button.classList.toggle("missing", !joints[name]);
    button.addEventListener("click", () => {
      selectedJoint = name;
      placingAnchor = false;
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
  const ids = figures.length === 1 ? ["main"] : ["left", "right"];
  const blocks = figures.map((figure, f) => {
    const lines = JOINT_NAMES.filter((name) => figure.joints[name]).map((name) => {
      const [x, y] = figure.joints[name]!;
      return `          ${name}: [${round(x)}, ${round(y)}],`;
    });
    const anchor = figure.anchor ?? guessAnchor(figure.joints) ?? { x: 0.5, y: 0.05 };
    return [
      "      {",
      `        id: "${ids[f]}",`,
      `        label: ${JSON.stringify(figure.label || `Figure ${f + 1}`)},`,
      `        anchor: { x: ${round(anchor.x)}, y: ${round(anchor.y)} },`,
      `        targetPose: poseFromKeyJoints(${image.naturalWidth}, ${image.naturalHeight}, {`,
      ...lines,
      "        }),",
      "      },",
    ].join("\n");
  });
  output.value = `    figures: [\n${blocks.join("\n")}\n    ],`;
}

// --- Clicking and buttons ----------------------------------------------------------

canvas.addEventListener("click", (event) => {
  // The canvas may be shown smaller than its real size, so use fractions
  // of the displayed size: these are exactly the 0..1 coordinates we need.
  const x = event.offsetX / canvas.clientWidth;
  const y = event.offsetY / canvas.clientHeight;
  const figure = figures[current];

  if (placingAnchor) {
    figure.anchor = { x, y };
    placingAnchor = false;
  } else {
    figure.joints[selectedJoint] = [x, y];
    // Move on to the next joint that hasn't been placed yet.
    const next = JOINT_NAMES.find((name) => !figure.joints[name]);
    if (next) selectedJoint = next;
  }
  redraw();
});

labelInput.addEventListener("input", () => {
  figures[current].label = labelInput.value;
  redraw();
});

anchorButton.addEventListener("click", () => {
  placingAnchor = !placingAnchor;
  statusText.textContent = placingAnchor ? "Click just above this figure's head to place its name tag." : "";
  redraw();
});

figureCountSelect.addEventListener("change", () => {
  setFigureCount(Number(figureCountSelect.value));
  redraw();
});

hideButton.addEventListener("click", () => {
  delete figures[current].joints[selectedJoint];
  redraw();
});

clearButton.addEventListener("click", () => {
  figures[current].joints = {};
  selectedJoint = "nose";
  redraw();
});

detectButton.addEventListener("click", () => detectAutomatically());

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.value);
  statusText.textContent = "Copied! Paste it over the figures: [...] block in src/paintings.ts.";
});

paintingSelect.addEventListener("change", () => loadPainting(paintingSelect.value));

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (file) await loadFile(file);
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
