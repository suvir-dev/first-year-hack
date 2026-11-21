// hints.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Turns a score into ONE tip in plain words, e.g. "Raise your right arm
// higher", for the feature that costs the most points right now.
//
// The tricky part is left and right. Two flips can be involved:
//   - the webcam is shown like a mirror (MIRROR_WEBCAM in config.ts), and
//   - the score may have used the mirror image of your pose (score.mirrored)
//     because you copied the painting like a mirror.
// We undo both so "left" always means YOUR left.
// ---------------------------------------------------------------------------

import { MIRROR_WEBCAM } from "./config";
import type { FeatureResult, PoseScore } from "./scoring";

/** If every feature scores at least this, we just say "hold it". */
const GOOD_ENOUGH = 85;

/** One tip for the player, based on their worst feature. */
export function hintFor(score: PoseScore, mirrorView = MIRROR_WEBCAM): string {
  if (!score.inFrame) return "Step back: we can't see your whole pose";

  // Worst feature = the one losing the most weighted points.
  const worst = [...score.features].sort(
    (a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score),
  )[0];
  if (!worst || worst.score >= GOOD_ENOUGH) return "Looking great, now hold it!";

  const side = playersSide(worst, score.mirrored);
  if (!worst.seen) return `Make sure the camera can see your ${side}${bodyPart(worst.name)}`.trim();

  if (worst.playerAngle === null) return "";
  return worst.name.endsWith("Elbow") || worst.name.endsWith("Knee") ||
    worst.name.endsWith("Shoulder") || worst.name.endsWith("Hip")
    ? jointHint(worst, side, worst.playerAngle)
    : directionHint(worst, side, worst.playerAngle, score.mirrored, mirrorView);
}

/** "left " / "right " for the PLAYER's real limb, or "" for torso/head. */
function playersSide(feature: FeatureResult, mirrored: boolean): string {
  const side = feature.name.startsWith("left") ? "left" : feature.name.startsWith("right") ? "right" : "";
  if (!side) return "";
  // In the mirrored version your left arm was compared as the painting's
  // right arm, so swap back to your real side.
  const real = mirrored ? (side === "left" ? "right" : "left") : side;
  return `${real} `;
}

/** "arm", "leg", "body" or "head" for a feature. */
function bodyPart(name: string): string {
  if (/UpperArm|Forearm|Elbow|Shoulder/.test(name)) return "arm";
  if (/Thigh|Shin|Hip|Knee/.test(name)) return "leg";
  return name === "torso" ? "body" : "head";
}

/** Joint angles: bend or straighten (or raise/lower for shoulders and hips). */
function jointHint(feature: FeatureResult, side: string, playerAngle: number): string {
  const tooSmall = playerAngle < feature.targetAngle; // joint more bent than the painting
  if (feature.name.endsWith("Elbow")) return tooSmall ? `Straighten your ${side}elbow` : `Bend your ${side}elbow more`;
  if (feature.name.endsWith("Knee")) return tooSmall ? `Straighten your ${side}knee` : `Bend your ${side}knee more`;
  // Shoulder angle (hip-shoulder-elbow) grows as the arm is raised.
  if (feature.name.endsWith("Shoulder")) return tooSmall ? `Raise your ${side}arm higher` : `Lower your ${side}arm`;
  // Hip angle (shoulder-hip-knee) shrinks as the knee is lifted.
  return tooSmall ? `Lower your ${side}knee` : `Lift your ${side}knee higher`;
}

/** Words for moving each kind of limb up, down or sideways. */
function directionWords(name: string, side: string): { up: string; down: string; sideways: string } {
  if (name.endsWith("UpperArm")) return { up: `Raise your ${side}arm higher`, down: `Lower your ${side}arm`, sideways: `Swing your ${side}arm to your` };
  if (name.endsWith("Forearm")) return { up: `Lift your ${side}hand higher`, down: `Lower your ${side}hand`, sideways: `Move your ${side}hand to your` };
  if (name.endsWith("Thigh")) return { up: `Lift your ${side}knee higher`, down: `Lower your ${side}knee`, sideways: `Move your ${side}knee to your` };
  if (name.endsWith("Shin")) return { up: `Lift your ${side}foot higher`, down: `Lower your ${side}foot`, sideways: `Move your ${side}foot to your` };
  if (name === "torso") return { up: "Stand up straighter", down: "Lean further over", sideways: "Lean your body to your" };
  return { up: "Lift your head up", down: "Lower your head", sideways: "Tilt your head to your" };
}

/** Limb directions: which way should the limb move ON SCREEN? */
function directionHint(
  feature: FeatureResult,
  side: string,
  playerAngle: number,
  mirrored: boolean,
  mirrorView: boolean,
): string {
  // Both angles are in "comparison space": the camera picture, flipped if
  // the mirrored version was used. The screen shows the camera picture
  // flipped if mirrorView is on. If exactly one of those flips happened, we
  // must flip once more to get what the player sees on screen.
  const flip = mirrored !== mirrorView;
  const toScreen = (angle: number) => (flip ? 180 - angle : angle); // flip left-right
  const now = unitVector(toScreen(playerAngle));
  const wanted = unitVector(toScreen(feature.targetAngle));

  const words = directionWords(feature.name, side);
  const dx = wanted.x - now.x;
  const dy = wanted.y - now.y; // screen y grows DOWNWARDS

  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? words.up : words.down;
  // Sideways. On a mirror view the screen's left is the player's own left.
  const screenLeft = dx < 0;
  const yourSide = screenLeft === mirrorView ? "left" : "right";
  return `${words.sideways} ${yourSide}`;
}

function unitVector(degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}
