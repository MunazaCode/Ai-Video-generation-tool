export type ProviderKind = "llm" | "image" | "video" | "tts" | "music";

export interface ProviderDefinition {
  id: string;
  label: string;
  /** True when the adapter can run end-to-end in the current codebase. */
  implemented: boolean;
  requiredEnv: readonly string[];
  optionalEnv?: readonly string[];
  phaseNote: string;
}

export const PROVIDER_REGISTRY: Record<ProviderKind, ProviderDefinition[]> = {
  llm: [
    {
      id: "mock",
      label: "Mock LLM",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Deterministic JSON for local development.",
    },
    {
      id: "openai",
      label: "OpenAI",
      implemented: true,
      requiredEnv: ["OPENAI_API_KEY"],
      optionalEnv: ["OPENAI_BASE_URL", "OPENAI_MODEL"],
      phaseNote: "OpenAI Chat Completions with JSON output.",
    },
    {
      id: "openai-compatible",
      label: "OpenAI-compatible HTTP",
      implemented: true,
      requiredEnv: ["LLM_API_KEY", "LLM_BASE_URL"],
      optionalEnv: ["LLM_MODEL"],
      phaseNote: "Any OpenAI-compatible chat completions API.",
    },
  ],
  image: [
    {
      id: "mock",
      label: "Mock image",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Placeholder PNG files (dev only; blocked when MOCK_AI=false).",
    },
    {
      id: "openai",
      label: "OpenAI Images (DALL·E)",
      implemented: true,
      requiredEnv: ["OPENAI_API_KEY"],
      optionalEnv: ["OPENAI_BASE_URL", "OPENAI_IMAGE_MODEL"],
      phaseNote: "Real cinematic stills via OpenAI Images API.",
    },
    {
      id: "comfyui",
      label: "ComfyUI",
      implemented: false,
      requiredEnv: ["COMFYUI_BASE_URL"],
      phaseNote: "GPU adapter ships in Phase 15+.",
    },
    {
      id: "local-http",
      label: "Local HTTP image API",
      implemented: true,
      requiredEnv: ["IMAGE_API_URL"],
      optionalEnv: ["IMAGE_API_KEY"],
      phaseNote: "POST JSON prompt; response is image bytes or base64 JSON.",
    },
    {
      id: "pollinations",
      label: "Pollinations AI images",
      implemented: true,
      requiredEnv: [],
      optionalEnv: ["POLLINATIONS_API_KEY", "POLLINATIONS_IMAGE_BASE_URL"],
      phaseNote:
        "Real AI stills via Pollinations (set POLLINATIONS_API_KEY for production).",
    },
  ],
  video: [
    {
      id: "mock",
      label: "Mock video",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Placeholder clips (dev only; blocked when MOCK_AI=false).",
    },
    {
      id: "pollinations",
      label: "Pollinations AI text-to-video",
      implemented: true,
      requiredEnv: ["POLLINATIONS_API_KEY"],
      optionalEnv: ["POLLINATIONS_VIDEO_BASE_URL", "POLLINATIONS_VIDEO_MODEL"],
      phaseNote:
        "Real AI video clips via gen.pollinations.ai (POLLINATIONS_API_KEY required).",
    },
    {
      id: "image-motion",
      label: "Ken Burns from scene image (legacy CI only)",
      implemented: true,
      requiredEnv: [],
      optionalEnv: ["FFMPEG_PATH"],
      phaseNote:
        "Legacy still-image motion — blocked when MOCK_AI=false. Use pollinations/wan/local-http.",
    },
    {
      id: "wan",
      label: "Wan / external GPU video",
      implemented: true,
      requiredEnv: ["VIDEO_API_BASE_URL"],
      optionalEnv: ["VIDEO_API_KEY"],
      phaseNote: "POST {base}/generate with scene prompt JSON.",
    },
    {
      id: "local-http",
      label: "Local HTTP video API",
      implemented: true,
      requiredEnv: ["VIDEO_API_URL"],
      optionalEnv: ["VIDEO_API_KEY"],
      phaseNote: "POST JSON prompt; response is video bytes or base64 JSON.",
    },
  ],
  tts: [
    {
      id: "mock",
      label: "Mock TTS",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Silent WAV narration.",
    },
    {
      id: "piper",
      label: "Piper",
      implemented: true,
      requiredEnv: ["PIPER_EXECUTABLE", "PIPER_VOICE"],
      optionalEnv: [],
      phaseNote: "Local Piper CLI; PIPER_VOICE is path to the .onnx voice model.",
    },
    {
      id: "openai",
      label: "OpenAI TTS",
      implemented: true,
      requiredEnv: ["OPENAI_API_KEY"],
      optionalEnv: ["OPENAI_BASE_URL", "OPENAI_TTS_MODEL", "OPENAI_TTS_VOICE"],
      phaseNote: "OpenAI /v1/audio/speech (wav output).",
    },
    {
      id: "sapi",
      label: "Windows SAPI",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Local System.Speech narration on Windows (no API key).",
    },
  ],
  music: [
    {
      id: "mock",
      label: "Mock music",
      implemented: true,
      requiredEnv: [],
      phaseNote: "Silent background bed.",
    },
    {
      id: "local-http",
      label: "Local HTTP music API",
      implemented: false,
      requiredEnv: ["MUSIC_API_URL"],
      phaseNote: "Real adapter ships in Phase 16+.",
    },
  ],
};

export function findProviderDefinition(
  kind: ProviderKind,
  providerId: string,
): ProviderDefinition | null {
  return (
    PROVIDER_REGISTRY[kind].find((entry) => entry.id === providerId) ?? null
  );
}

export function listProviderIds(kind: ProviderKind): string[] {
  return PROVIDER_REGISTRY[kind].map((entry) => entry.id);
}
