import type { GeneratedAssetMeta } from "../image/types.js";

export interface TtsGenerationRequest {
  projectId: string;
  sceneId: string;
  text: string;
  language: string;
  voiceGender: string;
  /** Planned scene length; mock TTS uses this so total runtime matches target duration. */
  targetDurationSec?: number;
}

export interface TTSProvider {
  readonly id: string;
  generateSpeech(request: TtsGenerationRequest): Promise<GeneratedAssetMeta>;
}
