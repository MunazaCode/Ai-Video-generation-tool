import {
  LanguageCode,
  VoiceGender,
  type Job,
  type JobError,
  type MusicSettings,
  type Project,
  type Scene,
  type SceneAssetPaths,
  type SubtitleSettings,
  storyAnalysisSchema,
  type StoryAnalysis,
  type VoiceSettings,
} from "@asv/shared";
import type { jobs, projects, scenes } from "./schema.js";

type ProjectRow = typeof projects.$inferSelect;
type SceneRow = typeof scenes.$inferSelect;
type JobRow = typeof jobs.$inferSelect;

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    script: row.script,
    targetDurationSec: row.targetDurationSec,
    actualDurationSec: row.actualDurationSec,
    aspectRatio: row.aspectRatio as Project["aspectRatio"],
    visualStyle: row.visualStyle as Project["visualStyle"],
    customVisualStyle: row.customVisualStyle,
    language: row.language as Project["language"],
    voiceSettings: parseJson<VoiceSettings>(row.voiceSettingsJson, {
      gender: VoiceGender.FEMALE,
      language: LanguageCode.EN,
    }),
    subtitleSettings: parseJson<SubtitleSettings>(row.subtitleSettingsJson, {
      enabled: true,
    }),
    musicSettings: parseJson<MusicSettings>(row.musicSettingsJson, {
      enabled: false,
      volume: 0.2,
    }),
    status: row.status as Project["status"],
    progress: row.progress,
    storyAnalysis: row.storyAnalysisJson
      ? parseStoryAnalysis(row.storyAnalysisJson)
      : null,
    storyAnalysisPromptVersion: row.storyAnalysisPromptVersion,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function parseStoryAnalysis(json: string): StoryAnalysis | null {
  try {
    const parsed = storyAnalysisSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function mapSceneRow(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.projectId,
    sequence: row.sequence,
    title: row.title,
    narration: row.narration,
    visualDescription: row.visualDescription,
    imagePrompt: row.imagePrompt,
    videoPrompt: row.videoPrompt,
    durationSec: row.durationSec,
    characterIds: parseJson<string[]>(row.characterIdsJson, []),
    locationId: row.locationId,
    mood: row.mood,
    camera: row.camera,
    lighting: row.lighting,
    style: row.style as Scene["style"],
    previousSceneContext: row.previousSceneContext,
    nextSceneContext: row.nextSceneContext,
    imageStatus: row.imageStatus as Scene["imageStatus"],
    videoStatus: row.videoStatus as Scene["videoStatus"],
    audioStatus: row.audioStatus as Scene["audioStatus"],
    assetPaths: parseJson<SceneAssetPaths>(row.assetPathsJson, {}),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function mapJobRow(row: JobRow): Job {
  return {
    id: row.id,
    projectId: row.projectId,
    sceneId: row.sceneId,
    type: row.type as Job["type"],
    status: row.status as Job["status"],
    progress: row.progress,
    currentStep: row.currentStep,
    attempts: row.attempts,
    error: row.errorJson
      ? parseJson<JobError | null>(row.errorJson, null)
      : null,
    createdAt: new Date(row.createdAt),
    startedAt: row.startedAt ? new Date(row.startedAt) : null,
    completedAt: row.completedAt ? new Date(row.completedAt) : null,
  };
}
