import { LocalStorageProvider } from "@asv/storage";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PollinationsVideoProvider,
  clampPollinationsVideoDuration,
} from "./pollinations-video-provider.js";

let tempDir: string | null = null;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("PollinationsVideoProvider", () => {
  it("clamps duration into wan-friendly range", () => {
    expect(clampPollinationsVideoDuration(1)).toBe(2);
    expect(clampPollinationsVideoDuration(8.2)).toBe(8);
    expect(clampPollinationsVideoDuration(40)).toBe(15);
  });

  it("stores MP4 bytes from gen.pollinations.ai", async () => {
    const fakeMp4 = Buffer.alloc(12_000, 0xab);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(url).toContain("gen.pollinations.ai/video/");
        expect(url).toContain("model=wan-fast");
        expect(url).toContain("duration=8");
        return Promise.resolve(
          new Response(fakeMp4, {
            headers: { "Content-Type": "video/mp4" },
          }),
        );
      }),
    );

    tempDir = await mkdtemp(path.join(tmpdir(), "asv-poll-video-"));
    const storage = new LocalStorageProvider(tempDir);
    const provider = new PollinationsVideoProvider(storage, {
      model: "wan-fast",
      apiKey: "test-key",
    });

    const asset = await provider.generateVideo({
      projectId: "p",
      sceneId: "s1",
      prompt: "Sarah walks alone on a road at sunset",
      durationSec: 8,
      width: 1280,
      height: 720,
      fps: 24,
    });

    expect(asset.mock).toBe(false);
    expect(asset.providerId).toBe("pollinations");
    expect(await storage.exists(asset.relativePath)).toBe(true);
  });
});
