import type { Scene } from "@asv/shared";

export interface SceneDto {
  id: string;
  projectId: string;
  sequence: number;
  title: string;
  narration: string;
  visualDescription: string;
  imagePrompt: string;
  videoPrompt: string;
  durationSec: number;
  characterIds: string[];
  locationId: string | null;
  mood: string;
  camera: string;
  lighting: string;
  style: Scene["style"];
  previousSceneContext: string | null;
  nextSceneContext: string | null;
  imageStatus: Scene["imageStatus"];
  videoStatus: Scene["videoStatus"];
  audioStatus: Scene["audioStatus"];
  assetPaths: Scene["assetPaths"];
  createdAt: string;
  updatedAt: string;
}

export function serializeScene(scene: Scene): SceneDto {
  return {
    id: scene.id,
    projectId: scene.projectId,
    sequence: scene.sequence,
    title: scene.title,
    narration: scene.narration,
    visualDescription: scene.visualDescription,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    durationSec: scene.durationSec,
    characterIds: scene.characterIds,
    locationId: scene.locationId,
    mood: scene.mood,
    camera: scene.camera,
    lighting: scene.lighting,
    style: scene.style,
    previousSceneContext: scene.previousSceneContext,
    nextSceneContext: scene.nextSceneContext,
    imageStatus: scene.imageStatus,
    videoStatus: scene.videoStatus,
    audioStatus: scene.audioStatus,
    assetPaths: scene.assetPaths,
    createdAt: scene.createdAt.toISOString(),
    updatedAt: scene.updatedAt.toISOString(),
  };
}
