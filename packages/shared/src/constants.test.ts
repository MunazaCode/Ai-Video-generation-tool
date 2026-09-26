import { describe, expect, it } from "vitest";
import { APP_NAME, PROMPT_VERSION } from "./constants.js";

describe("shared constants", () => {
  it("exports stable app identity", () => {
    expect(APP_NAME).toBe("AI Story Video Generator");
    expect(PROMPT_VERSION).toBe("1.0.0");
  });
});
