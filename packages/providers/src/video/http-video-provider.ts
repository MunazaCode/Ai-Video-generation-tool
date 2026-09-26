import type { StorageProvider } from "@asv/storage";
import { parseMediaResponse, extensionFromContentType } from "../http/parse-media-response.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { VideoGenerationRequest, VideoProvider } from "./types.js";

export interface HttpVideoProviderConfig {
  id: string;
  endpointUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class HttpVideoProvider implements VideoProvider {
  readonly id: string;

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: HttpVideoProviderConfig,
  ) {
    this.id = config.id;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedAssetMeta> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId: request.projectId,
        sceneId: request.sceneId,
        prompt: request.prompt,
        durationSec: request.durationSec,
        width: request.width,
        height: request.height,
        fps: request.fps,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 300_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Video API failed (${String(response.status)}): ${body.slice(0, 400)}`,
      );
    }

    const media = await parseMediaResponse(response, "video/mp4");
    const ext = extensionFromContentType(media.contentType) || "mp4";
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.prompt}:${String(request.durationSec)}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/videos/${this.id}-${hash}.${ext}`;
    await this.storage.save(relativePath, media.data);

    return {
      providerId: this.id,
      mock: false,
      relativePath,
      contentType: media.contentType,
      label: `${this.id} video generated`,
    };
  }
}

export function createWanVideoProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): HttpVideoProvider {
  const base = env.VIDEO_API_BASE_URL?.trim();
  if (!base) {
    throw new Error("VIDEO_API_BASE_URL is required for wan video provider");
  }
  const endpointUrl = `${base.replace(/\/$/, "")}/generate`;
  const wanKey = env.VIDEO_API_KEY?.trim();
  return new HttpVideoProvider(storage, {
    id: "wan",
    endpointUrl,
    ...(wanKey ? { apiKey: wanKey } : {}),
  });
}

export function createLocalHttpVideoProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): HttpVideoProvider {
  const endpointUrl = env.VIDEO_API_URL?.trim();
  if (!endpointUrl) {
    throw new Error("VIDEO_API_URL is required for local-http video provider");
  }
  const videoKey = env.VIDEO_API_KEY?.trim();
  return new HttpVideoProvider(storage, {
    id: "local-http",
    endpointUrl,
    ...(videoKey ? { apiKey: videoKey } : {}),
  });
}
