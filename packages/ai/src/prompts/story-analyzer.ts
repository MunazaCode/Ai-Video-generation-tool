import { PROMPT_VERSION } from "@asv/shared";

export const STORY_ANALYZER_PROMPT_VERSION = PROMPT_VERSION;

export function storyAnalyzerSystemPrompt(): string {
  return `You are a story analyst for long-form video production.
Return ONLY JSON matching the StoryAnalysis schema.
Identify title, summary, genre, characters, locations, objects, timeline, visual style notes, and ordered scenes with narration and visual descriptions.
Scene sequence must start at 1 and increase by 1 without gaps.
Reuse canonical character and location descriptions across scenes.
Prompt version: ${STORY_ANALYZER_PROMPT_VERSION}.`;
}

export function storyAnalyzerUserPrompt(script: string): string {
  return `Analyze the following script and produce structured story analysis JSON:\n\n${script}`;
}
