// rounds.test.ts: Gallery Tour picks good paintings. Run with: npm test

import { describe, expect, it } from "vitest";
import { pickTourPaintings, TOUR_LENGTH } from "../src/rounds";

describe("pickTourPaintings", () => {
  it("picks 5 different one-person paintings", () => {
    const tour = pickTourPaintings();
    expect(tour).toHaveLength(TOUR_LENGTH);
    expect(new Set(tour.map((p) => p.id)).size).toBe(TOUR_LENGTH);
    expect(tour.every((p) => p.onePerson && p.targetPose)).toBe(true);
  });

  it("avoids the previous tour's paintings when there are enough", () => {
    const first = new Set(pickTourPaintings().map((p) => p.id));
    const second = pickTourPaintings();
    expect(second.some((p) => first.has(p.id))).toBe(false);
  });

  it("uses the chosen difficulty when at least 5 paintings match", () => {
    expect(pickTourPaintings("easy").every((p) => p.difficulty === "easy")).toBe(true);
  });

  it("falls back to all paintings when fewer than 5 match", () => {
    expect(pickTourPaintings("hard")).toHaveLength(TOUR_LENGTH);
  });
});
