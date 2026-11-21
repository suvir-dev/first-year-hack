// players.test.ts: sanity checks for 2-player mode. Run with: npm test

import { describe, expect, it } from "vitest";
import type { DetectedPose } from "./pose";
import { pickWinner, PlayerTracker, screenX } from "./players";

/**
 * A fake pose standing at camera-image position x (0..1). The screen is
 * mirrored, so it appears on screen at 1 - x.
 */
function personAtCameraX(x: number): DetectedPose {
  const landmarks = Array.from({ length: 33 }, () => ({ x, y: 0.5, z: 0, visibility: 1 }));
  return { landmarks, aspectRatio: 16 / 9 };
}

/** A fake pose that appears at screen position x. */
const personOnScreenAt = (x: number) => personAtCameraX(1 - x);

describe("screenX", () => {
  it("mirrors the camera x", () => {
    expect(screenX(personAtCameraX(0.2))).toBeCloseTo(0.8);
  });
});

describe("PlayerTracker", () => {
  it("makes the person on the left of the screen Player 1", () => {
    const left = personOnScreenAt(0.25);
    const right = personOnScreenAt(0.75);
    const tracker = new PlayerTracker();
    // MediaPipe may list them in either order.
    expect(tracker.assign([right, left])).toEqual([left, right]);
  });

  it("keeps the labels when people move a little and MediaPipe lists them in another order", () => {
    const tracker = new PlayerTracker();
    tracker.assign([personOnScreenAt(0.3), personOnScreenAt(0.7)]);
    // Next frames: both step towards the middle, listed in swapped order.
    const p1 = personOnScreenAt(0.4);
    const p2 = personOnScreenAt(0.62);
    expect(tracker.assign([p2, p1])).toEqual([p1, p2]);
    const p1Later = personOnScreenAt(0.46);
    const p2Later = personOnScreenAt(0.57);
    expect(tracker.assign([p1Later, p2Later])).toEqual([p1Later, p2Later]);
  });

  it("gives a lone person to the player who was last seen nearest", () => {
    const tracker = new PlayerTracker();
    tracker.assign([personOnScreenAt(0.3), personOnScreenAt(0.7)]);
    const onlyRightOne = personOnScreenAt(0.68);
    expect(tracker.assign([onlyRightOne])).toEqual([null, onlyRightOne]);
  });
});

describe("pickWinner", () => {
  it("picks the higher score", () => {
    expect(pickWinner([80, 60])).toBe(0);
    expect(pickWinner([55, 90])).toBe(1);
  });

  it("calls it a draw within 2 points", () => {
    expect(pickWinner([80, 78])).toBeNull();
  });

  it("a player who was never seen loses", () => {
    expect(pickWinner([null, 10])).toBe(1);
  });
});
