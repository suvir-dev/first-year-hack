// config.ts
// ---------------------------------------------------------------------------
// Every URL the app downloads MediaPipe files from lives in this one file.
//
// By default we load everything from the official MediaPipe CDNs.
// If the Wi-Fi is bad at the venue, download the files once (see the README,
// "If the Wi-Fi fails") and flip USE_LOCAL_FILES to true. Nothing else in the
// code needs to change.
// ---------------------------------------------------------------------------

/** Set to true to load the files from public/mediapipe/ instead of the internet. */
export const USE_LOCAL_FILES = false;

/**
 * The @mediapipe/tasks-vision version. Keep this equal to the version in
 * package.json so the JavaScript and the WASM files always match.
 */
const MEDIAPIPE_VERSION = "1.2.3";

// --- Online (CDN) locations -------------------------------------------------

const CDN_WASM_FOLDER = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;

const CDN_POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Note: Google publishes the selfie model as a .tflite file (not .task).
// ImageSegmenter loads it the same way.
const CDN_SELFIE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

// --- Offline (local) locations ----------------------------------------------
// Files in the public/ folder are served from the site root, so
// public/mediapipe/wasm becomes "/mediapipe/wasm".

const LOCAL_WASM_FOLDER = "/mediapipe/wasm";
const LOCAL_POSE_MODEL = "/mediapipe/pose_landmarker_lite.task";
const LOCAL_SELFIE_MODEL = "/mediapipe/selfie_segmenter.tflite";

// --- What the rest of the app uses ------------------------------------------

/** Folder that holds MediaPipe's .wasm and loader .js files. */
export const WASM_FOLDER_URL = USE_LOCAL_FILES ? LOCAL_WASM_FOLDER : CDN_WASM_FOLDER;

/** Body pose model (33 landmarks per person). "lite" is the fastest version. */
export const POSE_MODEL_URL = USE_LOCAL_FILES ? LOCAL_POSE_MODEL : CDN_POSE_MODEL;

/** Selfie segmentation model: separates the person from the background. */
export const SELFIE_MODEL_URL = USE_LOCAL_FILES ? LOCAL_SELFIE_MODEL : CDN_SELFIE_MODEL;

// --- Webcam view ------------------------------------------------------------

/**
 * Show the webcam like a mirror (selfie view): raise your right hand and the
 * hand on the right of the screen goes up. Drawing, the 2-player left/right
 * order and the hints all follow this setting.
 */
export const MIRROR_WEBCAM = true;
