import { z } from "zod";

export const storyAnalysisCharacterSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  age: z.string().nullable().optional(),
  appearance: z.string().min(1),
  personality: z.string().default(""),
});

export const storyAnalysisLocationSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  lighting: z.string().default(""),
  environment: z.string().default(""),
});

export const storyAnalysisSceneSchema = z.object({
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  narration: z.string().min(1),
  visualDescription: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
  mood: z.string().default(""),
  locationKey: z.string().nullable().optional(),
  characterKeys: z.array(z.string()).default([]),
});

export const storyAnalysisSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  genre: z.string().min(1),
  characters: z.array(storyAnalysisCharacterSchema).default([]),
  locations: z.array(storyAnalysisLocationSchema).default([]),
  importantObjects: z.array(z.string()).default([]),
  timeline: z.string().min(1),
  visualStyleNotes: z.string().min(1),
  scenes: z.array(storyAnalysisSceneSchema).min(1),
  promptVersion: z.string().min(1),
});

export type StoryAnalysis = z.infer<typeof storyAnalysisSchema>;
export type StoryAnalysisScene = z.infer<typeof storyAnalysisSceneSchema>;
