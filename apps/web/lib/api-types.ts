import type { ProjectStatus, StoryAnalysis } from "@asv/shared";

export interface ProjectDto {
  id: string;
  title: string;
  script: string;
  targetDurationSec: number;
  actualDurationSec: number | null;
  aspectRatio: string;
  visualStyle: string;
  customVisualStyle: string | null;
  language: string;
  voiceSettings: { gender: string; language: string };
  subtitleSettings: { enabled: boolean };
  musicSettings: { enabled: boolean; volume?: number };
  status: ProjectStatus;
  progress: number;
  storyAnalysis: StoryAnalysis | null;
  storyAnalysisPromptVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
