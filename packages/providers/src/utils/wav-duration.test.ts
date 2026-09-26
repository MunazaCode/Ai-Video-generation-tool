import { describe, expect, it } from "vitest";
import { createSilentWav } from "./minimal-wav.js";
import { readWavDurationSec } from "./wav-duration.js";

describe("readWavDurationSec", () => {
  it("reads duration from mock silent wav", () => {
    const wav = createSilentWav(3);
    const sec = readWavDurationSec(wav);
    expect(sec).not.toBeNull();
    expect(sec).toBeGreaterThan(2.9);
    expect(sec).toBeLessThan(3.1);
  });

  it("returns null for invalid buffer", () => {
    expect(readWavDurationSec(Buffer.from("not wav"))).toBeNull();
  });
});
