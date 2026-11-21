// composite.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// Builds the final picture:
//
//   1. Cut the player out of the webcam photo (MediaPipe ImageSegmenter with
//      the "selfie" model removes the background).
//   2. Put them on a dark, warm "old master" background, with a slight sepia
//      tint and darker edges like old varnish.
//   3. Draw an ornate gold (gilt) frame around it, using only canvas
//      gradients and circles: no image files needed.
//   4. Hang it on a dark museum wall under a warm spotlight, with a brass
//      plaque underneath: "You, after <Artist>", the title and the score.
// ---------------------------------------------------------------------------

import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { SELFIE_MODEL_URL, WASM_FOLDER_URL } from "./config";
import type { Painting } from "./paintings";

// --- Sizes of the finished picture (in pixels) ---------------------------------

const PICTURE_WIDTH = 960; // the photo inside the frame
const FRAME_THICKNESS = 72;
const WALL_MARGIN = 70; // wall showing around the frame
const PLAQUE_GAP = 34; // space between frame and plaque
const PLAQUE_WIDTH = 620;
const PLAQUE_HEIGHT = 120;

const SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

// Colours across one side of the frame, from the outer edge (0) to the inner
// edge (1). Bright and dark bands one after another look like the rounded
// mouldings of a real carved frame catching the light.
const GOLD_BANDS: [number, string][] = [
  [0.0, "#5c3d0e"],
  [0.12, "#c99a3c"],
  [0.28, "#f8e8a6"],
  [0.42, "#b8862f"],
  [0.55, "#6e4a14"],
  [0.68, "#d9b25a"],
  [0.84, "#fff1b8"],
  [1.0, "#7a5418"],
];

// =============================================================================
// Background removal
// =============================================================================

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/**
 * Load the selfie segmentation model (only the first call does any work).
 * main.ts calls this early, while the player is posing, so the result
 * screen appears quickly.
 */
export function loadSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_FOLDER_URL);
      return ImageSegmenter.createFromOptions(vision, {
        // CPU is plenty fast for a single photo and works on every laptop.
        baseOptions: { modelAssetPath: SELFIE_MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        outputConfidenceMasks: true, // "how sure am I this pixel is a person" (0..1)
        outputCategoryMask: false,
      });
    })();
    // If loading fails (e.g. no internet), allow trying again next time.
    segmenterPromise.catch(() => (segmenterPromise = null));
  }
  return segmenterPromise;
}

/**
 * Return a copy of the photo where the background is transparent.
 *
 * The model gives one number per pixel between 0 and 1: how sure it is that
 * the pixel belongs to a person. We use that number as the pixel's alpha
 * (opacity): person pixels stay, background pixels become see-through, and
 * the edges fade smoothly.
 */
async function removeBackground(photo: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const segmenter = await loadSegmenter();
  const result = segmenter.segment(photo);

  try {
    const mask = result.confidenceMasks?.[0];
    if (!mask) throw new Error("The segmenter returned no mask.");
    const personness = mask.getAsFloat32Array(); // one value per pixel, row by row

    const cutout = document.createElement("canvas");
    cutout.width = photo.width;
    cutout.height = photo.height;
    const ctx = cutout.getContext("2d")!;
    ctx.drawImage(photo, 0, 0);

    // pixels.data holds 4 numbers per pixel: red, green, blue, alpha.
    const pixels = ctx.getImageData(0, 0, cutout.width, cutout.height);
    for (let i = 0; i < personness.length; i++) {
      pixels.data[i * 4 + 3] = Math.round(personness[i] * 255);
    }
    ctx.putImageData(pixels, 0, 0);
    return cutout;
  } finally {
    result.close(); // free the memory MediaPipe used for the masks
  }
}

// =============================================================================
// The finished picture
// =============================================================================

/**
 * Make the framed result image.
 *
 * @param photo    the webcam snapshot (already mirrored, as the player saw it)
 * @param painting the painting the player was copying
 * @param score    the final score 0..100, or null if there wasn't one
 * @returns a new canvas with the finished picture, ready to show or download
 */
export async function createFramedResult(
  photo: HTMLCanvasElement,
  painting: Painting,
  score: number | null,
): Promise<HTMLCanvasElement> {
  // If background removal fails (e.g. the model couldn't download), still
  // make a picture, just with the original background.
  let person: HTMLCanvasElement = photo;
  try {
    person = await removeBackground(photo);
  } catch (error) {
    console.warn("Background removal failed, keeping the background.", error);
  }

  // Work out where everything goes.
  const pictureW = PICTURE_WIDTH;
  const pictureH = Math.round((PICTURE_WIDTH * photo.height) / photo.width);
  const frameW = pictureW + 2 * FRAME_THICKNESS;
  const frameH = pictureH + 2 * FRAME_THICKNESS;
  const frameX = WALL_MARGIN;
  const frameY = WALL_MARGIN;
  const pictureX = frameX + FRAME_THICKNESS;
  const pictureY = frameY + FRAME_THICKNESS;

  const canvas = document.createElement("canvas");
  canvas.width = frameW + 2 * WALL_MARGIN;
  canvas.height = frameY + frameH + PLAQUE_GAP + PLAQUE_HEIGHT + WALL_MARGIN;
  const ctx = canvas.getContext("2d")!;

  // Back to front, like a painter: wall, shadow, picture, frame, plaque.
  drawWall(ctx, canvas.width, canvas.height);
  drawShadow(ctx, frameX, frameY, frameW, frameH);

  drawOldMasterBackground(ctx, pictureX, pictureY, pictureW, pictureH);
  ctx.save();
  // An "aged oil paint" look. (Browsers that don't support filters skip it.)
  ctx.filter = "sepia(0.35) saturate(0.85) contrast(1.1) brightness(0.95)";
  ctx.drawImage(person, pictureX, pictureY, pictureW, pictureH);
  ctx.restore();
  drawVarnish(ctx, pictureX, pictureY, pictureW, pictureH);

  drawGiltFrame(ctx, frameX, frameY, frameW, frameH, FRAME_THICKNESS);
  drawPlaque(ctx, canvas.width / 2, frameY + frameH + PLAQUE_GAP, painting, score);

  return canvas;
}

// --- Wall and lighting ---------------------------------------------------------

function drawWall(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#2b211a";
  ctx.fillRect(0, 0, w, h);

  // Faint vertical stripes, like museum wallpaper.
  ctx.fillStyle = "rgba(255, 255, 255, 0.018)";
  for (let x = 0; x < w; x += 28) ctx.fillRect(x, 0, 14, h);

  // A warm spotlight shining down from above the frame.
  const spot = ctx.createRadialGradient(w / 2, -h * 0.15, 0, w / 2, -h * 0.15, h * 1.15);
  spot.addColorStop(0, "rgba(255, 214, 150, 0.38)");
  spot.addColorStop(0.55, "rgba(255, 190, 110, 0.10)");
  spot.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);
}

/** A soft shadow under the frame so it looks like it's hanging on the wall. */
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 25;
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// --- Inside the frame ---------------------------------------------------------

/** Dark brown, lighter in the middle: the classic portrait background. */
function drawOldMasterBackground(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
): void {
  const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.4, 0, x + w * 0.5, y + h * 0.4, w * 0.7);
  glow.addColorStop(0, "#6b5238");
  glow.addColorStop(1, "#1c140e");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);
}

/** Darken the edges and add a warm tint, like old yellowed varnish. */
function drawVarnish(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const vignette = ctx.createRadialGradient(x + w / 2, y + h / 2, h * 0.35, x + w / 2, y + h / 2, w * 0.75);
  vignette.addColorStop(0, "rgba(20, 10, 0, 0)");
  vignette.addColorStop(1, "rgba(20, 10, 0, 0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "rgba(255, 190, 90, 0.07)";
  ctx.fillRect(x, y, w, h);
}

// --- The gilt frame -------------------------------------------------------------

/**
 * Draw an ornate gold frame. x, y, w, h is the OUTSIDE of the frame and t is
 * how thick it is.
 */
function drawGiltFrame(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number,
): void {
  // The hole in the middle where the picture shows.
  const ix = x + t;
  const iy = y + t;
  const iw = w - 2 * t;
  const ih = h - 2 * t;

  // 1. Four sides. Each is a trapezoid with 45° corners (a "mitre", like a
  //    real frame), filled with the gold bands running from outside to
  //    inside. The light comes from the top left, so the bottom and right
  //    sides get a little shade.
  const sides = [
    { corners: [[x, y], [x + w, y], [ix + iw, iy], [ix, iy]], from: [x, y], to: [x, iy], shade: 0 },
    { corners: [[x + w, y], [x + w, y + h], [ix + iw, iy + ih], [ix + iw, iy]], from: [x + w, y], to: [ix + iw, y], shade: 0.22 },
    { corners: [[x + w, y + h], [x, y + h], [ix, iy + ih], [ix + iw, iy + ih]], from: [x, y + h], to: [x, iy + ih], shade: 0.32 },
    { corners: [[x, y + h], [x, y], [ix, iy], [ix, iy + ih]], from: [x, y], to: [ix, y], shade: 0.08 },
  ];

  for (const side of sides) {
    const gold = ctx.createLinearGradient(side.from[0], side.from[1], side.to[0], side.to[1]);
    for (const [offset, colour] of GOLD_BANDS) gold.addColorStop(offset, colour);

    ctx.beginPath();
    ctx.moveTo(side.corners[0][0], side.corners[0][1]);
    for (const [cx, cy] of side.corners.slice(1)) ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();

    if (side.shade > 0) {
      ctx.fillStyle = `rgba(40, 20, 0, ${side.shade})`;
      ctx.fill();
    }
  }

  // 2. Thin dark grooves between the mouldings.
  ctx.strokeStyle = "rgba(60, 35, 5, 0.6)";
  ctx.lineWidth = 1.5;
  for (const inset of [t * 0.3, t * 0.82]) {
    ctx.strokeRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
  }

  // 3. A row of little gold beads running round the frame.
  const beadInset = t * 0.56;
  const beadRadius = t * 0.07;
  const gap = beadRadius * 2.7;
  const left = x + beadInset;
  const top = y + beadInset;
  const right = x + w - beadInset;
  const bottom = y + h - beadInset;
  const nearCorner = (bx: number, by: number) =>
    (Math.abs(bx - left) < t * 0.6 || Math.abs(bx - right) < t * 0.6) &&
    (Math.abs(by - top) < t * 0.6 || Math.abs(by - bottom) < t * 0.6);

  for (let bx = left; bx <= right; bx += gap) {
    if (!nearCorner(bx, top)) drawBead(ctx, bx, top, beadRadius);
    if (!nearCorner(bx, bottom)) drawBead(ctx, bx, bottom, beadRadius);
  }
  for (let by = top + gap; by < bottom; by += gap) {
    if (!nearCorner(left, by)) drawBead(ctx, left, by, beadRadius);
    if (!nearCorner(right, by)) drawBead(ctx, right, by, beadRadius);
  }

  // 4. A carved flower (rosette) on each corner.
  const r = t / 2;
  for (const [cx, cy] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) {
    drawRosette(ctx, cx, cy, t);
  }

  // 5. Crisp edges: dark outline outside, dark lip and a bright gold line
  //    where the frame meets the picture.
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#2e1d05";
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3b2708";
  ctx.strokeRect(ix, iy, iw, ih);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f3d98a";
  ctx.strokeRect(ix - 4, iy - 4, iw + 8, ih + 8);
}

/** A shiny gold ball: bright spot at the top left, dark at the bottom right. */
function drawBead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const shine = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  shine.addColorStop(0, "#fff6c8");
  shine.addColorStop(0.5, "#d4a845");
  shine.addColorStop(1, "#6e4b12");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Eight bead "petals" in a circle round a bigger bead, on a dark disc. */
function drawRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, t * 0.45);
  base.addColorStop(0, "#8a6420");
  base.addColorStop(1, "#4a3008");
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(cx, cy, t * 0.42, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    drawBead(ctx, cx + Math.cos(angle) * t * 0.25, cy + Math.sin(angle) * t * 0.25, t * 0.12);
  }
  drawBead(ctx, cx, cy, t * 0.14);
}

// --- The brass plaque -------------------------------------------------------------

function drawPlaque(
  ctx: CanvasRenderingContext2D,
  centreX: number,
  top: number,
  painting: Painting,
  score: number | null,
): void {
  const x = centreX - PLAQUE_WIDTH / 2;
  const w = PLAQUE_WIDTH;
  const h = PLAQUE_HEIGHT;

  // Brass plate with a small shadow.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  const brass = ctx.createLinearGradient(0, top, 0, top + h);
  brass.addColorStop(0, "#f1dc9a");
  brass.addColorStop(0.5, "#c9a14a");
  brass.addColorStop(1, "#8a6420");
  ctx.fillStyle = brass;
  ctx.fillRect(x, top, w, h);
  ctx.restore();

  // Engraved border and four screws.
  ctx.strokeStyle = "rgba(80, 50, 10, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 7, top + 7, w - 14, h - 14);
  for (const [sx, sy] of [[x + 16, top + 16], [x + w - 16, top + 16], [x + 16, top + h - 16], [x + w - 16, top + h - 16]]) {
    drawBead(ctx, sx, sy, 4);
  }

  // Three lines of text, centred.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  engrave(ctx, `You, after ${painting.artist}`, centreX, top + 36, `bold 28px ${SERIF}`);
  engrave(ctx, `${painting.title}, ${painting.year}`, centreX, top + 70, `italic 20px ${SERIF}`);
  const scoreLine = score === null ? "POSE MATCH: NOT SCORED" : `POSE MATCH: ${score} / 100`;
  engrave(ctx, scoreLine, centreX, top + 98, `bold 16px ${SERIF}`);
}

/** Text that looks cut into metal: a light copy 1px lower, then dark on top. */
function engrave(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string): void {
  ctx.font = font;
  ctx.fillStyle = "rgba(255, 244, 210, 0.7)";
  ctx.fillText(text, x, y + 1);
  ctx.fillStyle = "#3a2610";
  ctx.fillText(text, x, y);
}
