import type {
  AspectRatio,
  LanguageCode,
  ProjectStatus,
  VisualStyle,
} from "../enums.js";
import type { StoryAnalysis } from "../schemas/story-analysis.js";
import type { MusicSettings, SubtitleSettings, VoiceSettings } from "../settings.js";

export interface Project {
  id: string;
  title: string;
  script: string;
  /** Target output length in seconds (no hard-coded max in domain). */
  targetDurationSec: number;
  actualDurationSec: number | null;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  /** When visualStyle is CUSTOM, user-defined label/description. */
  customVisualStyle: string | null;
  language: LanguageCode;
  voiceSettings: VoiceSettings;
  subtitleSettings: SubtitleSettings;
  musicSettings: MusicSettings;
  status: ProjectStatus;
  /** 0–100 from real job progress (Phase 10+). */
  progress: number;
  storyAnalysis: StoryAnalysis | null;
  storyAnalysisPromptVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  title: string;
  script: string;
  targetDurationSec: number;
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  customVisualStyle?: string | null;
  language: LanguageCode;
  voiceSettings: VoiceSettings;
  subtitleSettings: SubtitleSettings;
  musicSettings: MusicSettings;
}

export type UpdateProjectInput = Partial<
  Omit<CreateProjectInput, "voiceSettings" | "subtitleSettings" | "musicSettings">
> & {
  voiceSettings?: VoiceSettings;
  subtitleSettings?: SubtitleSettings;
  musicSettings?: MusicSettings;
  status?: ProjectStatus;
  progress?: number;
  actualDurationSec?: number | null;
};
