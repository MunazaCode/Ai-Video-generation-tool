import type { GeneratedAssetMeta } from "../image/types.js";

export interface MusicGenerationRequest {
  projectId: string;
  durationSec: number;
  mood: string;
}

export interface MusicProvider {
  readonly id: string;
  generateMusic(request: MusicGenerationRequest): Promise<GeneratedAssetMeta>;
}
