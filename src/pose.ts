// pose.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Wraps MediaPipe's PoseLandmarker. It finds a person in a video frame and
// returns 33 body landmarks (nose, shoulders, elbows, wrists, hips, knees...).
//
// Landmark list and numbering:
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { POSE_MODEL_URL, WASM_FOLDER_URL } from "./config";

/**
 * One detected body: an array of 33 landmarks.
 * Each landmark has x and y between 0 and 1 (fractions of the image width and
 * height, measured from the top-left corner), a depth z, and a `visibility`
 * score between 0 and 1.
 */
export type PoseLandmarks = NormalizedLandmark[];

/**
 * A pose together with the shape of the image it was found in.
 *
 * Why the shape matters: x is a fraction of the image WIDTH and y is a
 * fraction of the image HEIGHT. On a 16:9 webcam those are different
 * lengths, so a 45° arm would look like a 29° arm if we used x and y
 * directly. scoring.ts multiplies x by aspectRatio to undo this.
 */
export interface DetectedPose {
  landmarks: PoseLandmarks;
  /** Image width divided by image height, e.g. 1280 / 720 = 1.78. */
  aspectRatio: number;
}

/**
 * The 12 body points the score uses, and their MediaPipe landmark numbers.
 * "left" and "right" mean the PERSON's left and right: for someone facing
 * you, their left shoulder is on YOUR right.
 */
export const KEY_JOINTS = {
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
 * Every landmark that isn't given gets visibility 0, so scoring.ts ignores it.
 *
 * @param aspectRatio the painting image's width ÷ height
 * @param joints      where each visible key joint is
 */
export function poseFromKeyJoints(aspectRatio: number, joints: KeyJointPositions): DetectedPose {
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
  return { landmarks, aspectRatio };
}

/** Pairs of landmark indexes to join with lines when drawing a skeleton. */
export const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS;

/** Created once by loadPoseModel(), then reused for every frame. */
let landmarker: PoseLandmarker | null = null;

/**
 * Download the WASM runtime and the pose model, and get PoseLandmarker ready.
 * Call this once before detect(). It takes a few seconds the first time.
 */
export async function loadPoseModel(): Promise<void> {
  if (landmarker) return; // already loaded

  const vision = await FilesetResolver.forVisionTasks(WASM_FOLDER_URL);

  // Try the graphics card (GPU) first because it is much faster.
  // Some laptops/browsers don't support it, so fall back to the CPU.
  try {
    landmarker = await createLandmarker(vision, "GPU");
  } catch (error) {
    console.warn("GPU pose detection failed, using CPU instead.", error);
    landmarker = await createLandmarker(vision, "CPU");
  }
}

function createLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: "GPU" | "CPU",
): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
    runningMode: "VIDEO", // we call it on many frames in a row
    numPoses: 1, // only track one person
  });
}

/**
 * Find the pose in one video frame.
 * Returns the person's 33 landmarks plus the frame's aspect ratio, or null if
 * nobody was found (or the model hasn't finished loading).
 */
export function detect(videoFrame: HTMLVideoElement): DetectedPose | null {
  if (!landmarker) return null;

  // In VIDEO mode MediaPipe needs a timestamp (in ms) that always increases.
  const result = landmarker.detectForVideo(videoFrame, performance.now());

  // result.landmarks has one entry per person. We asked for at most one.
  const landmarks = result.landmarks[0];
  if (!landmarks) return null;

  return {
    landmarks,
    aspectRatio: videoFrame.videoWidth / videoFrame.videoHeight,
  };
}

/**
 * Read the key joints back out of a detected pose (the opposite of
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
