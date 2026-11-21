// scoring.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Compares the player's pose with the painting's pose and gives a score.
// STUB: always returns 0 for now. main.ts already calls scorePose() every
// frame and shows the number, so once this works the score appears on screen
// without anyone touching main.ts.
// ---------------------------------------------------------------------------

import type { PoseLandmarks } from "./pose";

/**
 * How similar two poses are.
 *
 * @param player  landmarks detected on the webcam this frame (33 points)
 * @param target  landmarks of the painting's pose (33 points)
 * @returns a whole number from 0 (nothing alike) to 100 (identical pose)
 *
 * Must be fast (it runs about 30 times a second) and must not change its
 * inputs.
 */
export function scorePose(_player: PoseLandmarks, _target: PoseLandmarks): number {
  // TODO (Person A): implement. One simple plan:
  //
  // 1. Ignore position and size. The player can stand anywhere and be any
  //    distance from the camera. Move both poses so the middle of the hips
  //    (landmarks 23 and 24) is at (0, 0), then divide every x and y by the
  //    torso length (distance from mid-shoulders, 11 & 12, to mid-hips).
  //
  // 2. Compare joint angles, which ignore size completely. For example the
  //    angle at each elbow (shoulder-elbow-wrist: 11-13-15 and 12-14-16) and
  //    each shoulder (hip-shoulder-elbow: 23-11-13 and 24-12-14).
  //    Math.atan2 is handy for this.
  //
  // 3. Skip landmarks with low `visibility` (e.g. legs cut off in a portrait).
  //
  // 4. Turn the average difference into 0..100, e.g.
  //    score = 100 * (1 - averageAngleDifference / Math.PI), then clamp and
  //    Math.round it.
  //
  // Watch out: the webcam view is mirrored in main.ts, so "left" and "right"
  // may be swapped compared with the painting. Test with an asymmetric pose.
  return 0;
}
