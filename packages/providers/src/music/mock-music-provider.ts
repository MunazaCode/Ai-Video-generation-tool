import type { StorageProvider } from "@asv/storage";
import { createSilentWav } from "../utils/minimal-wav.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { MusicGenerationRequest, MusicProvider } from "./types.js";

export class MockMusicProvider implements MusicProvider {
  readonly id = "mock-music";

  constructor(private readonly storage: StorageProvider) {}

  async generateMusic(request: MusicGenerationRequest): Promise<GeneratedAssetMeta> {
    const hash = deterministicHash(
      `${request.projectId}:music:${request.mood}:${String(request.durationSec)}`,
    );
    const relativePath = `projects/${request.projectId}/audio/music-mock-${hash}.wav`;
    await this.storage.save(
      relativePath,
      createSilentWav(Math.min(request.durationSec, 120)),
    );

    return {
      providerId: this.id,
      mock: true,
      relativePath,
      contentType: "audio/wav",
      label: "Mock background music generated",
    };
  }
}
