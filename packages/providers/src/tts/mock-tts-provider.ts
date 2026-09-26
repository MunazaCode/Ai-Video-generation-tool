import type { StorageProvider } from "@asv/storage";
import { createSilentWav } from "../utils/minimal-wav.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { TTSProvider, TtsGenerationRequest } from "./types.js";

export class MockTTSProvider implements TTSProvider {
  readonly id = "mock-tts";

  constructor(private readonly storage: StorageProvider) {}

  async generateSpeech(request: TtsGenerationRequest): Promise<GeneratedAssetMeta> {
    const fromText = Math.max(1, Math.ceil(request.text.length / 14));
    const durationSec = Math.min(
      30,
      request.targetDurationSec !== undefined && request.targetDurationSec > 0
        ? Math.max(1, Math.round(request.targetDurationSec))
        : fromText,
    );
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.text}:${request.language}:${request.voiceGender}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/audio/narration-mock-${hash}.wav`;
    await this.storage.save(relativePath, createSilentWav(durationSec));

    return {
      providerId: this.id,
      mock: true,
      relativePath,
      contentType: "audio/wav",
      label: "Mock narration generated",
    };
  }
}
