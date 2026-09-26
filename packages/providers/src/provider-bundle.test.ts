import { LocalStorageProvider } from "@asv/storage";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProviderBundle } from "./provider-bundle.js";

let tempDir: string | null = null;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

async function createStorage() {
  tempDir = await mkdtemp(path.join(tmpdir(), "asv-providers-"));
  return new LocalStorageProvider(tempDir);
}

describe("createProviderBundle", () => {
  it("returns mock providers when MOCK_AI is enabled", async () => {
    const storage = await createStorage();
    const bundle = createProviderBundle({
      mockAi: true,
      llmProvider: "mock",
      imageProvider: "mock",
      videoProvider: "mock",
      ttsProvider: "mock",
      musicProvider: "mock",
      storage,
    });

    expect(bundle.capabilities.mock).toBe(true);
    expect(bundle.image.id).toBe("mock-image");

    const image = await bundle.image.generateImage({
      projectId: "p1",
      sceneId: "s1",
      prompt: "forest path",
      width: 1280,
      height: 720,
    });
    expect(image.mock).toBe(true);
    expect(image.label).toContain("Mock");

    const again = await bundle.image.generateImage({
      projectId: "p1",
      sceneId: "s1",
      prompt: "forest path",
      width: 1280,
      height: 720,
    });
    expect(again.relativePath).toBe(image.relativePath);
    expect(await storage.exists(image.relativePath)).toBe(true);
  });

  it("throws when real video provider is missing required env", async () => {
    const storage = await createStorage();
    expect(() =>
      createProviderBundle(
        {
          mockAi: false,
          llmProvider: "mock",
          imageProvider: "mock",
          videoProvider: "wan",
          ttsProvider: "mock",
          musicProvider: "mock",
          storage,
        },
        {},
      ),
    ).toThrow(/VIDEO_API_BASE_URL/);
  });

  it("generates video via pollinations when configured", async () => {
    const fakeMp4 = Buffer.alloc(12_000, 0xcd);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(String(url)).toContain("gen.pollinations.ai/video/");
        return Promise.resolve(
          new Response(fakeMp4, {
            headers: { "Content-Type": "video/mp4" },
          }),
        );
      }),
    );

    const storage = await createStorage();
    const bundle = createProviderBundle(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "pollinations",
        videoProvider: "pollinations",
        ttsProvider: "mock",
        musicProvider: "mock",
        storage,
      },
      { POLLINATIONS_API_KEY: "test-pollinations-key" },
    );
    expect(bundle.video.id).toBe("pollinations");
    const asset = await bundle.video.generateVideo({
      projectId: "p",
      sceneId: "s",
      prompt: "Sarah walks on a road at sunset",
      durationSec: 8,
      width: 1280,
      height: 720,
      fps: 24,
    });
    expect(asset.mock).toBe(false);
    expect(asset.providerId).toBe("pollinations");
  });

  it("generates video via wan HTTP when env is present", async () => {
    const fakeMp4 = Buffer.from("fake-mp4");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        expect(url).toBe("http://localhost:9000/generate");
        return Promise.resolve(
          new Response(fakeMp4, {
            headers: { "Content-Type": "video/mp4" },
          }),
        );
      }),
    );

    const storage = await createStorage();
    const bundle = createProviderBundle(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "pollinations",
        videoProvider: "wan",
        ttsProvider: "mock",
        musicProvider: "mock",
        storage,
      },
      {
        VIDEO_API_BASE_URL: "http://localhost:9000",
        POLLINATIONS_API_KEY: "test-pollinations-key",
      },
    );
    expect(bundle.video.id).toBe("wan");
    const asset = await bundle.video.generateVideo({
      projectId: "p",
      sceneId: "s",
      prompt: "test",
      durationSec: 4,
      width: 1280,
      height: 720,
      fps: 24,
    });
    expect(asset.mock).toBe(false);
    expect(asset.providerId).toBe("wan");
    expect(await storage.exists(asset.relativePath)).toBe(true);
  });
});
