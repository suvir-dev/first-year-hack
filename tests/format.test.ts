// format.test.ts: scores are always shown as numbers. Run with: npm test

import { describe, expect, it } from "vitest";
import { formatScore, toScore } from "../src/format";

describe("formatScore", () => {
  it("shows 0 as 0 (not a dash)", () => {
    expect(formatScore(0)).toBe("0");
  });

  it("shows low scores as numbers", () => {
    expect(formatScore(3)).toBe("3");
  });

  it("shows missing or broken scores as 0", () => {
    expect(formatScore(NaN)).toBe("0");
    expect(formatScore(undefined)).toBe("0");
    expect(formatScore(null)).toBe("0");
  });

  it("rounds to a whole number", () => {
    expect(formatScore(99.6)).toBe("100");
    expect(formatScore(42.4)).toBe("42");
  });

  it("keeps scores between 0 and 100", () => {
    expect(toScore(-5)).toBe(0);
    expect(toScore(140)).toBe(100);
  });
});
