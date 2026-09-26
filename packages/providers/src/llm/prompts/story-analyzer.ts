import { PROMPT_VERSION } from "@asv/shared";

export function storyAnalyzerSystemPrompt(): string {
  return `You are a story analyst for long-form video production.
Return ONLY JSON matching the StoryAnalysis schema.
Identify title, summary, genre, characters, locations, objects, timeline, visual style notes, and ordered scenes with narration and visual descriptions.
Scene sequence must start at 1 and increase by 1 without gaps.
Reuse canonical character and location descriptions across scenes.
Include promptVersion "${PROMPT_VERSION}" in the JSON.
Prompt version: ${PROMPT_VERSION}.`;
}

export function storyAnalyzerUserPrompt(input: {
  script: string;
  language: string;
  visualStyle: string;
  customVisualStyle: string | null;
  targetDurationSec: number;
}): string {
  const styleLine =
    input.customVisualStyle?.trim() ?
      `Visual style: ${input.visualStyle} (${input.customVisualStyle.trim()})`
    : `Visual style: ${input.visualStyle}`;
  return `Language: ${input.language}
${styleLine}
Target duration (seconds): ${String(input.targetDurationSec)}

Analyze the script and return StoryAnalysis JSON:

${input.script}`;
}
