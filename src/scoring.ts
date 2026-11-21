// scoring.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Compares the player's pose with the painting's pose: a score out of 100.
//
// THE IDEA (for the judges)
//   We describe a pose by its ANGLES, which don't change when you stand
//   further away (smaller) or to one side (shifted). We use two kinds:
//
//   a) Limb DIRECTIONS: which way each limb points in the picture, e.g. the
//      upper arm from shoulder to elbow points "up and to the left".
//      Measured with atan2(dy, dx), like a compass heading in degrees.
//   b) JOINT ANGLES: how much each joint is bent, e.g. the elbow angle
//      between upper arm and forearm (180° = straight arm).
//
//   Why both? An arm pointing straight up and an arm pointing straight down
//   both have a straight elbow (180°), so joint angles alone can't tell them
//   apart; directions can. Joint angles still give credit for the right body
//   SHAPE when your whole body is slightly tilted.
//
// HOW A SCORE IS MADE
//   1. Turn MediaPipe's 0–1 numbers into real pixels (x × width, y × height)
//      for both the webcam and the painting. Otherwise a 16:9 webcam squashes
//      every angle.
//   2. Measure 18 features: 10 directions (upper arms, forearms, thighs,
//      shins, torso, head) + 8 joint angles (elbows, shoulders, hips, knees).
//   3. For each feature, the difference between your angle and the
//      painting's, always the short way round (350° vs 10° = 20°, not 340°).
//   4. Turn the difference into points with a bell curve (a "Gaussian"):
//         points = 100 × e^-(difference / tolerance)²
//      With tolerance 25°: 5° off → 96, 15° off → 70, 25° off → 37,
//      40° off → 8. Small wobbles barely matter, clearly wrong limbs drop
//      off fast.
//   5. Overall = weighted average. Arms and torso count most (they define a
//      painting's pose), legs less, the head least. Each painting can also
//      mark "signature" limbs (Napoleon's pointing arm) that count double.
//   6. No free points: a limb the painting shows but the camera can't see
//      scores 0. (Otherwise hiding a wrong arm would RAISE your score.)
//   7. Mirror images count: people copy a painting like a mirror, so we also
//      score your pose flipped left-to-right and keep the better result.
// ---------------------------------------------------------------------------

import { LEFT_RIGHT_PAIRS, mirrorPose } from "./landmarks";
import type { DetectedPose } from "./landmarks";

// --- Settings to tune ------------------------------------------------------

export type Difficulty = "easy" | "medium" | "hard";

/**
 * How many degrees off still counts as "close". Bigger = more forgiving.
 * At exactly this many degrees off, a feature scores 37 points.
 */
export const TOLERANCE_DEGREES: Record<Difficulty, number> = {
  easy: 30,
  medium: 25,
  hard: 20,
};

/** A landmark only counts as seen if MediaPipe is at least this sure (0..1). */
export const MIN_VISIBILITY = 0.6;

/** Below this share of the (weighted) features seen, you're "not in frame". */
export const IN_FRAME_FRACTION = 0.7;

/** Signature limbs of a painting count this many times more. */
export const SIGNATURE_WEIGHT = 2;

// How much each body part counts.
const ARM = 1.5;
const TORSO = 1.5;
const LEG = 1.0;
const HEAD = 0.5;

// --- The 18 features ----------------------------------------------------------

export type FeatureName =
  | "leftUpperArm" | "rightUpperArm" | "leftForearm" | "rightForearm"
  | "leftThigh" | "rightThigh" | "leftShin" | "rightShin"
  | "torso" | "head"
  | "leftElbow" | "rightElbow" | "leftShoulder" | "rightShoulder"
  | "leftHip" | "rightHip" | "leftKnee" | "rightKnee";

export interface Feature {
  name: FeatureName;
  /** "direction": which way a segment points. "joint": angle at a joint. */
  kind: "direction" | "joint";
  /**
   * The points it's measured from, each made of one landmark or the middle
   * of several. direction: [from, to]. joint: [end, MIDDLE, end].
   */
  points: number[][];
  weight: number;
  isLeg: boolean;
}

// Landmark numbers: 0 nose, 11/12 shoulders, 13/14 elbows, 15/16 wrists,
// 23/24 hips, 25/26 knees, 27/28 ankles (odd = left, even = right).
export const FEATURES: Feature[] = [
  // a) Directions
  { name: "leftUpperArm", kind: "direction", points: [[11], [13]], weight: ARM, isLeg: false },
  { name: "rightUpperArm", kind: "direction", points: [[12], [14]], weight: ARM, isLeg: false },
  { name: "leftForearm", kind: "direction", points: [[13], [15]], weight: ARM, isLeg: false },
  { name: "rightForearm", kind: "direction", points: [[14], [16]], weight: ARM, isLeg: false },
  { name: "leftThigh", kind: "direction", points: [[23], [25]], weight: LEG, isLeg: true },
  { name: "rightThigh", kind: "direction", points: [[24], [26]], weight: LEG, isLeg: true },
  { name: "leftShin", kind: "direction", points: [[25], [27]], weight: LEG, isLeg: true },
  { name: "rightShin", kind: "direction", points: [[26], [28]], weight: LEG, isLeg: true },
  // torso: from the middle of the hips to the middle of the shoulders
  { name: "torso", kind: "direction", points: [[23, 24], [11, 12]], weight: TORSO, isLeg: false },
  // head: from the middle of the shoulders to the nose
  { name: "head", kind: "direction", points: [[11, 12], [0]], weight: HEAD, isLeg: false },

  // b) Joint angles
  { name: "leftElbow", kind: "joint", points: [[11], [13], [15]], weight: ARM, isLeg: false },
  { name: "rightElbow", kind: "joint", points: [[12], [14], [16]], weight: ARM, isLeg: false },
  { name: "leftShoulder", kind: "joint", points: [[23], [11], [13]], weight: ARM, isLeg: false },
  { name: "rightShoulder", kind: "joint", points: [[24], [12], [14]], weight: ARM, isLeg: false },
  { name: "leftHip", kind: "joint", points: [[11], [23], [25]], weight: LEG, isLeg: true },
  { name: "rightHip", kind: "joint", points: [[12], [24], [26]], weight: LEG, isLeg: true },
  { name: "leftKnee", kind: "joint", points: [[23], [25], [27]], weight: LEG, isLeg: true },
  { name: "rightKnee", kind: "joint", points: [[24], [26], [28]], weight: LEG, isLeg: true },
];

// --- Results --------------------------------------------------------------------

/** How one feature compared. */
export interface FeatureResult {
  name: FeatureName;
  /** The painting's angle in degrees. */
  targetAngle: number;
  /** The player's angle in degrees, or null if the camera couldn't see it. */
  playerAngle: number | null;
  /** Smallest difference between the two in degrees (null if not seen). */
  diff: number | null;
  /** 0..100 (0 if not seen). */
  score: number;
  seen: boolean;
  /** How much this feature counted in the overall score. */
  weight: number;
  /**
   * The player's own landmarks this feature was measured on (after undoing
   * the mirror swap), so the skeleton can colour the right limb.
   */
  playerPoints: number[];
}

export interface PoseScore {
  /** Weighted average of all features, 0..100. */
  overall: number;
  features: FeatureResult[];
  /** true if the mirror image of the player's pose matched better. */
  mirrored: boolean;
  /** Share (0..1) of the features' weight that the camera could see. */
  seenFraction: number;
  /** false = too much of the body is hidden: "step back". */
  inFrame: boolean;
}

/** A painting's pose, measured once in advance (see prepareTarget). */
export interface PreparedTarget {
  features: { feature: Feature; targetAngle: number; weight: number }[];
}

export interface TargetOptions {
  /** The painting image's real size in pixels (default: the pose's own). */
  width?: number;
  height?: number;
  /** Leave out all leg features (for paintings where legs don't matter). */
  upperBodyOnly?: boolean;
  /** Features that count SIGNATURE_WEIGHT times more for this painting. */
  signatureJoints?: FeatureName[];
}

export interface ScoreOptions {
  difficulty?: Difficulty;
}

// =============================================================================
// Angle maths
// =============================================================================

interface Point {
  x: number;
  y: number;
}

const DEGREES = 180 / Math.PI;

/** Which way the line from `from` to `to` points, in degrees (-180..180). */
export function directionOf(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x) * DEGREES;
}

/** The angle at point b between b→a and b→c, from 0° (folded) to 180° (straight). */
export function angleAt(a: Point, b: Point, c: Point): number {
  return angleDifference(directionOf(b, a), directionOf(b, c));
}

/** Smallest difference between two angles, going the short way round (0..180). */
export function angleDifference(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Points for one feature: 100 × e^-(difference / tolerance)². */
export function featureScore(difference: number, tolerance: number): number {
  return 100 * Math.exp(-((difference / tolerance) ** 2));
}

// =============================================================================
// Measuring a pose
// =============================================================================

/**
 * The pixel position of a point made from one or more landmarks (their
 * middle), or null if any of them isn't clearly visible.
 */
function pixelPoint(pose: DetectedPose, landmarkNumbers: number[]): Point | null {
  let x = 0;
  let y = 0;
  for (const number of landmarkNumbers) {
    const landmark = pose.landmarks[number];
    if (!landmark || landmark.visibility < MIN_VISIBILITY) return null;
    // 0–1 numbers → real pixels, so x and y use the same unit.
    x += landmark.x * pose.width;
    y += landmark.y * pose.height;
  }
  return { x: x / landmarkNumbers.length, y: y / landmarkNumbers.length };
}

/** Every feature's angle in degrees. Features that aren't seen are missing. */
export function measureFeatures(pose: DetectedPose): Partial<Record<FeatureName, number>> {
  const angles: Partial<Record<FeatureName, number>> = {};
  for (const feature of FEATURES) {
    const points = feature.points.map((numbers) => pixelPoint(pose, numbers));
    if (points.some((point) => point === null)) continue; // not seen
    const [a, b, c] = points as Point[];
    angles[feature.name] = feature.kind === "direction" ? directionOf(a, b) : angleAt(a, b, c);
  }
  return angles;
}

/**
 * Measure a painting's pose ONCE when the painting loads, instead of every
 * frame. Features the painting doesn't show are simply not needed.
 */
export function prepareTarget(target: DetectedPose, options: TargetOptions = {}): PreparedTarget {
  const sized = { ...target, width: options.width ?? target.width, height: options.height ?? target.height };
  const angles = measureFeatures(sized);

  const features: PreparedTarget["features"] = [];
  for (const feature of FEATURES) {
    if (options.upperBodyOnly && feature.isLeg) continue; // legs left out entirely
    const targetAngle = angles[feature.name];
    if (targetAngle === undefined) continue; // the painting doesn't show it
    const signature = options.signatureJoints?.includes(feature.name) ?? false;
    features.push({ feature, targetAngle, weight: feature.weight * (signature ? SIGNATURE_WEIGHT : 1) });
  }
  return { features };
}

// =============================================================================
// Scoring
// =============================================================================

/**
 * Compare the player's pose with the painting's pose.
 *
 * @param player  the webcam pose (with the video's size in pixels)
 * @param target  the painting's pose, ideally prepared once with
 *                prepareTarget() (a raw pose also works, just slower)
 */
export function scorePose(
  player: DetectedPose,
  target: PreparedTarget | DetectedPose,
  options: ScoreOptions = {},
): PoseScore {
  const prepared = "features" in target ? target : prepareTarget(target);
  const tolerance = TOLERANCE_DEGREES[options.difficulty ?? "medium"];

  // Score the pose as it is, and as its mirror image (flipped left-to-right
  // with left and right swapped). Keep whichever matches the painting better.
  const asShown = compare(measureFeatures(player), prepared, tolerance, false);
  const mirrored = compare(measureFeatures(mirrorPose(player)), prepared, tolerance, true);
  return mirrored.overall > asShown.overall ? mirrored : asShown;
}

/** Score every needed feature and take the weighted average. */
function compare(
  playerAngles: Partial<Record<FeatureName, number>>,
  prepared: PreparedTarget,
  tolerance: number,
  mirrored: boolean,
): PoseScore {
  const results: FeatureResult[] = [];
  let totalWeight = 0;
  let weightedPoints = 0;
  let seenWeight = 0;

  for (const { feature, targetAngle, weight } of prepared.features) {
    const playerAngle = playerAngles[feature.name];
    const seen = playerAngle !== undefined;
    const diff = seen ? angleDifference(playerAngle, targetAngle) : null;
    // Not seen = 0 points, but it still counts in the average: no free points.
    const points = diff === null ? 0 : featureScore(diff, tolerance);

    totalWeight += weight;
    weightedPoints += weight * points;
    if (seen) seenWeight += weight;

    results.push({
      name: feature.name,
      targetAngle,
      playerAngle: seen ? playerAngle : null,
      diff,
      score: Math.round(points),
      seen,
      weight,
      playerPoints: playersOwnLandmarks(feature, mirrored),
    });
  }

  const seenFraction = totalWeight > 0 ? seenWeight / totalWeight : 0;
  return {
    overall: totalWeight > 0 ? Math.round(weightedPoints / totalWeight) : 0,
    features: results,
    mirrored,
    seenFraction,
    inFrame: seenFraction >= IN_FRAME_FRACTION,
  };
}

// Left landmark number -> right one and back (e.g. 13 <-> 14).
const OTHER_SIDE = new Map<number, number>();
for (const [left, right] of LEFT_RIGHT_PAIRS) {
  OTHER_SIDE.set(left, right);
  OTHER_SIDE.set(right, left);
}

/**
 * The player's real landmarks behind a feature. In the mirrored version the
 * player's left arm was renamed "right arm", so swap the numbers back.
 */
function playersOwnLandmarks(feature: Feature, mirrored: boolean): number[] {
  const numbers = feature.points.flat();
  return mirrored ? numbers.map((n) => OTHER_SIDE.get(n) ?? n) : numbers;
}
