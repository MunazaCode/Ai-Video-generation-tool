import type { StorageProvider } from "@asv/storage";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { VideoGenerationRequest, VideoProvider } from "./types.js";

/**
 * Placeholder clip — not a real encoded H.264 stream.
 * FFmpeg assembly (Phase 11+) normalizes/replaces before final MP4.
 */
export function buildMockVideoPayload(request: VideoGenerationRequest): Buffer {
  const header = "MOCK_AI_VIDEO\n";
  const body = JSON.stringify({
    projectId: request.projectId,
    sceneId: request.sceneId,
    durationSec: request.durationSec,
    width: request.width,
    height: request.height,
    fps: request.fps,
    prompt: request.prompt.slice(0, 500),
  });
  return Buffer.from(`${header}${body}`, "utf8");
}

export class MockVideoProvider implements VideoProvider {
  readonly id = "mock-video";

  constructor(private readonly storage: StorageProvider) {}

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedAssetMeta> {
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.prompt}:${String(request.durationSec)}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/videos/mock-${hash}.mp4`;
    await this.storage.save(relativePath, buildMockVideoPayload(request));

    return {
      providerId: this.id,
      mock: true,
      relativePath,
      contentType: "video/mp4",
      label: "Mock video generated",
    };
  }
}
