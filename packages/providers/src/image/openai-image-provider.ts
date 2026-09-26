import type { StorageProvider } from "@asv/storage";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type {
  GeneratedAssetMeta,
  ImageGenerationRequest,
  ImageProvider,
} from "./types.js";

export interface OpenAiImageConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

function sizeForRequest(width: number, height: number): string {
  if (height > width) {
    return "1024x1792";
  }
  if (width > height) {
    return "1792x1024";
  }
  return "1024x1024";
}

export class OpenAiImageProvider implements ImageProvider {
  readonly id = "openai";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: OpenAiImageConfig,
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedAssetMeta> {
    const baseUrl = (this.config.baseUrl ?? "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    const model = this.config.model ?? "dall-e-3";
    const size = sizeForRequest(request.width, request.height);
    const prompt = [
      request.prompt.trim(),
      "Cinematic still frame, photorealistic, dramatic lighting, shallow depth of field,",
      "film grain, 16:9 storyboard keyframe, no text overlays, no watermarks.",
    ].join(" ");

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: prompt.slice(0, 3900),
        n: 1,
        size,
        response_format: "b64_json",
        quality: "standard",
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 180_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI image API failed (${String(response.status)}): ${body.slice(0, 500)}. ` +
          `Check OPENAI_API_KEY and IMAGE_PROVIDER=openai.`,
      );
    }

    const json = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = json.data?.[0];
    let bytes: Buffer;
    if (first?.b64_json) {
      bytes = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const imgRes = await fetch(first.url, {
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 180_000),
      });
      if (!imgRes.ok) {
        throw new Error(`Failed to download OpenAI image URL (${String(imgRes.status)})`);
      }
      bytes = Buffer.from(await imgRes.arrayBuffer());
    } else {
      throw new Error("OpenAI image API returned no image data");
    }

    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.prompt}:${size}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/images/openai-${hash}.png`;
    await this.storage.save(relativePath, bytes);

    return {
      providerId: this.id,
      mock: false,
      relativePath,
      contentType: "image/png",
      label: "OpenAI image generated",
    };
  }
}

export function createOpenAiImageFromEnv(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): OpenAiImageProvider {
  const apiKey = env.OPENAI_API_KEY?.trim() || env.IMAGE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for IMAGE_PROVIDER=openai (or set IMAGE_API_KEY)",
    );
  }
  const baseUrl = env.OPENAI_BASE_URL?.trim() || env.IMAGE_OPENAI_BASE_URL?.trim();
  const model = env.OPENAI_IMAGE_MODEL?.trim() || env.IMAGE_MODEL?.trim();
  return new OpenAiImageProvider(storage, {
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    ...(model ? { model } : {}),
  });
}
