import { describe, expect, it } from "vitest";
import { createSolidPng, slateRgbFromSeed } from "./solid-png.js";

describe("solid png", () => {
  it("writes a valid PNG signature", () => {
    const png = createSolidPng(16, 9, { r: 36, g: 72, b: 120 });
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      true,
    );
    expect(png.byteLength).toBeGreaterThan(50);
  });

  it("picks stable slate colors from seed", () => {
    expect(slateRgbFromSeed("a")).toEqual(slateRgbFromSeed("a"));
    expect(slateRgbFromSeed("a")).not.toEqual(slateRgbFromSeed("b"));
  });
});
