import type { StorageProvider } from "@asv/storage";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type {
  GeneratedAssetMeta,
  ImageGenerationRequest,
  ImageProvider,
} from "./types.js";

export interface PollinationsImageConfig {
  /** Override base URL (default: Pollinations flux endpoint). */
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Fetches a real AI-generated still from Pollinations (no API key required).
 * Explicit IMAGE_PROVIDER=pollinations — never used as a silent OpenAI fallback.
 */
export class PollinationsImageProvider implements ImageProvider {
  readonly id = "pollinations";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: PollinationsImageConfig = {},
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedAssetMeta> {
    if (!this.config.apiKey?.trim()) {
      throw new Error(
        "POLLINATIONS_API_KEY is missing. Add it to the repo-root .env (https://enter.pollinations.ai) and restart the worker.",
      );
    }
    const width = Math.min(1280, Math.max(512, request.width));
    const height = Math.min(720, Math.max(288, request.height));
    const prompt = [
      request.prompt.trim().slice(0, 500),
      "cinematic still, photorealistic, dramatic lighting, film still, no text, no watermark",
    ].join(", ");

    const base = (this.config.baseUrl ?? "https://image.pollinations.ai/prompt").replace(
      /\/$/,
      "",
    );
    const url = new URL(`${base}/${encodeURIComponent(prompt)}`);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    url.searchParams.set("nologo", "true");
    url.searchParams.set("model", "flux");
    url.searchParams.set(
      "seed",
      String(Math.abs(hashToSeed(prompt + request.sceneId)) % 1_000_000),
    );
    if (this.config.apiKey) {
      url.searchParams.set("key", this.config.apiKey);
    }

    const headers: Record<string, string> = { Accept: "image/*" };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          signal: AbortSignal.timeout(this.config.timeoutMs ?? 180_000),
          headers,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(
            `Pollinations image API failed (${String(response.status)}): ${body.slice(0, 300)}`,
          );
        }

        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) {
          throw new Error(
            `Pollinations returned non-image content-type "${contentType}"`,
          );
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 5_000) {
          throw new Error("Pollinations returned an empty/tiny image");
        }

        const ext = contentType.includes("png") ? "png" : "jpg";
        const hash = deterministicHash(
          `${request.projectId}:${request.sceneId}:${request.prompt}:${String(width)}x${String(height)}`,
        );
        const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/images/pollinations-${hash}.${ext}`;
        await this.storage.save(relativePath, bytes);

        return {
          providerId: this.id,
          mock: false,
          relativePath,
          contentType: contentType.startsWith("image/") ? contentType : `image/${ext}`,
          label: "Pollinations AI image generated",
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }

    throw new Error(
      `${lastError?.message ?? "Pollinations failed"}. ` +
        `Set POLLINATIONS_API_KEY in .env (https://enter.pollinations.ai) or IMAGE_PROVIDER=openai with OPENAI_API_KEY.`,
    );
  }
}

function hashToSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h;
}

export function createPollinationsImageProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): PollinationsImageProvider {
  const baseUrl = env.POLLINATIONS_IMAGE_BASE_URL?.trim();
  const apiKey = env.POLLINATIONS_API_KEY?.trim();
  return new PollinationsImageProvider(storage, {
    ...(baseUrl ? { baseUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
  });
}
