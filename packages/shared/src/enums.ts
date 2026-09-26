/** Project lifecycle — use these literals only; do not use arbitrary status strings. */
export const ProjectStatus = {
  DRAFT: "DRAFT",
  ANALYZING: "ANALYZING",
  PLANNING: "PLANNING",
  GENERATING_STORYBOARD: "GENERATING_STORYBOARD",
  GENERATING_IMAGES: "GENERATING_IMAGES",
  GENERATING_VIDEO: "GENERATING_VIDEO",
  GENERATING_AUDIO: "GENERATING_AUDIO",
  ASSEMBLING: "ASSEMBLING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type ProjectStatus =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const JobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobType = {
  ANALYZE_SCRIPT: "ANALYZE_SCRIPT",
  PLAN_SCENES: "PLAN_SCENES",
  GENERATE_IMAGE: "GENERATE_IMAGE",
  GENERATE_VIDEO: "GENERATE_VIDEO",
  GENERATE_AUDIO: "GENERATE_AUDIO",
  GENERATE_SUBTITLES: "GENERATE_SUBTITLES",
  ASSEMBLE_VIDEO: "ASSEMBLE_VIDEO",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const SceneAssetStatus = {
  PENDING: "PENDING",
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;

export type SceneAssetStatus =
  (typeof SceneAssetStatus)[keyof typeof SceneAssetStatus];

export const AspectRatio = {
  R16_9: "16:9",
  R9_16: "9:16",
  R1_1: "1:1",
} as const;

export type AspectRatio = (typeof AspectRatio)[keyof typeof AspectRatio];

export const VisualStyle = {
  CINEMATIC: "CINEMATIC",
  REALISTIC: "REALISTIC",
  ANIME: "ANIME",
  ANIMATION_3D: "ANIMATION_3D",
  CARTOON: "CARTOON",
  DOCUMENTARY: "DOCUMENTARY",
  FANTASY: "FANTASY",
  HORROR: "HORROR",
  SCI_FI: "SCI_FI",
  CUSTOM: "CUSTOM",
} as const;

export type VisualStyle = (typeof VisualStyle)[keyof typeof VisualStyle];

export const VoiceGender = {
  FEMALE: "FEMALE",
  MALE: "MALE",
  NEUTRAL: "NEUTRAL",
} as const;

export type VoiceGender = (typeof VoiceGender)[keyof typeof VoiceGender];

export const LanguageCode = {
  EN: "en",
  UR: "ur",
} as const;

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode];
