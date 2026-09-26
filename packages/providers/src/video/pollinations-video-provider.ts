import type { StorageProvider } from "@asv/storage";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { VideoGenerationRequest, VideoProvider } from "./types.js";

export interface PollinationsVideoConfig {
  baseUrl?: string;
  /** e.g. wan-fast, wan, seedance-2.0-fast, veo */
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

function aspectRatioForSize(width: number, height: number): "16:9" | "9:16" {
  return height > width ? "9:16" : "16:9";
}

/** Clamp to Pollinations-friendly durations (model-specific limits vary; wan supports 2–15s). */
export function clampPollinationsVideoDuration(durationSec: number): number {
  const rounded = Math.max(2, Math.round(durationSec));
  return Math.min(15, rounded);
}

/**
 * Real text-to-video via Pollinations gen API (GET /video/{prompt} → MP4).
 * Requires POLLINATIONS_API_KEY for reliable production use.
 */
export class PollinationsVideoProvider implements VideoProvider {
  readonly id = "pollinations";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: PollinationsVideoConfig = {},
  ) {}

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedAssetMeta> {
    if (!this.config.apiKey?.trim()) {
      throw new Error(
        "POLLINATIONS_API_KEY is missing. Add it to the repo-root .env (https://enter.pollinations.ai) and restart the worker.",
      );
    }
    const prompt = request.prompt.trim().slice(0, 900);
    if (!prompt) {
      throw new Error("Pollinations video generation requires a non-empty prompt");
    }

    const duration = clampPollinationsVideoDuration(request.durationSec);
    const aspectRatio = aspectRatioForSize(request.width, request.height);
    const model = this.config.model ?? "wan-fast";

    const base = (this.config.baseUrl ?? "https://gen.pollinations.ai/video").replace(
      /\/$/,
      "",
    );
    const url = new URL(`${base}/${encodeURIComponent(prompt)}`);
    url.searchParams.set("model", model);
    url.searchParams.set("duration", String(duration));
    url.searchParams.set("aspectRatio", aspectRatio);
    url.searchParams.set("nologo", "true");
    url.searchParams.set(
      "seed",
      String(Math.abs(hashToSeed(prompt + request.sceneId)) % 1_000_000),
    );
    if (this.config.apiKey) {
      url.searchParams.set("key", this.config.apiKey);
    }

    const headers: Record<string, string> = { Accept: "video/mp4,video/*" };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(this.config.timeoutMs ?? 600_000),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          const hint =
            response.status === 401 || response.status === 403
              ? " Set POLLINATIONS_API_KEY (https://enter.pollinations.ai)."
              : "";
          throw new Error(
            `Pollinations video API failed (${String(response.status)}): ${body.slice(0, 300)}.${hint}`,
          );
        }

        const contentType = response.headers.get("content-type") ?? "video/mp4";
        if (!contentType.startsWith("video/")) {
          throw new Error(
            `Pollinations returned non-video content-type "${contentType}"`,
          );
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 10_000) {
          throw new Error("Pollinations returned an empty/tiny video payload");
        }

        const ext = contentType.includes("webm") ? "webm" : "mp4";
        const hash = deterministicHash(
          `${request.projectId}:${request.sceneId}:${prompt}:${String(duration)}:${aspectRatio}`,
        );
        const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/videos/pollinations-${hash}.${ext}`;
        await this.storage.save(relativePath, bytes);

        return {
          providerId: this.id,
          mock: false,
          relativePath,
          contentType: contentType.startsWith("video/") ? contentType : "video/mp4",
          label: "Pollinations AI video clip generated",
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2500 * attempt));
        }
      }
    }

    throw new Error(
      `${lastError?.message ?? "Pollinations video generation failed"}. ` +
        `Check POLLINATIONS_API_KEY and VIDEO_PROVIDER=pollinations, or use VIDEO_PROVIDER=local-http with a GPU backend.`,
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

export function createPollinationsVideoProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): PollinationsVideoProvider {
  const baseUrl = env.POLLINATIONS_VIDEO_BASE_URL?.trim();
  const model = env.POLLINATIONS_VIDEO_MODEL?.trim();
  const apiKey = env.POLLINATIONS_API_KEY?.trim();
  return new PollinationsVideoProvider(storage, {
    ...(baseUrl ? { baseUrl } : {}),
    ...(model ? { model } : {}),
    ...(apiKey ? { apiKey } : {}),
  });
}
