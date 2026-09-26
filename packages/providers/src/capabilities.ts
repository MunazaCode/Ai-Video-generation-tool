import type { ProviderFactoryOptions } from "./factory-options.js";
import type { EnvSource } from "./validate-provider-config.js";
import { findProviderDefinition, type ProviderKind } from "./provider-registry.js";

export interface ServiceCapability {
  kind: ProviderKind;
  providerId: string;
  label: string;
  mock: boolean;
  configured: boolean;
  implemented: boolean;
  missingEnv: string[];
  notes: string;
}

export interface ProviderCapability {
  id: string;
  mock: boolean;
  services: ServiceCapability[];
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsTts: boolean;
  supportsMusic: boolean;
  supportsLlm: boolean;
  estimatedCost: "free" | "paid" | "unknown";
  maxDurationSec: number | null;
  maxResolution: string | null;
  notes: string;
}

function envPresent(env: EnvSource, key: string): boolean {
  const value = env[key];
  return value !== undefined && value.trim().length > 0;
}

function buildServiceCapability(
  kind: ProviderKind,
  providerId: string,
  env: EnvSource,
): ServiceCapability {
  const definition = findProviderDefinition(kind, providerId);
  if (!definition) {
    return {
      kind,
      providerId,
      label: providerId,
      mock: false,
      configured: false,
      implemented: false,
      missingEnv: [],
      notes: "Unknown provider id.",
    };
  }

  const missingEnv = definition.requiredEnv.filter((key) => !envPresent(env, key));

  return {
    kind,
    providerId: definition.id,
    label: definition.label,
    mock: definition.id === "mock",
    configured: missingEnv.length === 0,
    implemented: definition.implemented,
    missingEnv,
    notes: definition.phaseNote,
  };
}

export function buildProviderCapabilities(
  options: ProviderFactoryOptions,
  env: EnvSource,
): ProviderCapability {
  if (options.mockAi) {
    return mockProviderCapabilities();
  }

  const services: ServiceCapability[] = [
    buildServiceCapability("llm", options.llmProvider, env),
    buildServiceCapability("image", options.imageProvider, env),
    buildServiceCapability("video", options.videoProvider, env),
    buildServiceCapability("tts", options.ttsProvider, env),
    buildServiceCapability("music", options.musicProvider, env),
  ];

  const isReady = (kind: ProviderKind) => {
    const service = services.find((s) => s.kind === kind);
    return service ? service.configured && service.implemented : false;
  };

  return {
    id: "configured-bundle",
    mock: false,
    services,
    supportsLlm: isReady("llm"),
    supportsImage: isReady("image"),
    supportsVideo: isReady("video"),
    supportsTts: isReady("tts"),
    supportsMusic: isReady("music"),
    estimatedCost: "unknown",
    maxDurationSec: null,
    maxResolution: null,
    notes:
      "Real adapters: LLM, Pollinations text-to-video, image HTTP, TTS (piper/openai). ComfyUI and music HTTP remain stubs.",
  };
}

export function mockProviderCapabilities(): ProviderCapability {
  const services: ServiceCapability[] = (
    ["llm", "image", "video", "tts", "music"] as const
  ).map((kind) => ({
    kind,
    providerId: "mock",
    label: `Mock ${kind}`,
    mock: true,
    configured: true,
    implemented: true,
    missingEnv: [],
    notes: "Development mode — placeholder assets only.",
  }));

  return {
    id: "mock-bundle",
    mock: true,
    services,
    supportsImage: true,
    supportsVideo: true,
    supportsTts: true,
    supportsMusic: true,
    supportsLlm: true,
    estimatedCost: "free",
    maxDurationSec: null,
    maxResolution: null,
    notes: "Development mode — placeholder assets only, not real AI output.",
  };
}
