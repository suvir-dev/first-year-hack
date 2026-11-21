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

// TODO (Person A): the paintings need target poses. One option is a
// detectImage(img: HTMLImageElement) function that switches the landmarker to
// runningMode "IMAGE" with landmarker.setOptions(...), runs .detect(img), and
// switches back to "VIDEO". Paintings are not photos, so check the result
// visually. For some paintings it is easier to pose like the painting
// yourself: on the challenge screen, press T to record your current pose as
// the target (main.ts logs it to the console so it can be pasted into
// paintings.ts).
