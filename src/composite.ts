// composite.ts  (owner: Person B)
// ---------------------------------------------------------------------------
// Builds the final picture: the player's photo with the background removed,
// inside an ornate gold ("gilt") frame, with the caption
// "You, after <Artist>".
//
// STUB: for now it only copies the photo and writes the caption under it.
// ---------------------------------------------------------------------------

import type { Painting } from "./paintings";

/**
 * Make the framed result image.
 *
 * @param photo    the webcam snapshot taken at the end of the countdown
 *                 (main.ts draws the video into a canvas and passes it here)
 * @param painting the painting the player was copying
 * @returns a new canvas with the finished picture, ready to show or download
 */
export async function createFramedResult(
  photo: HTMLCanvasElement,
  painting: Painting,
): Promise<HTMLCanvasElement> {
  // TODO (Person B): replace this stub. Suggested steps:
  //
  // 1. Load the segmenter once (like loadPoseModel() in pose.ts):
  //      import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
  //      import { SELFIE_MODEL_URL, WASM_FOLDER_URL } from "./config";
  //      const vision = await FilesetResolver.forVisionTasks(WASM_FOLDER_URL);
  //      const segmenter = await ImageSegmenter.createFromOptions(vision, {
  //        baseOptions: { modelAssetPath: SELFIE_MODEL_URL },
  //        runningMode: "IMAGE",
  //        outputConfidenceMasks: true,
  //      });
  //
  // 2. Remove the background:
  //      const result = segmenter.segment(photo);
  //      const mask = result.confidenceMasks![0].getAsFloat32Array();
  //    mask[i] is between 0 and 1 for pixel i: how sure the model is that the
  //    pixel is the person (check which way round it is by testing!). Use it
  //    as the alpha (transparency) of each pixel via getImageData /
  //    putImageData. Call result.close() afterwards to free memory.
  //
  // 3. Draw a background: a dark painterly colour, or the painting itself,
  //    blurred (ctx.filter = "blur(8px)").
  //
  // 4. Draw the cut-out person on top. Optional "old master" look:
  //    ctx.filter = "sepia(0.4) contrast(1.1)".
  //
  // 5. Draw the gilt frame around the edge: several strokeRect calls with a
  //    gold createLinearGradient, getting thinner towards the inside.
  //
  // 6. Draw the caption on a small plaque under the picture:
  //      `You, after ${painting.artist}`
  //    in a serif font such as "Georgia".

  const captionHeight = 60;
  const canvas = document.createElement("canvas");
  canvas.width = photo.width;
  canvas.height = photo.height + captionHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo, 0, 0);

  ctx.fillStyle = "#e8d9a8";
  ctx.font = "28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(`You, after ${painting.artist}`, canvas.width / 2, photo.height + 40);

  return canvas;
}
