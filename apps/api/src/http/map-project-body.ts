import type {
  CreateProjectBody,
  CreateProjectInput,
  UpdateProjectBody,
  UpdateProjectInput,
} from "@asv/shared";

export function toCreateProjectInput(body: CreateProjectBody): CreateProjectInput {
  return {
    title: body.title,
    script: body.script,
    targetDurationSec: body.targetDurationSec,
    aspectRatio: body.aspectRatio,
    visualStyle: body.visualStyle,
    customVisualStyle: body.customVisualStyle ?? null,
    language: body.language,
    voiceSettings: body.voiceSettings,
    subtitleSettings: body.subtitleSettings,
    musicSettings: body.musicSettings,
  };
}

export function toUpdateProjectInput(body: UpdateProjectBody): UpdateProjectInput {
  const input: UpdateProjectInput = {};

  if (body.title !== undefined) input.title = body.title;
  if (body.script !== undefined) input.script = body.script;
  if (body.targetDurationSec !== undefined) {
    input.targetDurationSec = body.targetDurationSec;
  }
  if (body.aspectRatio !== undefined) input.aspectRatio = body.aspectRatio;
  if (body.visualStyle !== undefined) input.visualStyle = body.visualStyle;
  if (body.customVisualStyle !== undefined) {
    input.customVisualStyle = body.customVisualStyle;
  }
  if (body.language !== undefined) input.language = body.language;
  if (body.voiceSettings !== undefined) input.voiceSettings = body.voiceSettings;
  if (body.subtitleSettings !== undefined) {
    input.subtitleSettings = body.subtitleSettings;
  }
  if (body.musicSettings !== undefined) input.musicSettings = body.musicSettings;
  if (body.status !== undefined) input.status = body.status;
  if (body.progress !== undefined) input.progress = body.progress;
  if (body.actualDurationSec !== undefined) {
    input.actualDurationSec = body.actualDurationSec;
  }

  return input;
}
