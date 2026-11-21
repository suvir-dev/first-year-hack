// smoothing.ts  (owner: Person A)
// ---------------------------------------------------------------------------
// Making the score steady over TIME.
//
// MediaPipe's points wobble a little every frame, even when you stand still.
// Three tools fix that:
//
//   1. LandmarkSmoother: smooths every body point before scoring, using an
//      "exponential moving average": new = old + 0.5 × (measured - old).
//      Each frame moves the point only halfway towards the new measurement,
//      so jitter cancels out but real movement still follows quickly.
//   2. LiveScore: the number on screen is the average of the last 0.5 s.
//   3. BestHold: the FINAL score of a round is the best average over any
//      1 continuous second. You have to actually HOLD the pose for a second;
//      one lucky frame isn't enough.
// ---------------------------------------------------------------------------

import type { DetectedPose, PoseLandmarks } from "./landmarks";

/** 0..1: how far each frame moves towards the new measurement (1 = no smoothing). */
export const LANDMARK_SMOOTHING = 0.5;
/** The live score averages this many milliseconds. */
export const LIVE_WINDOW_MS = 500;
/** The final score is the best average over this many milliseconds. */
export const HOLD_WINDOW_MS = 1000;

/** Smooths one person's landmarks from frame to frame. */
export class LandmarkSmoother {
  private previous: PoseLandmarks | null = null;

  /** Smooth a new pose (returns a new pose; the input isn't changed). */
  smooth(pose: DetectedPose): DetectedPose {
    const old = this.previous;
    const a = LANDMARK_SMOOTHING;
    const landmarks = pose.landmarks.map((point, i) => {
      const before = old?.[i];
      if (!before) return { ...point }; // first frame: nothing to smooth with
      return {
        ...point,
        x: before.x + a * (point.x - before.x),
        y: before.y + a * (point.y - before.y),
        z: before.z + a * (point.z - before.z),
        visibility: before.visibility + a * (point.visibility - before.visibility),
      };
    });
    this.previous = landmarks;
    return { ...pose, landmarks };
  }

  /** Forget the history, e.g. when the person left the picture. */
  reset(): void {
    this.previous = null;
  }
}

/** A list of (time, score) samples. */
type Sample = { time: number; score: number };

function average(samples: Sample[]): number {
  return samples.reduce((sum, sample) => sum + sample.score, 0) / samples.length;
}

/** The live score: average of the scores from the last LIVE_WINDOW_MS. */
export class LiveScore {
  private samples: Sample[] = [];

  /** Add this frame's score; returns the rounded average of the window. */
  add(score: number, time: number): number {
    this.samples.push({ time, score });
    this.samples = this.samples.filter((sample) => sample.time > time - LIVE_WINDOW_MS);
    return Math.round(average(this.samples));
  }

  reset(): void {
    this.samples = [];
  }
}

/** The final score: best average over any continuous HOLD_WINDOW_MS. */
export class BestHold {
  private samples: Sample[] = [];
  private bestSoFar: number | null = null;

  /**
   * Add this frame's score, or null if the player isn't properly visible
   * (that breaks the "continuous" second, so the window starts again).
   */
  add(score: number | null, time: number): void {
    if (score === null) {
      this.samples = [];
      return;
    }
    this.samples.push({ time, score });
    this.samples = this.samples.filter((sample) => sample.time >= time - HOLD_WINDOW_MS);

    // Only judge a window once it covers (almost) a whole second.
    const covered = time - this.samples[0].time;
    if (covered >= HOLD_WINDOW_MS * 0.9) {
      const held = Math.round(average(this.samples));
      if (this.bestSoFar === null || held > this.bestSoFar) this.bestSoFar = held;
    }
  }

  /** The best 1-second average so far, or null if there wasn't one yet. */
  best(): number | null {
    return this.bestSoFar;
  }

  reset(): void {
    this.samples = [];
    this.bestSoFar = null;
  }
}
