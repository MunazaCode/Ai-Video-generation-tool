import { PROMPT_VERSION } from "@asv/shared";

export { createStoryAnalyzer, StoryAnalyzerService } from "./story-analyzer.js";
export type { StoryAnalyzer } from "./story-analyzer.js";
export {
  storyAnalyzerSystemPrompt,
  storyAnalyzerUserPrompt,
  STORY_ANALYZER_PROMPT_VERSION,
} from "./prompts/story-analyzer.js";
export { parseStructuredOutput } from "./structured-output.js";
export { planScenesFromAnalysis } from "./scene-planner/planner.js";
export type { ScenePlannerInput, ScenePlanResult } from "./scene-planner/planner.js";
export {
  scenePlannerRulesPrompt,
  SCENE_PLANNER_PROMPT_VERSION,
} from "./prompts/scene-planner.js";

export function aiPackageReady(): string {
  return `Story analyzer + prompts v${PROMPT_VERSION}`;
}
