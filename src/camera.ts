// camera.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Everything about the webcam:
//   - start / stop / switch camera
//   - list all cameras (built-in, USB, iPhone via Continuity Camera, Camo...)
//   - remember the chosen camera between visits (localStorage)
//   - notice when a camera is plugged in or unplugged
//   - turn camera errors into friendly messages
//
// Browsers only allow camera access on "secure" pages: https:// or
// http://localhost. `npm run dev` serves on localhost, so it works.
// ---------------------------------------------------------------------------

/** The stream we got from the browser, so we can stop it later. */
let currentStream: MediaStream | null = null;

const STORAGE_KEY = "strike-a-pose.camera";

// --- Remembering the chosen camera ------------------------------------------
// localStorage can throw (private windows, blocked storage), so every access
// is wrapped in try/catch. If it fails we simply don't remember.

function rememberCamera(deviceId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, deviceId);
  } catch {
    // ignore: remembering is just a convenience
  }
}

function rememberedCamera(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// --- Starting and stopping -----------------------------------------------------

/**
 * Start a camera and play it in the <video> element.
 *
 * @param deviceId which camera to use. Leave it out to use the remembered
 *                 camera if it's still connected, otherwise the default.
 * @returns the id of the camera that is actually running
 * @throws  an Error with a friendly message if no camera can be used
 */
export async function startCamera(video: HTMLVideoElement, deviceId?: string): Promise<string> {
  // navigator.mediaDevices is undefined on pages that are not secure.
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera is not available here. Open the app at http://localhost (not an IP address) in Chrome, Edge or Firefox.",
    );
  }

  // Which camera do we want? An explicit choice, else the remembered one if
  // it's still plugged in.
  let wanted = deviceId;
  if (!wanted) {
    const saved = rememberedCamera();
    const cameras = await listCameras();
    if (saved && cameras.some((camera) => camera.deviceId === saved)) wanted = saved;
  }

  // Stop the old stream first: many cameras can only be opened once.
  stopCamera(video);

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints(wanted), audio: false });
  } catch (error) {
    // The chosen camera might have been unplugged: try the default instead.
    if (wanted && isMissingCameraError(error)) {
      stream = await getDefaultStream();
    } else {
      throw new Error(friendlyCameraError(error));
    }
  }

  currentStream = stream;
  video.srcObject = stream;
  video.muted = true; // muted + playsInline lets the video autoplay everywhere
  video.playsInline = true;
  await video.play();

  const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
  if (activeId) rememberCamera(activeId);
  return activeId;
}

/** What we ask the browser for: a 1280x720 picture from one camera (or any). */
function videoConstraints(deviceId?: string): MediaTrackConstraints {
  return deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
    : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } };
}

async function getDefaultStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: videoConstraints(), audio: false });
  } catch (error) {
    throw new Error(friendlyCameraError(error));
  }
}

/** Turn the webcam off (the camera light should go out). */
export function stopCamera(video: HTMLVideoElement): void {
  if (currentStream) {
    // A stream can have several tracks (video, audio). Stop each one.
    for (const track of currentStream.getTracks()) track.stop();
    currentStream = null;
  }
  video.srcObject = null;
}

/** The id of the camera that is running right now ("" if none). */
export function activeCameraId(): string {
  return currentStream?.getVideoTracks()[0]?.getSettings().deviceId ?? "";
}

// --- Listing cameras -----------------------------------------------------------

/**
 * All cameras the computer knows about. Their names (labels) are empty until
 * the user has allowed camera access once, so call this AFTER startCamera().
 */
export async function listCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

/** Call `onChange` whenever a camera is plugged in or unplugged. */
export function watchCameras(onChange: () => void): void {
  if (!navigator.mediaDevices) return;
  navigator.mediaDevices.ondevicechange = onChange;
}

// --- Friendly error messages -------------------------------------------------------

function isMissingCameraError(error: unknown): boolean {
  const name = (error as DOMException)?.name;
  return name === "NotFoundError" || name === "OverconstrainedError";
}

/** Explain a getUserMedia error in plain words. */
function friendlyCameraError(error: unknown): string {
  const name = (error as DOMException)?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Click the camera icon in the address bar, choose \"Allow\", then press Try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera found. Plug in a webcam (or connect your phone) and press Try again.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera is busy. Close other apps that use it (Zoom, FaceTime, Teams…) and press Try again.";
    default:
      return `The camera could not start (${(error as Error)?.message ?? error}).`;
  }
}
