import { describe, expect, it } from "vitest";
import {
  buildProjectSubtitleCues,
  buildSceneSubtitleCues,
  formatSrtTimestamp,
  formatVttTimestamp,
  renderSrt,
  renderVtt,
  sanitizeSubtitleText,
} from "./format.js";

describe("subtitle format", () => {
  it("formats SRT and VTT timestamps", () => {
    expect(formatSrtTimestamp(65.5)).toBe("00:01:05,500");
    expect(formatVttTimestamp(65.5)).toBe("00:01:05.500");
  });

  it("sanitizes multiline narration", () => {
    expect(sanitizeSubtitleText("line one\nline two")).toBe("line one line two");
  });

  it("builds project cues with cumulative timing", () => {
    const cues = buildProjectSubtitleCues([
      { sequence: 1, narration: "First", durationSec: 4 },
      { sequence: 2, narration: "Second", durationSec: 6 },
    ]);
    expect(cues).toHaveLength(2);
    expect(cues[0]?.startSec).toBe(0);
    expect(cues[0]?.endSec).toBe(4);
    expect(cues[1]?.startSec).toBe(4);
    expect(cues[1]?.endSec).toBe(10);
    const vtt = renderVtt(cues);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:04.000 --> 00:00:10.000");
  });

  it("renders single-scene SRT", () => {
    const cues = buildSceneSubtitleCues("Hello", 3);
    const srt = renderSrt(cues);
    expect(srt).toContain("Hello");
    expect(srt).toContain("00:00:00,000 --> 00:00:03,000");
  });
});
