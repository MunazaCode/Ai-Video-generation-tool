import { JobType, ProjectStatus, SceneAssetStatus } from "../enums.js";
import type { SceneAssetPaths } from "../domain/scene.js";

/** Minimal scene fields for incremental generation planning. */
export interface SceneJobSnapshot {
  id: string;
  imageStatus: SceneAssetStatus;
  videoStatus: SceneAssetStatus;
  audioStatus: SceneAssetStatus;
  assetPaths: SceneAssetPaths;
}

export function sceneNeedsGenerationJob(
  scene: SceneJobSnapshot,
  type: JobType,
  options: { subtitlesEnabled?: boolean },
): boolean {
  switch (type) {
    case JobType.GENERATE_IMAGE:
      return (
        scene.imageStatus !== SceneAssetStatus.COMPLETED ||
        !scene.assetPaths.image
      );
    case JobType.GENERATE_VIDEO:
      return (
        scene.videoStatus !== SceneAssetStatus.COMPLETED ||
        !scene.assetPaths.video
      );
    case JobType.GENERATE_AUDIO:
      return (
        scene.audioStatus !== SceneAssetStatus.COMPLETED ||
        !scene.assetPaths.audio
      );
    case JobType.GENERATE_SUBTITLES:
      if (!options.subtitlesEnabled) {
        return false;
      }
      return !scene.assetPaths.subtitleVtt;
    default:
      return false;
  }
}

const RESUME_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  ProjectStatus.FAILED,
  ProjectStatus.CANCELLED,
  ProjectStatus.PROCESSING,
  ProjectStatus.GENERATING_IMAGES,
  ProjectStatus.GENERATING_VIDEO,
  ProjectStatus.GENERATING_AUDIO,
  ProjectStatus.ASSEMBLING,
]);

export function canResumeGeneration(status: ProjectStatus): boolean {
  return RESUME_STATUSES.has(status);
}

const SCENE_REGEN_STATUSES: ReadonlySet<ProjectStatus> = new Set([
  ProjectStatus.COMPLETED,
  ProjectStatus.FAILED,
  ProjectStatus.CANCELLED,
  ProjectStatus.PROCESSING,
]);

/** True when a finished (or stalled) project may regenerate one scene. */
export function canRegenerateSingleScene(status: ProjectStatus): boolean {
  return SCENE_REGEN_STATUSES.has(status);
}

export interface GenerationResumeOptions {
  /** When true, skip the image stage (text-to-video providers). */
  skipImageJobs?: boolean;
}

export function inferGenerationResumeStatus(
  scenes: SceneJobSnapshot[],
  subtitlesEnabled: boolean,
  options: GenerationResumeOptions = {},
): ProjectStatus {
  if (
    !options.skipImageJobs &&
    scenes.some((s) => sceneNeedsGenerationJob(s, JobType.GENERATE_IMAGE, {}))
  ) {
    return ProjectStatus.GENERATING_IMAGES;
  }
  if (scenes.some((s) => sceneNeedsGenerationJob(s, JobType.GENERATE_VIDEO, {}))) {
    return ProjectStatus.GENERATING_VIDEO;
  }
  if (scenes.some((s) => sceneNeedsGenerationJob(s, JobType.GENERATE_AUDIO, {}))) {
    return ProjectStatus.GENERATING_AUDIO;
  }
  if (
    subtitlesEnabled &&
    scenes.some((s) =>
      sceneNeedsGenerationJob(s, JobType.GENERATE_SUBTITLES, { subtitlesEnabled }),
    )
  ) {
    return ProjectStatus.GENERATING_AUDIO;
  }
  return ProjectStatus.ASSEMBLING;
}

export function summarizeSceneAssets(scenes: SceneJobSnapshot[]): {
  total: number;
  imagesComplete: number;
  videosComplete: number;
  audioComplete: number;
  subtitlesComplete: number;
} {
  return {
    total: scenes.length,
    imagesComplete: scenes.filter((s) => s.imageStatus === SceneAssetStatus.COMPLETED)
      .length,
    videosComplete: scenes.filter((s) => s.videoStatus === SceneAssetStatus.COMPLETED)
      .length,
    audioComplete: scenes.filter((s) => s.audioStatus === SceneAssetStatus.COMPLETED)
      .length,
    subtitlesComplete: scenes.filter((s) => Boolean(s.assetPaths.subtitleVtt)).length,
  };
}
