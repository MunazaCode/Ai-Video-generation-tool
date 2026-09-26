import { describe, expect, it } from "vitest";
import { deriveProjectTitle } from "./project-title";

describe("deriveProjectTitle", () => {
  it("uses the first non-empty script line", () => {
    expect(deriveProjectTitle("  \nHello world\nMore")).toBe("Hello world");
  });

  it("falls back when script is empty", () => {
    expect(deriveProjectTitle("   \n")).toBe("Untitled video");
  });
});
