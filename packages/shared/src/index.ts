export { APP_NAME, APP_VERSION, PROMPT_VERSION } from "./constants.js";
export type { AppMode } from "./constants.js";

export {
  AspectRatio,
  JobStatus,
  JobType,
  LanguageCode,
  ProjectStatus,
  SceneAssetStatus,
  VisualStyle,
  VoiceGender,
} from "./enums.js";
export type {
  AspectRatio as AspectRatioType,
  JobStatus as JobStatusType,
  JobType as JobTypeType,
  LanguageCode as LanguageCodeType,
  ProjectStatus as ProjectStatusType,
  SceneAssetStatus as SceneAssetStatusType,
  VisualStyle as VisualStyleType,
  VoiceGender as VoiceGenderType,
} from "./enums.js";

export type {
  MusicSettings,
  SubtitleSettings,
  VoiceSettings,
} from "./settings.js";

export type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "./domain/project.js";
export type {
  CreateSceneInput,
  Scene,
  SceneAssetPaths,
} from "./domain/scene.js";
export type { CreateJobInput, Job, JobError } from "./domain/job.js";
export type { Character } from "./domain/character.js";
export type { Location } from "./domain/location.js";

export {
  assertProjectStatusTransition,
  canTransitionProjectStatus,
  isTerminalProjectStatus,
} from "./status/project-status-machine.js";
export {
  assertJobStatusTransition,
  canTransitionJobStatus,
  isTerminalJobStatus,
} from "./status/job-status-machine.js";

export {
  MAX_JOB_ATTEMPTS,
  JOB_BACKOFF_MS,
  getJobBackoffMs,
  DEFAULT_WORKER_STALE_JOB_MS,
  shouldRetryJob,
} from "./job-retry.js";

export {
  SCRIPT_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
  createProjectBodySchema,
  updateProjectBodySchema,
  voiceSettingsSchema,
  subtitleSettingsSchema,
  musicSettingsSchema,
} from "./schemas/project.js";
export type {
  CreateProjectBody,
  UpdateProjectBody,
} from "./schemas/project.js";

export {
  storyAnalysisSchema,
  storyAnalysisSceneSchema,
} from "./schemas/story-analysis.js";
export type {
  StoryAnalysis,
  StoryAnalysisScene,
} from "./schemas/story-analysis.js";

export {
  calculateSceneCount,
  distributeSceneDurations,
  sumDurations,
  ScenePlannerConfigError,
} from "./scene-planner/math.js";

export {
  buildProjectSubtitleCues,
  buildSceneSubtitleCues,
  formatSrtTimestamp,
  formatVttTimestamp,
  projectSubtitleSrtRelativePath,
  projectSubtitleVttRelativePath,
  renderSrt,
  renderVtt,
  sanitizeSubtitleText,
  sceneSubtitleSrtRelativePath,
  sceneSubtitleVttRelativePath,
} from "./subtitles/format.js";
export type {
  SceneSubtitleInput,
  SubtitleCue,
} from "./subtitles/format.js";

export {
  canRegenerateSingleScene,
  canResumeGeneration,
  inferGenerationResumeStatus,
  sceneNeedsGenerationJob,
  summarizeSceneAssets,
} from "./generation/scene-jobs.js";
export type { SceneJobSnapshot } from "./generation/scene-jobs.js";
export {
  isRealTextToVideoProvider,
  videoProviderRequiresSourceImage,
} from "./generation/video-provider.js";
