import { LocalStorageProvider } from "@asv/storage";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSilentWav } from "../utils/minimal-wav.js";
import { OpenAiTtsProvider } from "./openai-tts-provider.js";

let tempDir: string | null = null;

afterEach(async () => {
  vi.unstubAllGlobals();
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("OpenAiTtsProvider", () => {
  it("posts to audio/speech and saves wav", async () => {
    const wav = createSilentWav(1);
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(wav, { headers: { "Content-Type": "audio/wav" } }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    tempDir = await mkdtemp(path.join(tmpdir(), "asv-tts-"));
    const storage = new LocalStorageProvider(tempDir);
    const provider = new OpenAiTtsProvider(storage, {
      apiKey: "sk-test",
      baseUrl: "https://example.com/v1",
      model: "tts-1",
      defaultVoice: "alloy",
    });

    const asset = await provider.generateSpeech({
      projectId: "p1",
      sceneId: "s1",
      text: "Hello world",
      language: "en",
      voiceGender: "FEMALE",
    });

    expect(asset.mock).toBe(false);
    expect(asset.relativePath).toContain("narration-openai");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/v1/audio/speech",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await storage.exists(asset.relativePath)).toBe(true);
  });
});
