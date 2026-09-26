import { describe, expect, it } from "vitest";
import { sanitizeRelativePath, StoragePathError } from "./sanitize-path.js";

describe("sanitizeRelativePath", () => {
  it("accepts safe project paths", () => {
    expect(sanitizeRelativePath("projects/abc/images/x.png")).toBe(
      "projects/abc/images/x.png",
    );
  });

  it("rejects traversal", () => {
    expect(() => sanitizeRelativePath("projects/../secret")).toThrow(
      StoragePathError,
    );
  });
});
