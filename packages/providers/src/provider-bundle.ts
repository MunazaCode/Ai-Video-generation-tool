import {
  buildProviderCapabilities,
  mockProviderCapabilities,
  type ProviderCapability,
} from "./capabilities.js";
import { createLocalHttpImageProvider } from "./image/local-http-image-provider.js";
import { createOpenAiImageFromEnv } from "./image/openai-image-provider.js";
import { createPollinationsImageProvider } from "./image/pollinations-image-provider.js";
import { MockImageProvider } from "./image/mock-image-provider.js";
import type { ImageProvider } from "./image/types.js";
import { createLLMProvider } from "./llm/factory.js";
import type { LLMProvider } from "./llm/types.js";
import { MockMusicProvider } from "./music/mock-music-provider.js";
import type { MusicProvider } from "./music/types.js";
import { ProviderConfigurationError } from "./provider-errors.js";
import { findProviderDefinition } from "./provider-registry.js";
import {
  createStubImageProvider,
  createStubMusicProvider,
  createStubTtsProvider,
  createStubVideoProvider,
} from "./stub-providers.js";
import { MockTTSProvider } from "./tts/mock-tts-provider.js";
import { createOpenAiTtsFromEnv } from "./tts/openai-tts-provider.js";
import { createPiperTtsFromEnv } from "./tts/piper-tts-provider.js";
import { createSapiTtsProvider } from "./tts/sapi-tts-provider.js";
import type { TTSProvider } from "./tts/types.js";
import {
  createLocalHttpVideoProvider,
  createWanVideoProvider,
} from "./video/http-video-provider.js";
import { createImageMotionVideoProvider } from "./video/image-motion-video-provider.js";
import { createPollinationsVideoProvider } from "./video/pollinations-video-provider.js";
import { MockVideoProvider } from "./video/mock-video-provider.js";
import type { VideoProvider } from "./video/types.js";
import {
  validateProviderFactoryOptions,
  type EnvSource,
} from "./validate-provider-config.js";

import type { ProviderFactoryOptions } from "./factory-options.js";

export type { ProviderFactoryOptions } from "./factory-options.js";

export interface ProviderBundle {
  llm: LLMProvider;
  image: ImageProvider;
  video: VideoProvider;
  tts: TTSProvider;
  music: MusicProvider;
  capabilities: ProviderCapability;
}

export function createProviderBundle(
  options: ProviderFactoryOptions,
  env: EnvSource = process.env,
): ProviderBundle {
  if (!options.mockAi) {
    const validation = validateProviderFactoryOptions(options, env);
    if (!validation.valid) {
      throw new ProviderConfigurationError(validation.issues);
    }
  }

  if (options.mockAi) {
    return {
      llm: createLLMProvider({ mockAi: true, llmProvider: "mock" }, env),
      image: new MockImageProvider(options.storage),
      video: new MockVideoProvider(options.storage),
      tts: new MockTTSProvider(options.storage),
      music: new MockMusicProvider(options.storage),
      capabilities: mockProviderCapabilities(),
    };
  }

  const capabilities = buildProviderCapabilities(options, env);

  return {
    llm: resolveLlmProvider(options, env),
    image: resolveImageProvider(options, env),
    video: resolveVideoProvider(options, env),
    tts: resolveTtsProvider(options, env),
    music: resolveMusicProvider(options),
    capabilities,
  };
}

function resolveLlmProvider(
  options: ProviderFactoryOptions,
  env: EnvSource,
): LLMProvider {
  if (options.llmProvider === "mock") {
    return createLLMProvider({ mockAi: false, llmProvider: "mock" }, env);
  }
  return createLLMProvider(
    { mockAi: false, llmProvider: options.llmProvider },
    env,
  );
}

function requireDefinition(
  kind: "image" | "video" | "tts" | "music",
  providerId: string,
) {
  const def = findProviderDefinition(kind, providerId);
  if (!def) {
    throw new ProviderConfigurationError([
      {
        kind,
        providerId,
        code: "UNKNOWN_PROVIDER",
        message: `Unknown ${kind} provider "${providerId}"`,
      },
    ]);
  }
  return def;
}

function resolveImageProvider(
  options: ProviderFactoryOptions,
  env: EnvSource,
): ImageProvider {
  if (options.imageProvider === "mock") {
    return new MockImageProvider(options.storage);
  }
  if (options.imageProvider === "openai") {
    return createOpenAiImageFromEnv(options.storage, env);
  }
  if (options.imageProvider === "pollinations") {
    return createPollinationsImageProvider(options.storage, env);
  }
  if (options.imageProvider === "local-http") {
    return createLocalHttpImageProvider(options.storage, env);
  }
  return createStubImageProvider(
    requireDefinition("image", options.imageProvider),
  );
}

function resolveVideoProvider(
  options: ProviderFactoryOptions,
  env: EnvSource,
): VideoProvider {
  if (options.videoProvider === "mock") {
    return new MockVideoProvider(options.storage);
  }
  if (options.videoProvider === "pollinations") {
    return createPollinationsVideoProvider(options.storage, env);
  }
  if (options.videoProvider === "image-motion") {
    return createImageMotionVideoProvider(options.storage, env);
  }
  if (options.videoProvider === "local-http") {
    return createLocalHttpVideoProvider(options.storage, env);
  }
  if (options.videoProvider === "wan") {
    return createWanVideoProvider(options.storage, env);
  }
  return createStubVideoProvider(
    requireDefinition("video", options.videoProvider),
  );
}

function resolveTtsProvider(
  options: ProviderFactoryOptions,
  env: EnvSource,
): TTSProvider {
  if (options.ttsProvider === "mock") {
    return new MockTTSProvider(options.storage);
  }
  if (options.ttsProvider === "piper") {
    return createPiperTtsFromEnv(options.storage, env);
  }
  if (options.ttsProvider === "openai") {
    return createOpenAiTtsFromEnv(options.storage, env);
  }
  if (options.ttsProvider === "sapi") {
    return createSapiTtsProvider(options.storage);
  }
  return createStubTtsProvider(requireDefinition("tts", options.ttsProvider));
}

function resolveMusicProvider(options: ProviderFactoryOptions): MusicProvider {
  if (options.musicProvider === "mock") {
    return new MockMusicProvider(options.storage);
  }
  return createStubMusicProvider(
    requireDefinition("music", options.musicProvider),
  );
}
