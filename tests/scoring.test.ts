// scoring.test.ts: checks that the scoring is accurate and fair.
// Run with: npm test
//
// We don't need a webcam: we build poses by hand from a few points (in
// pixels) and check that the scores make sense.

import { describe, expect, it } from "vitest";
import { mirrorPose } from "../src/landmarks";
import type { DetectedPose } from "../src/landmarks";
import { paintings } from "../src/paintings";
import {
  angleDifference,
  featureScore,
  measureFeatures,
  prepareTarget,
  scorePose,
} from "../src/scoring";
import { hintFor } from "../src/hints";
import { BestHold, LandmarkSmoother, LiveScore } from "../src/smoothing";

type Point = [x: number, y: number];

/**
 * Build a 33-landmark pose from points given in PIXELS on a picture
 * `width` × `height`. Landmarks not listed are invisible.
 */
function makePose(points: Record<number, Point>, width = 1000, height = 1000, visibility = 1): DetectedPose {
  const landmarks = Array.from({ length: 33 }, (_, i) => {
    const point = points[i];
    return point
      ? { x: point[0] / width, y: point[1] / height, z: 0, visibility }
      : { x: 0, y: 0, z: 0, visibility: 0 };
  });
  return { landmarks, width, height };
}

/** Change some landmarks' visibility (e.g. to pretend arms are hidden). */
function withVisibility(pose: DetectedPose, numbers: number[], visibility: number): DetectedPose {
  const landmarks = pose.landmarks.map((l, i) => (numbers.includes(i) ? { ...l, visibility } : l));
  return { ...pose, landmarks };
}

// Standing straight, arms hanging down (pixels on a 1000×1000 picture,
// y grows downwards; the person's LEFT side is on the RIGHT of the picture).
const STANDING: Record<number, Point> = {
  0: [500, 120], // nose
  11: [600, 250], 12: [400, 250], // shoulders
  13: [650, 400], 14: [350, 400], // elbows
  15: [670, 550], 16: [330, 550], // wrists
  23: [560, 550], 24: [440, 550], // hips
  25: [570, 750], 26: [430, 750], // knees
  27: [570, 950], 28: [430, 950], // ankles
};

// Same, but the RIGHT arm (on the picture's left) points straight UP.
const RIGHT_ARM_UP: Record<number, Point> = { ...STANDING, 14: [400, 100], 16: [400, -50] };
// Same, but the right arm points straight DOWN.
const RIGHT_ARM_DOWN: Record<number, Point> = { ...STANDING, 14: [400, 400], 16: [400, 550] };
// Right arm straight out sideways.
const RIGHT_ARM_OUT: Record<number, Point> = { ...STANDING, 14: [250, 250], 16: [100, 250] };
// Right arm sloping down at 45°: "not high enough" compared with RIGHT_ARM_OUT.
const RIGHT_ARM_LOW: Record<number, Point> = { ...STANDING, 14: [294, 356], 16: [188, 462] };

// Arms up in the air and a deep squat.
const ARMS_UP_SQUAT: Record<number, Point> = {
  ...STANDING,
  13: [600, 100], 14: [400, 100], 15: [600, -50], 16: [400, -50],
  25: [700, 650], 26: [300, 650], 27: [600, 850], 28: [400, 850],
};

const ARMS_AND_HANDS = [13, 14, 15, 16];

describe("angle helpers", () => {
  it("uses the shortest way round", () => {
    expect(angleDifference(350, 10)).toBe(20);
    expect(angleDifference(-170, 170)).toBe(20);
    expect(angleDifference(90, -90)).toBe(180);
  });

  it("scores differences with a bell curve", () => {
    expect(featureScore(0, 25)).toBe(100);
    expect(featureScore(25, 25)).toBeCloseTo(36.8, 1); // e^-1
    expect(featureScore(5, 25)).toBeGreaterThan(95); // small wobbles barely matter
    expect(featureScore(50, 25)).toBeLessThan(2); // clearly wrong limbs drop off
  });

  it("measures in real pixels, so a 16:9 webcam doesn't squash angles", () => {
    // An upper arm going 100 px right and 100 px down = 45°, on a 1280×720 picture.
    const pose = makePose({ ...STANDING, 11: [600, 250], 13: [700, 350] }, 1280, 720);
    expect(measureFeatures(pose).leftUpperArm).toBeCloseTo(45);
  });
});

describe("scorePose: the required cases", () => {
  it("scores every painting's own target pose against itself as 100", () => {
    for (const painting of paintings) {
      if (!painting.targetPose) continue;
      const target = prepareTarget(painting.targetPose, painting);
      expect(scorePose(painting.targetPose, target).overall, painting.title).toBe(100);
    }
  });

  it("still scores ~100 when the pose is mirrored left/right", () => {
    for (const painting of paintings) {
      if (!painting.targetPose) continue;
      const target = prepareTarget(painting.targetPose, painting);
      const result = scorePose(mirrorPose(painting.targetPose), target);
      expect(result.overall, painting.title).toBeGreaterThanOrEqual(99);
      expect(result.mirrored).toBe(true);
    }
  });

  it("still scores ~100 for a smaller/bigger person anywhere in a 16:9 webcam picture", () => {
    for (const painting of paintings) {
      const pose = painting.targetPose;
      if (!pose) continue;
      const target = prepareTarget(pose, painting);
      // Put the same body (in pixels) into a 1280×720 webcam frame, at
      // different sizes and positions.
      for (const [scale, shiftX, shiftY] of [[0.2, 100, 50], [0.3, 600, 20], [0.4, 300, 0]]) {
        const landmarks = pose.landmarks.map((l) => ({
          ...l,
          x: (l.x * pose.width * scale + shiftX) / 1280,
          y: (l.y * pose.height * scale + shiftY) / 720,
        }));
        const result = scorePose({ landmarks, width: 1280, height: 720 }, target);
        expect(result.overall, `${painting.title} ×${scale}`).toBeGreaterThanOrEqual(99);
      }
    }
  });

  it("arm up vs arm down: same elbow angle, but a clearly lower score", () => {
    const target = prepareTarget(makePose(RIGHT_ARM_UP));
    const result = scorePose(makePose(RIGHT_ARM_DOWN), target);
    const feature = (name: string) => result.features.find((f) => f.name === name)!;

    // The elbow is straight in both, so the elbow angle alone can't tell...
    expect(feature("rightElbow").score).toBe(100);
    // ...but the limb directions can.
    expect(feature("rightUpperArm").score).toBeLessThan(5);
    expect(feature("rightForearm").score).toBeLessThan(5);
    expect(result.overall).toBeLessThan(85);
  });

  it("hiding your arms does NOT score higher than showing them in the wrong place", () => {
    const target = prepareTarget(makePose(ARMS_UP_SQUAT));
    const hidden = scorePose(withVisibility(makePose(ARMS_UP_SQUAT), ARMS_AND_HANDS, 0.1), target);
    const wrong = scorePose(makePose({ ...ARMS_UP_SQUAT, 13: [650, 400], 14: [350, 400], 15: [670, 550], 16: [330, 550] }), target);
    expect(hidden.overall).toBeLessThanOrEqual(wrong.overall);
    // ...and with the arms hidden we can't see enough of the pose to score it.
    expect(hidden.inFrame).toBe(false);
  });

  it("a completely different pose scores below 40", () => {
    const target = prepareTarget(makePose(STANDING));
    expect(scorePose(makePose(ARMS_UP_SQUAT), target).overall).toBeLessThan(40);
  });
});

describe("scorePose: other rules", () => {
  it("leaves the legs out entirely for upper-body-only paintings", () => {
    const target = prepareTarget(makePose(STANDING), { upperBodyOnly: true });
    const result = scorePose(makePose(STANDING), target);
    expect(result.features.some((f) => /Thigh|Shin|Hip|Knee/.test(f.name))).toBe(false);
    // Hidden legs don't matter for these paintings.
    expect(scorePose(withVisibility(makePose(STANDING), [25, 26, 27, 28], 0), target).overall).toBe(100);
  });

  it("hidden legs (e.g. sitting down) are left out: same score as visible, matching legs", () => {
    const target = prepareTarget(makePose(STANDING));
    const legsVisible = scorePose(makePose(STANDING), target);
    const legsHidden = scorePose(withVisibility(makePose(STANDING), [25, 26, 27, 28], 0), target);
    expect(legsHidden.overall).toBe(legsVisible.overall);
    expect(legsHidden.overall).toBe(100);
    expect(legsHidden.legsMissing).toBe(true); // ...so the app can suggest stepping back
    expect(legsVisible.legsMissing).toBe(false);
  });

  it("sitting behind a desk (hips hidden too) still scores the upper body well", () => {
    const target = prepareTarget(makePose(STANDING));
    const sitting = scorePose(withVisibility(makePose(STANDING), [23, 24, 25, 26, 27, 28], 0), target);
    expect(sitting.overall).toBeGreaterThanOrEqual(85);
    expect(sitting.inFrame).toBe(true);
  });

  it("signature limbs count double", () => {
    const plain = prepareTarget(makePose(RIGHT_ARM_UP));
    const signature = prepareTarget(makePose(RIGHT_ARM_UP), { signatureJoints: ["rightForearm"] });
    const weight = (t: typeof plain) => t.features.find((f) => f.feature.name === "rightForearm")!.weight;
    expect(weight(signature)).toBe(2 * weight(plain));
    // Getting the signature limb wrong hurts more.
    const wrongForearm = makePose({ ...RIGHT_ARM_UP, 16: [550, 100] });
    expect(scorePose(wrongForearm, signature).overall).toBeLessThan(scorePose(wrongForearm, plain).overall);
  });

  it("is more forgiving on easy than on hard", () => {
    const target = prepareTarget(makePose(RIGHT_ARM_OUT));
    const player = makePose(RIGHT_ARM_LOW);
    const easy = scorePose(player, target, { difficulty: "easy" }).overall;
    const hard = scorePose(player, target, { difficulty: "hard" }).overall;
    expect(easy).toBeGreaterThan(hard);
  });
});

describe("hints", () => {
  it("tells you to raise your arm when it's too low", () => {
    const target = prepareTarget(makePose(RIGHT_ARM_OUT));
    const result = scorePose(makePose(RIGHT_ARM_LOW), target);
    expect(result.mirrored).toBe(false);
    expect(hintFor(result)).toMatch(/right (arm|hand) higher/);
  });

  it("names YOUR left arm when you copied the painting like a mirror", () => {
    // The painting's figure holds its RIGHT arm out; the player, copying it
    // like a mirror, holds their LEFT arm out, but too low.
    const target = prepareTarget(makePose(RIGHT_ARM_OUT));
    const mirrorCopy = mirrorPose(makePose(RIGHT_ARM_LOW));
    const result = scorePose(mirrorCopy, target);
    expect(result.mirrored).toBe(true);
    expect(hintFor(result)).toMatch(/left (arm|hand) higher/);
  });

  it("asks you to step back when we can't see your arms", () => {
    const target = prepareTarget(makePose(STANDING));
    const result = scorePose(withVisibility(makePose(STANDING), ARMS_AND_HANDS, 0), target);
    expect(hintFor(result)).toMatch(/Step back/);
  });
});

describe("smoothing over time", () => {
  it("live score = average of the last half second", () => {
    const live = new LiveScore();
    live.add(0, 0);
    expect(live.add(100, 100)).toBe(50);
    // 700 ms later the first two samples are older than 0.5 s: forgotten.
    expect(live.add(80, 800)).toBe(80);
  });

  it("final score = best average over a continuous second", () => {
    const hold = new BestHold();
    // A lucky single frame of 100 doesn't count by itself...
    hold.add(100, 0);
    expect(hold.best()).toBeNull();
    // ...a full second of 80s does.
    for (let t = 33; t <= 1100; t += 33) hold.add(80, t);
    expect(hold.best()).toBeGreaterThanOrEqual(80);
    expect(hold.best()).toBeLessThan(90);
  });

  it("losing sight of the player breaks the continuous second", () => {
    const hold = new BestHold();
    for (let t = 0; t <= 600; t += 33) hold.add(90, t);
    hold.add(null, 633); // stepped out of frame
    for (let t = 666; t <= 1200; t += 33) hold.add(90, t);
    expect(hold.best()).toBeNull(); // never a full second in one go
  });

  it("landmark smoothing removes jitter", () => {
    const smoother = new LandmarkSmoother();
    const at = (x: number) => makePose({ ...STANDING, 15: [x, 550] });
    smoother.smooth(at(670));
    const smoothed = smoother.smooth(at(690)); // a 20 px wobble...
    expect(smoothed.landmarks[15].x * 1000).toBeCloseTo(680); // ...only moves 10 px
  });
});
