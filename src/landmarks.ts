// landmarks.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Small helpers for pose data. No MediaPipe code in here (only its types),
// so the tests and the painting list can use these without loading the
// heavy pose model.
//
// MediaPipe landmark numbers:
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * One detected body: an array of 33 landmarks.
 * Each landmark has x and y between 0 and 1 (fractions of the image width and
 * height, measured from the top-left corner), a depth z, and a `visibility`
 * score between 0 and 1.
 */
export type PoseLandmarks = NormalizedLandmark[];

/**
 * A pose together with the size (in pixels) of the picture it was found in.
 *
 * Why the size matters: x is a fraction of the picture's WIDTH and y a
 * fraction of its HEIGHT. On a 1280×720 webcam those are different lengths,
 * so angles measured on the 0–1 numbers come out wrong. scoring.ts first
 * turns every point into real pixels (x × width, y × height).
 */
export interface DetectedPose {
  landmarks: PoseLandmarks;
  /** Width of the source picture in pixels. */
  width: number;
  /** Height of the source picture in pixels. */
  height: number;
}

/**
 * The 13 body points used for target poses, and their MediaPipe numbers.
 * "left" and "right" mean the PERSON's left and right: for someone facing
 * you, their left shoulder is on YOUR right.
 */
export const KEY_JOINTS = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type KeyJointName = keyof typeof KEY_JOINTS;

/** Positions of some key joints, each [x, y] from 0 to 1. Leave out joints you can't see. */
export type KeyJointPositions = Partial<Record<KeyJointName, [x: number, y: number]>>;

/**
 * Build a full 33-landmark pose from just the key joints. This is how the
 * paintings' target poses are written in paintings.ts (tools/pose-picker.html
 * makes them for you).
 *
 * Every landmark that isn't given gets visibility 0, which means "not part
 * of this painting's pose".
 *
 * @param width  the painting image's width in pixels
 * @param height the painting image's height in pixels
 * @param joints where each visible key joint is (0..1)
 */
export function poseFromKeyJoints(width: number, height: number, joints: KeyJointPositions): DetectedPose {
  // Start with 33 "unknown" landmarks...
  const landmarks: PoseLandmarks = Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 0,
  }));

  // ...then fill in the ones we know, fully visible.
  for (const name of Object.keys(KEY_JOINTS) as KeyJointName[]) {
    const position = joints[name];
    if (position) {
      landmarks[KEY_JOINTS[name]] = { x: position[0], y: position[1], z: 0, visibility: 1 };
    }
  }
  return { landmarks, width, height };
}

/**
 * Read the key joints back out of a pose (the opposite of
 * poseFromKeyJoints). Joints with low visibility are left out.
 * Used by tools/pose-picker.html.
 */
export function keyJointsFromPose(pose: DetectedPose, minVisibility = 0.5): KeyJointPositions {
  const joints: KeyJointPositions = {};
  for (const name of Object.keys(KEY_JOINTS) as KeyJointName[]) {
    const landmark = pose.landmarks[KEY_JOINTS[name]];
    if (landmark && landmark.visibility >= minVisibility) {
      joints[name] = [landmark.x, landmark.y];
    }
  }
  return joints;
}

/**
 * Pairs of MediaPipe landmarks that are the same body part on the left and
 * right side (left eye / right eye, left shoulder / right shoulder, ...).
 * The nose (0) is in the middle and has no pair.
 */
export const LEFT_RIGHT_PAIRS: [number, number][] = [
  [1, 4], [2, 5], [3, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16],
  [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
];

/**
 * The mirror image of a pose: flip it left-to-right (x becomes 1 - x) AND
 * swap the left/right labels, so it is a proper pose of a person again (a
 * person in a mirror raises their right hand when you raise your left).
 */
export function mirrorPose(pose: DetectedPose): DetectedPose {
  const flipped = pose.landmarks.map((landmark) => ({ ...landmark, x: 1 - landmark.x }));
  const swapped = [...flipped];
  for (const [left, right] of LEFT_RIGHT_PAIRS) {
    swapped[left] = flipped[right];
    swapped[right] = flipped[left];
  }
  return { ...pose, landmarks: swapped };
}
