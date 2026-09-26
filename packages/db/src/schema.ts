import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  script: text("script").notNull().default(""),
  targetDurationSec: integer("target_duration_sec").notNull(),
  actualDurationSec: integer("actual_duration_sec"),
  aspectRatio: text("aspect_ratio").notNull(),
  visualStyle: text("visual_style").notNull(),
  customVisualStyle: text("custom_visual_style"),
  language: text("language").notNull(),
  voiceSettingsJson: text("voice_settings_json").notNull(),
  subtitleSettingsJson: text("subtitle_settings_json").notNull(),
  musicSettingsJson: text("music_settings_json").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  storyAnalysisJson: text("story_analysis_json"),
  storyAnalysisPromptVersion: text("story_analysis_prompt_version"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const scenes = sqliteTable(
  "scenes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    title: text("title").notNull(),
    narration: text("narration").notNull().default(""),
    visualDescription: text("visual_description").notNull().default(""),
    imagePrompt: text("image_prompt").notNull().default(""),
    videoPrompt: text("video_prompt").notNull().default(""),
    durationSec: integer("duration_sec").notNull(),
    characterIdsJson: text("character_ids_json").notNull().default("[]"),
    locationId: text("location_id"),
    mood: text("mood").notNull().default(""),
    camera: text("camera").notNull().default(""),
    lighting: text("lighting").notNull().default(""),
    style: text("style"),
    previousSceneContext: text("previous_scene_context"),
    nextSceneContext: text("next_scene_context"),
    imageStatus: text("image_status").notNull(),
    videoStatus: text("video_status").notNull(),
    audioStatus: text("audio_status").notNull(),
    assetPathsJson: text("asset_paths_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("scenes_project_sequence_idx").on(table.projectId, table.sequence),
  ],
);

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: text("age"),
  appearance: text("appearance").notNull().default(""),
  clothing: text("clothing").notNull().default(""),
  hairstyle: text("hairstyle").notNull().default(""),
  skinDescription: text("skin_description").notNull().default(""),
  personality: text("personality").notNull().default(""),
  visualIdentity: text("visual_identity").notNull().default(""),
  referenceImagePath: text("reference_image_path"),
  negativePrompt: text("negative_prompt").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  visualIdentity: text("visual_identity").notNull().default(""),
  lighting: text("lighting").notNull().default(""),
  architecture: text("architecture").notNull().default(""),
  environment: text("environment").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  currentStep: text("current_step"),
  attempts: integer("attempts").notNull().default(0),
  errorJson: text("error_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

export const schemaVersion = sqliteTable("schema_meta", {
  id: integer("id").primaryKey().default(1),
  version: integer("version").notNull().default(1),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});
