import { describe, expect, it } from "vitest";
import { isMockImagePath } from "./mock-image.js";

describe("isMockImagePath", () => {
  it("detects mock image filenames", () => {
    expect(isMockImagePath("projects/p/scenes/s/images/mock-abc123.png")).toBe(
      true,
    );
    expect(isMockImagePath("C:\\tmp\\mock-xyz.jpg")).toBe(true);
  });

  it("allows real provider image filenames", () => {
    expect(
      isMockImagePath("projects/p/scenes/s/images/openai-abc123.png"),
    ).toBe(false);
    expect(
      isMockImagePath("projects/p/scenes/s/images/pollinations-abc.jpg"),
    ).toBe(false);
    expect(isMockImagePath(null)).toBe(false);
  });
});
