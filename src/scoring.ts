// scoring.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Compares the player's pose with the painting's pose and gives a score out
// of 100.
//
// THE IDEA, IN ONE SENTENCE (for the judges):
//   We don't compare WHERE your body is, we compare how your joints are BENT.
//
// Why angles? If you stand further from the camera you look smaller, and if
// you stand to one side every point moves. But the angle at your elbow stays
// the same. So angles let us ignore distance, size and position for free.
//
// HOW IT WORKS
//   1. For 8 joints (both elbows, shoulders, hips and knees) measure the angle
//      at that joint, e.g. the elbow angle is between upper arm and forearm.
//   2. Do the same for the painting.
//   3. For each joint, compare the two angles:
//        same angle            -> 100 points
//        30° different         ->  50 points
//        60° or more different ->   0 points
//      (a straight line in between: every degree off costs 100/60 ≈ 1.7 pts)
//   4. The overall score is the average of the joint scores.
//   5. Joints the camera can't see clearly are left out, so a portrait with
//      no legs is scored on the arms only.
//   6. Mirror images count too: we score the pose both as shown and
//      left-right swapped, and keep the better one.
//
// MediaPipe landmark numbers:
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------

import type { DetectedPose } from "./pose";

/** Landmarks less visible than this (0..1) are ignored. */
export const MIN_VISIBILITY = 0.5;

/** An angle difference this big (in degrees) or bigger scores 0. */
export const MAX_ANGLE_DIFFERENCE = 60;

export type JointName =
  | "leftElbow"
  | "rightElbow"
  | "leftShoulder"
  | "rightShoulder"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee";

/**
 * A joint is measured from three landmarks: [end, middle, end].
 * The angle is measured at the middle one.
 */
export interface Joint {
  name: JointName;
  /** The same joint on the other side of the body (used for mirror images). */
  mirror: JointName;
  points: [number, number, number];
}

// Landmark numbers: 11/12 shoulders, 13/14 elbows, 15/16 wrists,
// 23/24 hips, 25/26 knees, 27/28 ankles (odd = left, even = right).
export const JOINTS: Joint[] = [
  // elbow: angle between upper arm and forearm (shoulder - ELBOW - wrist)
  { name: "leftElbow", mirror: "rightElbow", points: [11, 13, 15] },
  { name: "rightElbow", mirror: "leftElbow", points: [12, 14, 16] },
  // shoulder: angle between body and upper arm (hip - SHOULDER - elbow)
  { name: "leftShoulder", mirror: "rightShoulder", points: [23, 11, 13] },
  { name: "rightShoulder", mirror: "leftShoulder", points: [24, 12, 14] },
  // hip: angle between body and thigh (shoulder - HIP - knee)
  { name: "leftHip", mirror: "rightHip", points: [11, 23, 25] },
  { name: "rightHip", mirror: "leftHip", points: [12, 24, 26] },
  // knee: angle between thigh and shin (hip - KNEE - ankle)
  { name: "leftKnee", mirror: "rightKnee", points: [23, 25, 27] },
  { name: "rightKnee", mirror: "leftKnee", points: [24, 26, 28] },
];

/** The result of comparing two poses. */
export interface PoseScore {
  /** 0..100, or null if not a single joint could be compared. */
  overall: number | null;
  /**
   * 0..100 for each joint that could be compared, keyed by the PLAYER's
   * joint. Joints that were skipped are missing.
   */
  joints: Partial<Record<JointName, number>>;
}

/** Angle (in degrees) of each joint we could see. Missing = not visible. */
type JointAngles = Partial<Record<JointName, number>>;

/**
 * Compare the player's pose with the painting's pose.
 * Fast enough to run on every video frame, and doesn't change its inputs.
 */
export function scorePose(player: DetectedPose, target: DetectedPose): PoseScore {
  const playerAngles = measureJointAngles(player);
  const targetAngles = measureJointAngles(target);

  // The player sees themselves in a mirror, so when copying a raised RIGHT
  // arm in a painting many people raise their LEFT arm. Score both ways and
  // keep whichever is better.
  const asShown = compareAngles(playerAngles, targetAngles, false);
  const mirrored = compareAngles(playerAngles, targetAngles, true);

  return (mirrored.overall ?? -1) > (asShown.overall ?? -1) ? mirrored : asShown;
}

/** Measure the angle at every joint whose three landmarks are clearly visible. */
export function measureJointAngles(pose: DetectedPose): JointAngles {
  const angles: JointAngles = {};

  for (const joint of JOINTS) {
    const [a, b, c] = joint.points.map((index) => pose.landmarks[index]);

    // Skip the joint if any of its three landmarks is missing or hard to see.
    const allVisible = [a, b, c].every(
      (landmark) => landmark !== undefined && landmark.visibility >= MIN_VISIBILITY,
    );
    if (!allVisible) continue;

    angles[joint.name] = angleAt(a, b, c, pose.aspectRatio);
  }
  return angles;
}

/**
 * The angle at point b, between the line b→a and the line b→c,
 * in degrees from 0 (folded shut) to 180 (straight line).
 *
 * Maths: Math.atan2(dy, dx) gives the direction a line points in. The angle
 * at the joint is the difference between the directions of the two bones.
 *
 * x is a fraction of the image width and y a fraction of the height, so we
 * multiply x by the aspect ratio (width ÷ height) to make one unit of x the
 * same real length as one unit of y.
 */
export function angleAt(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  aspectRatio: number,
): number {
  const directionToA = Math.atan2(a.y - b.y, (a.x - b.x) * aspectRatio);
  const directionToC = Math.atan2(c.y - b.y, (c.x - b.x) * aspectRatio);

  let degrees = Math.abs(directionToA - directionToC) * (180 / Math.PI);
  // Going the other way round is shorter, e.g. 270° apart is really 90°.
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

/**
 * Turn an angle difference into points: 100 at 0°, falling in a straight
 * line to 0 at MAX_ANGLE_DIFFERENCE (60°) and beyond.
 */
export function jointScore(angleDifference: number): number {
  const score = 100 * (1 - angleDifference / MAX_ANGLE_DIFFERENCE);
  return Math.max(0, score);
}

/**
 * Score every joint both poses have.
 * If `mirrored` is true, the player's left elbow is compared with the
 * painting's right elbow, and so on.
 */
function compareAngles(
  playerAngles: JointAngles,
  targetAngles: JointAngles,
  mirrored: boolean,
): PoseScore {
  const joints: Partial<Record<JointName, number>> = {};
  let total = 0;
  let count = 0;

  for (const joint of JOINTS) {
    const playerAngle = playerAngles[joint.name];
    const targetAngle = targetAngles[mirrored ? joint.mirror : joint.name];
    if (playerAngle === undefined || targetAngle === undefined) continue;

    const score = jointScore(Math.abs(playerAngle - targetAngle));
    joints[joint.name] = Math.round(score);
    total += score;
    count += 1;
  }

  return {
    overall: count > 0 ? Math.round(total / count) : null,
    joints,
  };
}

/**
 * Smooths the live score so the number on screen doesn't flicker.
 *
 * It's a "moving average": it remembers the last few scores (10 by default,
 * about a third of a second of video) and returns their average. A single
 * bad frame can only move the number a little.
 */
export class ScoreSmoother {
  private recentScores: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize = 10) {
    this.windowSize = windowSize;
  }

  /** Add the newest score and get back the smoothed score (rounded). */
  add(score: number): number {
    this.recentScores.push(score);
    // Forget the oldest score once we have more than windowSize of them.
    if (this.recentScores.length > this.windowSize) {
      this.recentScores.shift();
    }
    const sum = this.recentScores.reduce((total, s) => total + s, 0);
    return Math.round(sum / this.recentScores.length);
  }

  /** Forget everything, e.g. when a new painting is picked. */
  reset(): void {
    this.recentScores = [];
  }
}
