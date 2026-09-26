export type {
  LLMProvider,
  LLMTaskType,
  StoryAnalysisLLMInput,
} from "./llm/types.js";
export { MockLLMProvider, buildMockStoryAnalysis } from "./llm/mock-llm-provider.js";
export { createLLMProvider } from "./llm/factory.js";
export type { LLMFactoryOptions } from "./llm/factory.js";

export type {
  ImageProvider,
  ImageGenerationRequest,
  GeneratedAssetMeta,
} from "./image/types.js";
export { MockImageProvider } from "./image/mock-image-provider.js";
export {
  OpenAiImageProvider,
  createOpenAiImageFromEnv,
} from "./image/openai-image-provider.js";
export {
  PollinationsImageProvider,
  createPollinationsImageProvider,
} from "./image/pollinations-image-provider.js";

export type {
  VideoProvider,
  VideoGenerationRequest,
} from "./video/types.js";
export { MockVideoProvider, buildMockVideoPayload } from "./video/mock-video-provider.js";
export {
  ImageMotionVideoProvider,
  createImageMotionVideoProvider,
} from "./video/image-motion-video-provider.js";
export {
  PollinationsVideoProvider,
  createPollinationsVideoProvider,
  clampPollinationsVideoDuration,
} from "./video/pollinations-video-provider.js";

export type { TTSProvider, TtsGenerationRequest } from "./tts/types.js";
export { MockTTSProvider } from "./tts/mock-tts-provider.js";
export { OpenAiTtsProvider, createOpenAiTtsFromEnv } from "./tts/openai-tts-provider.js";
export { PiperTtsProvider, createPiperTtsFromEnv } from "./tts/piper-tts-provider.js";
export { SapiTtsProvider, createSapiTtsProvider } from "./tts/sapi-tts-provider.js";
export { readWavDurationSec } from "./utils/wav-duration.js";

export type { MusicProvider, MusicGenerationRequest } from "./music/types.js";
export { MockMusicProvider } from "./music/mock-music-provider.js";

export type { ProviderCapability, ServiceCapability } from "./capabilities.js";
export {
  mockProviderCapabilities,
  buildProviderCapabilities,
} from "./capabilities.js";

export { createProviderBundle } from "./provider-bundle.js";
export type { ProviderBundle, ProviderFactoryOptions } from "./provider-bundle.js";

export type { ProviderKind, ProviderDefinition } from "./provider-registry.js";
export {
  PROVIDER_REGISTRY,
  findProviderDefinition,
  listProviderIds,
} from "./provider-registry.js";

export {
  ProviderConfigurationError,
  ProviderNotImplementedError,
  formatProviderConfigIssues,
} from "./provider-errors.js";
export type { ProviderConfigIssue } from "./provider-errors.js";

export {
  validateProviderFactoryOptions,
} from "./validate-provider-config.js";
export type {
  EnvSource,
  ProviderValidationResult,
} from "./validate-provider-config.js";

export function providersPackageReady(): string {
  return "Provider registry, env validation, mock + real LLM/image/video HTTP adapters";
}
