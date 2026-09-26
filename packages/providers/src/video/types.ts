import type { GeneratedAssetMeta } from "../image/types.js";

export interface VideoGenerationRequest {
  projectId: string;
  sceneId: string;
  prompt: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  /** Scene sequence for deterministic Ken Burns motion variation. */
  sequence?: number;
  /** Required by image-motion: relative path of the scene still. */
  sourceImageRelativePath?: string;
}

export interface VideoProvider {
  readonly id: string;
  generateVideo(request: VideoGenerationRequest): Promise<GeneratedAssetMeta>;
}
