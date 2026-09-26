import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AspectRatio } from "@asv/shared";
import { assembleProjectVideo } from "./assemble.js";
import { checkFfmpegAvailable } from "./ffmpeg-path.js";
import { createSolidTestPng, createSilentWav } from "./test-fixtures.js";

const ffmpegAvailable = await checkFfmpegAvailable();

describe.skipIf(!ffmpegAvailable)("assembleProjectVideo smoke", () => {
  it(
    "produces an MP4 from image + narration clips",
    async () => {
    const root = await mkdtemp(path.join(tmpdir(), "asv-ffmpeg-smoke-"));
    const imagePath = path.join(root, "scene.png");
    const audioPath = path.join(root, "scene.wav");
    const outputPath = path.join(root, "final", "output.mp4");
    const workDir = path.join(root, "work");

    await writeFile(imagePath, createSolidTestPng(960, 540));
    await writeFile(audioPath, createSilentWav(2));

    const result = await assembleProjectVideo({
      projectId: "demo",
      aspectRatio: AspectRatio.R16_9,
      outputPath,
      workDir,
      allowPlaceholderVisuals: true,
      scenes: [
        {
          sequence: 1,
          durationSec: 2,
          videoPath: null,
          imagePath,
          audioPath,
        },
      ],
    });

    expect(result.sceneCount).toBe(1);
    expect(result.durationSec).toBe(2);
    expect(result.outputPath).toBe(outputPath);

    const { stat } = await import("node:fs/promises");
    const info = await stat(outputPath);
    expect(info.size).toBeGreaterThan(1000);
  },
    60_000,
  );
});
