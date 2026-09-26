import type { Project, StoryAnalysis } from "@asv/shared";

export interface ProjectDto {
  id: string;
  title: string;
  script: string;
  targetDurationSec: number;
  actualDurationSec: number | null;
  aspectRatio: Project["aspectRatio"];
  visualStyle: Project["visualStyle"];
  customVisualStyle: string | null;
  language: Project["language"];
  voiceSettings: Project["voiceSettings"];
  subtitleSettings: Project["subtitleSettings"];
  musicSettings: Project["musicSettings"];
  status: Project["status"];
  progress: number;
  storyAnalysis: StoryAnalysis | null;
  storyAnalysisPromptVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeProject(project: Project): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    script: project.script,
    targetDurationSec: project.targetDurationSec,
    actualDurationSec: project.actualDurationSec,
    aspectRatio: project.aspectRatio,
    visualStyle: project.visualStyle,
    customVisualStyle: project.customVisualStyle,
    language: project.language,
    voiceSettings: project.voiceSettings,
    subtitleSettings: project.subtitleSettings,
    musicSettings: project.musicSettings,
    status: project.status,
    progress: project.progress,
    storyAnalysis: project.storyAnalysis,
    storyAnalysisPromptVersion: project.storyAnalysisPromptVersion,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
