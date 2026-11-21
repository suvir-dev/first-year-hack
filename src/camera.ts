// camera.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Starts and stops the webcam and shows it in a <video> element.
//
// Browsers only allow camera access on "secure" pages: https:// or
// http://localhost. `npm run dev` serves on localhost, so it works.
// It will NOT work if you open the page as http://192.168.x.x from another
// device.
// ---------------------------------------------------------------------------

/** The stream we got from the browser, so we can stop it later. */
let currentStream: MediaStream | null = null;

/**
 * Ask for the webcam and play it in the given <video> element.
 * Resolves once the video is playing, so its width/height are known.
 * Throws an Error with a readable message if the camera can't be used.
 */
export async function startCamera(video: HTMLVideoElement): Promise<void> {
  // navigator.mediaDevices is undefined on pages that are not secure.
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Camera is not available. Open the app at http://localhost (not an IP address) in Chrome, Edge or Firefox.",
    );
  }

  // Ask for the front camera at a medium resolution (faster to process).
  currentStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, facingMode: "user" },
    audio: false,
  });

  video.srcObject = currentStream;
  video.muted = true; // muted + playsInline lets the video autoplay everywhere
  video.playsInline = true;
  await video.play();
}

/** Turn the webcam off (the camera light should go out). */
export function stopCamera(video: HTMLVideoElement): void {
  if (currentStream) {
    // A stream can have several tracks (video, audio). Stop each one.
    for (const track of currentStream.getTracks()) {
      track.stop();
    }
    currentStream = null;
  }
  video.srcObject = null;
}
