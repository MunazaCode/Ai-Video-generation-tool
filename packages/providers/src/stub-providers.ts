import type { GeneratedAssetMeta, ImageGenerationRequest, ImageProvider } from "./image/types.js";
import type { LLMProvider, LLMTaskType, StoryAnalysisLLMInput } from "./llm/types.js";
import type { MusicGenerationRequest, MusicProvider } from "./music/types.js";
import type { ProviderDefinition } from "./provider-registry.js";
import { ProviderNotImplementedError } from "./provider-errors.js";
import type { TtsGenerationRequest, TTSProvider } from "./tts/types.js";
import type { VideoGenerationRequest, VideoProvider } from "./video/types.js";

export function createStubLLMProvider(def: ProviderDefinition): LLMProvider {
  return {
    id: def.id,
    generateStructuredOutput(
      _task: LLMTaskType,
      _input: StoryAnalysisLLMInput,
    ): Promise<unknown> {
      return Promise.reject(
        new ProviderNotImplementedError("llm", def.id, def.phaseNote),
      );
    },
  };
}

export function createStubImageProvider(def: ProviderDefinition): ImageProvider {
  return {
    id: def.id,
    generateImage(_request: ImageGenerationRequest): Promise<GeneratedAssetMeta> {
      return Promise.reject(
        new ProviderNotImplementedError("image", def.id, def.phaseNote),
      );
    },
  };
}

export function createStubVideoProvider(def: ProviderDefinition): VideoProvider {
  return {
    id: def.id,
    generateVideo(_request: VideoGenerationRequest): Promise<GeneratedAssetMeta> {
      return Promise.reject(
        new ProviderNotImplementedError("video", def.id, def.phaseNote),
      );
    },
  };
}

export function createStubTtsProvider(def: ProviderDefinition): TTSProvider {
  return {
    id: def.id,
    generateSpeech(_request: TtsGenerationRequest): Promise<GeneratedAssetMeta> {
      return Promise.reject(
        new ProviderNotImplementedError("tts", def.id, def.phaseNote),
      );
    },
  };
}

export function createStubMusicProvider(def: ProviderDefinition): MusicProvider {
  return {
    id: def.id,
    generateMusic(_request: MusicGenerationRequest): Promise<GeneratedAssetMeta> {
      return Promise.reject(
        new ProviderNotImplementedError("music", def.id, def.phaseNote),
      );
    },
  };
}
