import { describe, expect, it } from "vitest";
import {
  buildColorClipArgs,
  buildConcatArgs,
  buildImageClipArgs,
  buildMixMusicArgs,
  buildMuxSceneAudioArgs,
  buildNormalizeVideoArgs,
  formatConcatListEntry,
} from "./ffmpeg-args.js";

describe("FFmpeg argv builders", () => {
  it("builds Ken Burns image motion args", () => {
    const args = buildImageClipArgs("C:/assets/scene.png", "C:/work/scene.mp4", {
      durationSec: 8,
      width: 1280,
      height: 720,
      fps: 24,
      motion: "zoom-in",
    });
    expect(args[0]).toBe("-loop");
    expect(args).toContain("C:/assets/scene.png");
    expect(args.at(-1)).toBe("C:/work/scene.mp4");
    expect(args.join(" ")).toContain("zoompan=");
    expect(args.join(" ")).not.toContain("|");
  });

  it("builds normalize args with duration cap", () => {
    const args = buildNormalizeVideoArgs("C:/in.mp4", "C:/out.mp4", {
      durationSec: 6,
      width: 720,
      height: 1280,
      fps: 24,
    });
    expect(args).toContain("-t");
    expect(args).toContain("6");
    expect(args).toContain("libx264");
  });

  it("builds mux and concat argv arrays", () => {
    expect(buildMuxSceneAudioArgs("a.mp4", "b.wav", "c.mp4")).toEqual([
      "-i",
      "a.mp4",
      "-i",
      "b.wav",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "c.mp4",
    ]);
    expect(buildMuxSceneAudioArgs("a.mp4", "b.wav", "c.mp4", 8)).toEqual([
      "-i",
      "a.mp4",
      "-i",
      "b.wav",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-af",
      "apad=whole_dur=8.000",
      "-t",
      "8.000",
      "c.mp4",
    ]);
    expect(buildConcatArgs("list.txt", "final.mp4")).toContain("-f");
    expect(buildConcatArgs("list.txt", "final.mp4")).toContain("concat");
  });

  it("builds lavfi color fallback args", () => {
    const args = buildColorClipArgs("C:/out.mp4", {
      durationSec: 4,
      width: 1280,
      height: 720,
      fps: 24,
    });
    expect(args.join(" ")).toContain("color=c=");
  });

  it("escapes concat list paths", () => {
    expect(formatConcatListEntry("C:/tmp/a's.mp4")).toBe(
      "file 'C:/tmp/a'\\''s.mp4'",
    );
  });

  it("builds music ducking filter_complex", () => {
    const args = buildMixMusicArgs("v.mp4", "m.wav", "out.mp4", 0.15);
    const filterIndex = args.indexOf("-filter_complex");
    expect(filterIndex).toBeGreaterThan(-1);
    expect(args[filterIndex + 1]).toContain("amix=inputs=2");
    expect(args[filterIndex + 1]).toContain("volume=0.15");
  });
});
