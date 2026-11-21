// scoring.test.ts
// ---------------------------------------------------------------------------
// Sanity checks for scoring.ts. Run them with:  npm test
//
// We don't need a webcam for these: we build fake poses by hand from a few
// (x, y) points and check that the scores make sense.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import type { DetectedPose } from "./pose";
import { angleAt, jointScore, scorePose, ScoreSmoother } from "./scoring";

type Point = [x: number, y: number];

/**
 * Build a fake 33-landmark pose from the points we care about.
 * Points are given in "picture units" on a picture `width` wide and `height`
 * tall; we divide by the size, just like MediaPipe's 0..1 coordinates.
 * Landmarks not listed sit in the middle with visibility 1.
 */
function makePose(points: Record<number, Point>, width = 1, height = 1): DetectedPose {
  const landmarks = Array.from({ length: 33 }, (_, index) => {
    const [x, y] = points[index] ?? [width / 2, height / 2];
    return { x: x / width, y: y / height, z: 0, visibility: 1 };
  });
  return { landmarks, aspectRatio: width / height };
}

// Standing up straight, arms hanging down. (y grows downwards, like on a
// screen. The person's LEFT side appears on the RIGHT of the image.)
const STANDING: Record<number, Point> = {
  11: [0.6, 0.25], 12: [0.4, 0.25], // shoulders
  13: [0.65, 0.4], 14: [0.35, 0.4], // elbows
  15: [0.67, 0.55], 16: [0.33, 0.55], // wrists
  23: [0.56, 0.55], 24: [0.44, 0.55], // hips
  25: [0.57, 0.75], 26: [0.43, 0.75], // knees
  27: [0.57, 0.95], 28: [0.43, 0.95], // ankles
};

// Arms straight up in the air, deep squat.
const ARMS_UP_SQUAT: Record<number, Point> = {
  ...STANDING,
  13: [0.6, 0.1], 14: [0.4, 0.1],
  15: [0.6, -0.05], 16: [0.4, -0.05],
  25: [0.7, 0.65], 26: [0.3, 0.65],
  27: [0.6, 0.85], 28: [0.4, 0.85],
};

// Only the LEFT arm raised straight out to the side.
const LEFT_ARM_OUT: Record<number, Point> = {
  ...STANDING,
  13: [0.75, 0.25], 15: [0.9, 0.25],
};

// The same pose seen in a mirror: flip x, and left/right swap names.
function mirror(points: Record<number, Point>): Record<number, Point> {
  const swap: Record<number, number> = {
    11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15,
    23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27,
  };
  const result: Record<number, Point> = {};
  for (const [index, [x, y]] of Object.entries(points)) {
    result[swap[Number(index)] ?? Number(index)] = [1 - x, y];
  }
  return result;
}

describe("angleAt", () => {
  it("measures a right angle as 90°", () => {
    expect(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, 1)).toBeCloseTo(90);
  });

  it("measures a straight line as 180°", () => {
    expect(angleAt({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, 1)).toBeCloseTo(180);
  });
});

describe("jointScore", () => {
  it("gives 100 for a perfect match, 50 at 30° and 0 at 60° or more", () => {
    expect(jointScore(0)).toBe(100);
    expect(jointScore(30)).toBe(50);
    expect(jointScore(60)).toBe(0);
    expect(jointScore(120)).toBe(0);
  });
});

describe("scorePose", () => {
  it("gives 100 for an identical pose", () => {
    const result = scorePose(makePose(STANDING), makePose(STANDING));
    expect(result.overall).toBe(100);
    expect(Object.keys(result.joints)).toHaveLength(8);
  });

  it("gives a low score for a very different pose", () => {
    const result = scorePose(makePose(ARMS_UP_SQUAT), makePose(STANDING));
    expect(result.overall).toBeLessThan(30);
  });

  it("doesn't care how far away or where in the picture you are", () => {
    // Shrink the pose to half size and move it to the top-left corner.
    const smallAndMoved: Record<number, Point> = {};
    for (const [index, [x, y]] of Object.entries(STANDING)) {
      smallAndMoved[Number(index)] = [x * 0.5 + 0.05, y * 0.5 + 0.1];
    }
    const result = scorePose(makePose(smallAndMoved), makePose(STANDING));
    expect(result.overall).toBe(100);
  });

  it("gives the same score whatever the image shape (16:9 webcam vs square painting)", () => {
    // The same body, measured in a 16:9 picture and in a square picture.
    const wide = makePose(LEFT_ARM_OUT, 16 / 9, 1);
    const square = makePose(LEFT_ARM_OUT, 1, 1);
    expect(scorePose(wide, square).overall).toBe(100);
  });

  it("accepts the mirror image of the pose", () => {
    const result = scorePose(makePose(LEFT_ARM_OUT), makePose(mirror(LEFT_ARM_OUT)));
    expect(result.overall).toBe(100);
  });

  it("skips joints the player's camera can't see", () => {
    const player = makePose(STANDING);
    // Legs out of shot: knees and ankles not visible.
    for (const index of [25, 26, 27, 28]) player.landmarks[index].visibility = 0.1;

    const result = scorePose(player, makePose(STANDING));
    // Only elbows and shoulders are left (hips need the knees, knees need the ankles).
    expect(Object.keys(result.joints).sort()).toEqual(
      ["leftElbow", "leftShoulder", "rightElbow", "rightShoulder"],
    );
    expect(result.overall).toBe(100);
  });

  it("returns null when no joint can be compared", () => {
    const player = makePose(STANDING);
    for (const landmark of player.landmarks) landmark.visibility = 0;
    expect(scorePose(player, makePose(STANDING)).overall).toBeNull();
  });
});

describe("ScoreSmoother", () => {
  it("averages the last few scores", () => {
    const smoother = new ScoreSmoother(3);
    expect(smoother.add(30)).toBe(30);
    expect(smoother.add(60)).toBe(45);
    expect(smoother.add(90)).toBe(60);
    // The 30 is forgotten now: average of 60, 90, 90.
    expect(smoother.add(90)).toBe(80);
  });

  it("starts fresh after reset()", () => {
    const smoother = new ScoreSmoother(3);
    smoother.add(10);
    smoother.reset();
    expect(smoother.add(70)).toBe(70);
  });
});
