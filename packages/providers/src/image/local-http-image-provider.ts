import type { StorageProvider } from "@asv/storage";
import { parseMediaResponse, extensionFromContentType } from "../http/parse-media-response.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type {
  GeneratedAssetMeta,
  ImageGenerationRequest,
  ImageProvider,
} from "./types.js";

export interface LocalHttpImageConfig {
  endpointUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class LocalHttpImageProvider implements ImageProvider {
  readonly id = "local-http";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: LocalHttpImageConfig,
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedAssetMeta> {
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
        width: request.width,
        height: request.height,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 180_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Image API failed (${String(response.status)}): ${body.slice(0, 400)}`,
      );
    }

    const media = await parseMediaResponse(response, "image/png");
    const ext = extensionFromContentType(media.contentType) || "png";
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.prompt}:${String(request.width)}x${String(request.height)}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/images/http-${hash}.${ext}`;
    await this.storage.save(relativePath, media.data);

    return {
      providerId: this.id,
      mock: false,
      relativePath,
      contentType: media.contentType,
      label: "HTTP image generated",
    };
  }
}

export function createLocalHttpImageProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): LocalHttpImageProvider {
  const endpointUrl = env.IMAGE_API_URL?.trim();
  if (!endpointUrl) {
    throw new Error("IMAGE_API_URL is required for local-http image provider");
  }
  const apiKey = env.IMAGE_API_KEY?.trim();
  return new LocalHttpImageProvider(storage, {
    endpointUrl,
    ...(apiKey ? { apiKey } : {}),
  });
}
