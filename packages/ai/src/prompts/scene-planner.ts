import { PROMPT_VERSION } from "@asv/shared";

export const SCENE_PLANNER_PROMPT_VERSION = PROMPT_VERSION;

export function scenePlannerRulesPrompt(): string {
  return `Scene planning rules v${SCENE_PLANNER_PROMPT_VERSION}:
- Scene count = ceil(targetDurationSec / targetSceneDurationSec)
- Preserve story order from analysis scenes
- Reuse character and location bible entries by stable keys
- Each scene includes narration, visual description, mood, and continuity context`;
}
