import type { LanguageCode, VisualStyle } from "@asv/shared";

export interface StoryAnalysisLLMInput {
  script: string;
  language: LanguageCode;
  visualStyle: VisualStyle;
  customVisualStyle: string | null;
  targetDurationSec: number;
}

export type LLMTaskType = "STORY_ANALYSIS";

export interface LLMProvider {
  readonly id: string;
  generateStructuredOutput(
    task: LLMTaskType,
    input: StoryAnalysisLLMInput,
  ): Promise<unknown>;
}
