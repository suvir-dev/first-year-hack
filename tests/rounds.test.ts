// rounds.test.ts: Gallery Tour picks the right paintings. Run with: npm test

import { describe, expect, it } from "vitest";
import { duetPaintings, figureCount } from "../src/paintings";
import { pickTourPaintings, TOUR_LENGTH } from "../src/rounds";

describe("pickTourPaintings", () => {
  it("picks 5 different paintings", () => {
    const tour = pickTourPaintings();
    expect(tour).toHaveLength(TOUR_LENGTH);
    expect(new Set(tour.map((p) => p.id)).size).toBe(TOUR_LENGTH);
  });

  it("NEVER gives a 1-player tour a painting with more than one figure (1,000 tours)", () => {
    for (let i = 0; i < 1000; i++) {
      for (const difficulty of [undefined, "easy", "medium", "hard"] as const) {
        const tour = pickTourPaintings(difficulty, TOUR_LENGTH, 1);
        expect(tour.every((painting) => figureCount(painting) === 1)).toBe(true);
      }
    }
  });

  it("mixes in 2 duet paintings for 2 players", () => {
    const tour = pickTourPaintings(undefined, TOUR_LENGTH, 2);
    expect(tour.filter((p) => figureCount(p) === 2)).toHaveLength(Math.min(2, duetPaintings.length));
  });

  it("avoids the previous tour's paintings when there are enough", () => {
    const first = new Set(pickTourPaintings().map((p) => p.id));
    const second = pickTourPaintings();
    expect(second.some((p) => first.has(p.id))).toBe(false);
  });

  it("uses the chosen difficulty when at least 5 paintings match", () => {
    expect(pickTourPaintings("easy").every((p) => p.difficulty === "easy")).toBe(true);
  });

  it("falls back to all solo paintings when fewer than 5 match", () => {
    expect(pickTourPaintings("hard")).toHaveLength(TOUR_LENGTH);
  });

  it("allows no painting with 3 or more people", () => {
    // (imported list checked via figureCount)
    expect(duetPaintings.every((p) => figureCount(p) === 2)).toBe(true);
  });
});

describe("duet paintings", () => {
  // Average x of a figure's visible shoulders and hips.
  const centreX = (landmarks: { x: number; visibility: number }[]) => {
    const xs = [11, 12, 23, 24].map((i) => landmarks[i]).filter((l) => l.visibility > 0.5).map((l) => l.x);
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };

  it("list the LEFT figure first, so the left player copies the left figure", () => {
    for (const painting of duetPaintings) {
      const [left, right] = painting.figures;
      expect(centreX(left.targetPose.landmarks), painting.title).toBeLessThan(centreX(right.targetPose.landmarks));
    }
  });
});
