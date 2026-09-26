import type { StorageProvider } from "@asv/storage";
import { VoiceGender } from "@asv/shared";
import { parseMediaResponse, extensionFromContentType } from "../http/parse-media-response.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { TTSProvider, TtsGenerationRequest } from "./types.js";

export interface OpenAiTtsConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultVoice: string;
  timeoutMs?: number;
}

function voiceForGender(gender: string, fallback: string): string {
  switch (gender) {
    case VoiceGender.MALE:
      return "onyx";
    case VoiceGender.FEMALE:
      return "nova";
    case VoiceGender.NEUTRAL:
      return "alloy";
    default:
      return fallback;
  }
}

export class OpenAiTtsProvider implements TTSProvider {
  readonly id = "openai";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: OpenAiTtsConfig,
  ) {}

  async generateSpeech(request: TtsGenerationRequest): Promise<GeneratedAssetMeta> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const voice = voiceForGender(request.voiceGender, this.config.defaultVoice);
    const timeoutMs = this.config.timeoutMs ?? 120_000;

    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        voice,
        input: request.text,
        response_format: "wav",
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI TTS failed (${String(response.status)}): ${body.slice(0, 400)}`,
      );
    }

    const media = await parseMediaResponse(response, "audio/wav");
    const ext = extensionFromContentType(media.contentType) || "wav";
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.text}:${request.language}:${voice}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/audio/narration-openai-${hash}.${ext}`;
    await this.storage.save(relativePath, media.data);

    return {
      providerId: this.id,
      mock: false,
      relativePath,
      contentType: media.contentType,
      label: "OpenAI narration generated",
    };
  }
}

export function createOpenAiTtsFromEnv(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): OpenAiTtsProvider {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for openai TTS provider");
  }
  return new OpenAiTtsProvider(storage, {
    apiKey,
    baseUrl: env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1",
    model: env.OPENAI_TTS_MODEL?.trim() ?? "tts-1",
    defaultVoice: env.OPENAI_TTS_VOICE?.trim() ?? "alloy",
  });
}
