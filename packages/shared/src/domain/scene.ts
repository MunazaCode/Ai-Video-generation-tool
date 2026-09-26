import type { SceneAssetStatus, VisualStyle } from "../enums.js";

export interface SceneAssetPaths {
  image?: string;
  video?: string;
  audio?: string;
  subtitleSrt?: string;
  subtitleVtt?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  /** Deterministic order — never rely on insertion order. */
  sequence: number;
  title: string;
  narration: string;
  visualDescription: string;
  imagePrompt: string;
  videoPrompt: string;
  durationSec: number;
  /** Character bible IDs referenced in this scene. */
  characterIds: string[];
  locationId: string | null;
  mood: string;
  camera: string;
  lighting: string;
  style: VisualStyle | null;
  previousSceneContext: string | null;
  nextSceneContext: string | null;
  imageStatus: SceneAssetStatus;
  videoStatus: SceneAssetStatus;
  audioStatus: SceneAssetStatus;
  assetPaths: SceneAssetPaths;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSceneInput = Omit<
  Scene,
  "id" | "createdAt" | "updatedAt" | "assetPaths"
> & {
  assetPaths?: SceneAssetPaths;
};
