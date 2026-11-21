// pose.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Wraps MediaPipe's PoseLandmarker. It finds a person in a video frame and
// returns 33 body landmarks (nose, shoulders, elbows, wrists, hips, knees...).
//
// Landmark list and numbering:
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
// ---------------------------------------------------------------------------

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSE_MODEL_URL, WASM_FOLDER_URL } from "./config";
import type { DetectedPose } from "./landmarks";

// The pose data types and helpers (DetectedPose, KEY_JOINTS, mirrorPose...)
// live in landmarks.ts. Re-export them so other files can keep importing
// them from "./pose".
export * from "./landmarks";

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

/** How many people the model looks for right now. */
let maxPeople = 1;

/**
 * Look for 1 person (faster) or 2 people (2-player mode).
 * Changing this rebuilds MediaPipe's pipeline, so only call it when the
 * number actually changes.
 */
export async function setMaxPeople(count: 1 | 2): Promise<void> {
  if (!landmarker || count === maxPeople) return;
  await landmarker.setOptions({ numPoses: count });
  maxPeople = count;
}

/**
 * Find everybody's pose in one video frame (at most setMaxPeople() people).
 * Returns one DetectedPose per person found: an empty array if nobody was
 * found, the model hasn't loaded yet, or the video has no picture yet.
 */
export function detectAll(videoFrame: HTMLVideoElement): DetectedPose[] {
  // readyState < 2 means the video has no frame to look at (e.g. while
  // switching cameras), and MediaPipe would throw an error.
  if (!landmarker || videoFrame.readyState < 2 || videoFrame.videoWidth === 0) return [];

  // In VIDEO mode MediaPipe needs a timestamp (in ms) that always increases.
  const result = landmarker.detectForVideo(videoFrame, performance.now());

  // result.landmarks has one entry per person found. Remember the video's
  // size in pixels so scoring can convert the 0–1 numbers to real pixels.
  return result.landmarks.map((landmarks) => ({
    landmarks,
    width: videoFrame.videoWidth,
    height: videoFrame.videoHeight,
  }));
}

/** Find one person's pose (the first one found), or null. */
export function detect(videoFrame: HTMLVideoElement): DetectedPose | null {
  return detectAll(videoFrame)[0] ?? null;
}
