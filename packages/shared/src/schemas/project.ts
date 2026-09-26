import { z } from "zod";
import {
  AspectRatio,
  LanguageCode,
  ProjectStatus,
  VisualStyle,
  VoiceGender,
} from "../enums.js";

export const SCRIPT_MAX_LENGTH = 100_000;
export const PROJECT_TITLE_MAX_LENGTH = 200;

const aspectRatioSchema = z.enum([
  AspectRatio.R16_9,
  AspectRatio.R9_16,
  AspectRatio.R1_1,
]);

const visualStyleSchema = z.enum([
  VisualStyle.CINEMATIC,
  VisualStyle.REALISTIC,
  VisualStyle.ANIME,
  VisualStyle.ANIMATION_3D,
  VisualStyle.CARTOON,
  VisualStyle.DOCUMENTARY,
  VisualStyle.FANTASY,
  VisualStyle.HORROR,
  VisualStyle.SCI_FI,
  VisualStyle.CUSTOM,
]);

const languageCodeSchema = z.enum([LanguageCode.EN, LanguageCode.UR]);

const voiceGenderSchema = z.enum([
  VoiceGender.FEMALE,
  VoiceGender.MALE,
  VoiceGender.NEUTRAL,
]);

export const voiceSettingsSchema = z.object({
  gender: voiceGenderSchema,
  language: languageCodeSchema,
});

export const subtitleSettingsSchema = z.object({
  enabled: z.boolean(),
});

export const musicSettingsSchema = z.object({
  enabled: z.boolean(),
  volume: z.number().min(0).max(1).default(0.2),
});

export const createProjectBodySchema = z
  .object({
    title: z.string().trim().min(1).max(PROJECT_TITLE_MAX_LENGTH),
    script: z.string().max(SCRIPT_MAX_LENGTH).default(""),
    targetDurationSec: z.number().int().positive(),
    aspectRatio: aspectRatioSchema.default(AspectRatio.R16_9),
    visualStyle: visualStyleSchema,
    customVisualStyle: z.string().trim().max(500).nullable().optional(),
    language: languageCodeSchema,
    voiceSettings: voiceSettingsSchema,
    subtitleSettings: subtitleSettingsSchema.default({ enabled: true }),
    musicSettings: musicSettingsSchema.default({ enabled: false, volume: 0.2 }),
  })
  .superRefine((value, ctx) => {
    if (
      value.visualStyle === VisualStyle.CUSTOM &&
      (!value.customVisualStyle || value.customVisualStyle.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "customVisualStyle is required when visualStyle is CUSTOM",
        path: ["customVisualStyle"],
      });
    }
  });

export const updateProjectBodySchema = z
  .object({
    title: z.string().trim().min(1).max(PROJECT_TITLE_MAX_LENGTH).optional(),
    script: z.string().max(SCRIPT_MAX_LENGTH).optional(),
    targetDurationSec: z.number().int().positive().optional(),
    aspectRatio: aspectRatioSchema.optional(),
    visualStyle: visualStyleSchema.optional(),
    customVisualStyle: z.string().trim().max(500).nullable().optional(),
    language: languageCodeSchema.optional(),
    voiceSettings: voiceSettingsSchema.optional(),
    subtitleSettings: subtitleSettingsSchema.optional(),
    musicSettings: musicSettingsSchema.optional(),
    status: z
      .enum([
        ProjectStatus.DRAFT,
        ProjectStatus.ANALYZING,
        ProjectStatus.PLANNING,
        ProjectStatus.GENERATING_STORYBOARD,
        ProjectStatus.GENERATING_IMAGES,
        ProjectStatus.GENERATING_VIDEO,
        ProjectStatus.GENERATING_AUDIO,
        ProjectStatus.ASSEMBLING,
        ProjectStatus.PROCESSING,
        ProjectStatus.COMPLETED,
        ProjectStatus.FAILED,
        ProjectStatus.CANCELLED,
      ])
      .optional(),
    progress: z.number().int().min(0).max(100).optional(),
    actualDurationSec: z.number().int().nonnegative().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
        path: [],
      });
    }
  });

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;
