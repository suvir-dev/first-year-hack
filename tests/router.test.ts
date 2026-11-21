// router.test.ts: the site's page addresses. Run with: npm test

import { describe, expect, it } from "vitest";
import { otherGame, parseRoute } from "../src/router";

describe("parseRoute", () => {
  it("reads the page from the address", () => {
    expect(parseRoute("#/home")).toBe("home");
    expect(parseRoute("#/pose")).toBe("pose");
    expect(parseRoute("#/higher-lower")).toBe("higher-lower");
  });

  it("goes home for an empty or unknown address", () => {
    expect(parseRoute("")).toBe("home");
    expect(parseRoute("#")).toBe("home");
    expect(parseRoute("#/nope")).toBe("home");
  });
});

describe("otherGame", () => {
  it("switches between the two games", () => {
    expect(otherGame("pose")).toBe("higher-lower");
    expect(otherGame("higher-lower")).toBe("pose");
    expect(otherGame("home")).toBe("pose");
  });
});
