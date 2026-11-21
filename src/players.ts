// players.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// 2-player mode: which detected body belongs to which player?
//
// MediaPipe gives us up to 2 poses per frame, but in no particular order:
// the first pose might be the left person in one frame and the right person
// in the next. So we decide ourselves:
//
//   1. The FIRST time we see two people, whoever is on the LEFT of the
//      screen is Player 1 and whoever is on the right is Player 2.
//   2. After that, each new pose goes to the player who was CLOSEST to it in
//      the previous frame. People only move a little between frames, so the
//      labels stay stuck to the right person, even if they step around.
// ---------------------------------------------------------------------------

import type { DetectedPose } from "./pose";

export interface Player {
  name: string;
  /** Colour of this player's skeleton and name tag. */
  colour: string;
}

/** Gold for Player 1, teal for Player 2. */
export const PLAYER_COLOURS = ["#f5c542", "#2ec4b6"];

// Shoulders (11, 12) and hips (23, 24): the steadiest parts of the body.
const BODY_CENTRE_POINTS = [11, 12, 23, 24];

/**
 * Where a person is across the screen, from 0 (left edge) to 1 (right edge),
 * using the average x of their visible shoulders and hips.
 *
 * The webcam picture is shown mirrored (like a mirror), so a point at x on
 * the camera image appears at 1 - x on screen.
 */
export function screenX(pose: DetectedPose): number | null {
  const xs = BODY_CENTRE_POINTS.map((index) => pose.landmarks[index])
    .filter((landmark) => landmark && landmark.visibility > 0.5)
    .map((landmark) => 1 - landmark.x);
  if (xs.length === 0) return null;
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

/** Remembers where each player was, so labels don't swap between frames. */
export class PlayerTracker {
  /** Last known screen x of Player 1 and Player 2 (null = not seen yet). */
  private lastX: (number | null)[] = [null, null];

  /** Forget everything (call at the start of each round). */
  reset(): void {
    this.lastX = [null, null];
  }

  /**
   * Give each detected pose to a player.
   * @returns [Player 1's pose, Player 2's pose]; null where that player
   *          wasn't found in this frame
   */
  assign(poses: DetectedPose[]): (DetectedPose | null)[] {
    // Only keep poses we can locate on screen.
    const people = poses
      .map((pose) => ({ pose, x: screenX(pose) }))
      .filter((person): person is { pose: DetectedPose; x: number } => person.x !== null)
      .slice(0, 2);

    const result: (DetectedPose | null)[] = [null, null];

    if (people.length === 2) {
      const [a, b] = people;
      let aIsPlayer1: boolean;
      if (this.lastX[0] !== null && this.lastX[1] !== null) {
        // Compare "a = P1, b = P2" with the swapped version: which one moves
        // the players less since last frame?
        const keep = Math.abs(a.x - this.lastX[0]) + Math.abs(b.x - this.lastX[1]);
        const swap = Math.abs(b.x - this.lastX[0]) + Math.abs(a.x - this.lastX[1]);
        aIsPlayer1 = keep <= swap;
      } else {
        // First time we see both: the one on the left is Player 1.
        aIsPlayer1 = a.x <= b.x;
      }
      const [p1, p2] = aIsPlayer1 ? [a, b] : [b, a];
      result[0] = p1.pose;
      result[1] = p2.pose;
      this.lastX = [p1.x, p2.x];
    } else if (people.length === 1) {
      const person = people[0];
      // Give it to whichever player was last seen closest to this spot.
      // If we have no history, use the side of the screen it's on.
      const distance = (last: number | null, side: number) =>
        last === null ? Math.abs(person.x - side) : Math.abs(person.x - last);
      const index = distance(this.lastX[0], 0.25) <= distance(this.lastX[1], 0.75) ? 0 : 1;
      result[index] = person.pose;
      this.lastX[index] = person.x;
    }
    return result;
  }
}

/**
 * Who won? Returns the index of the winner (0 or 1), or null for a draw.
 * Scores within 2 points of each other count as a draw. A player with no
 * score (never seen) loses to a player with one.
 */
export function pickWinner(scores: (number | null)[]): number | null {
  const [a, b] = scores;
  if (a === null && b === null) return null;
  if (a === null) return 1;
  if (b === null) return 0;
  if (Math.abs(a - b) <= 2) return null;
  return a > b ? 0 : 1;
}

/** "Ana wins!" or "Draw!" */
export function winnerText(players: Player[], scores: (number | null)[]): string {
  const winner = pickWinner(scores);
  return winner === null ? "Draw!" : `${players[winner].name} wins!`;
}
