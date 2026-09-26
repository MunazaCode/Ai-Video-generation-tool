import { PROMPT_VERSION, calculateSceneCount, type StoryAnalysis } from "@asv/shared";
import type { LLMProvider, StoryAnalysisLLMInput } from "./types.js";

function splitSentences(script: string): string[] {
  return script
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export class MockLLMProvider implements LLMProvider {
  readonly id = "mock";

  generateStructuredOutput(
    _task: "STORY_ANALYSIS",
    input: StoryAnalysisLLMInput,
  ): Promise<unknown> {
    return Promise.resolve(buildMockStoryAnalysis(input));
  }
}

export function buildMockStoryAnalysis(
  input: StoryAnalysisLLMInput,
): StoryAnalysis {
  const sentences = splitSentences(input.script);
  const fallbackLine =
    input.script.trim() || "An untold story waiting to be visualized.";
  const lines = sentences.length > 0 ? sentences : [fallbackLine];

  const targetSceneDurationSec = 8;
  const sceneCount = Math.max(
    1,
    calculateSceneCount(input.targetDurationSec, targetSceneDurationSec),
  );
  const beats = chunkLines(lines, sceneCount);

  const title = beats[0]?.slice(0, 80) ?? "Untitled story";
  const protagonist = "Story protagonist";
  const forestLocation = "Primary story location";

  const scenes = beats.map((line, index) => {
    const sequence = index + 1;
    return {
      sequence,
      title: `Scene ${String(sequence)}`,
      narration: line,
      visualDescription: cinematicVisualFromNarration(
        line,
        input.visualStyle,
        input.customVisualStyle,
      ),
      durationSec: Math.max(
        1,
        Math.round(input.targetDurationSec / Math.max(beats.length, 1)),
      ),
      mood: sequence === 1 ? "opening" : "developing",
      locationKey: "loc_main",
      characterKeys: ["char_main"],
    };
  });

  return {
    title,
    summary: beats.slice(0, 3).join(" "),
    genre: "Narrative fiction",
    characters: [
      {
        key: "char_main",
        name: protagonist,
        age: null,
        appearance:
          "Consistent lead character appearance across all scenes (mock bible).",
        personality: "Curious and determined",
      },
    ],
    locations: [
      {
        key: "loc_main",
        name: forestLocation,
        description:
          "Canonical location reused in every scene for visual consistency (mock).",
        lighting: "Natural motivated lighting",
        environment: input.customVisualStyle ?? input.visualStyle,
      },
    ],
    importantObjects: beats.some((b) => /house|key|map|letter/i.test(b))
      ? ["Mysterious object referenced in the script"]
      : [],
    timeline: "Linear progression following the script order",
    visualStyleNotes: `Global style: ${input.visualStyle}. ${input.customVisualStyle ?? ""}`.trim(),
    scenes,
    promptVersion: PROMPT_VERSION,
  };
}

function chunkLines(lines: string[], targetCount: number): string[] {
  if (targetCount <= 0) {
    return [];
  }
  if (lines.length <= targetCount) {
    const result = [...lines];
    while (result.length < targetCount) {
      result.push(result[result.length - 1] ?? "Continued.");
    }
    return result.slice(0, targetCount);
  }
  const result: string[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const start = Math.floor((i * lines.length) / targetCount);
    const end = Math.floor(((i + 1) * lines.length) / targetCount);
    result.push(lines.slice(start, Math.max(end, start + 1)).join(" "));
  }
  return result;
}

/** Turn narration into a concrete image prompt (mock LLM path). */
function cinematicVisualFromNarration(
  narration: string,
  visualStyle: string,
  customStyle: string | null | undefined,
): string {
  const style = customStyle?.trim() || visualStyle;
  const lower = narration.toLowerCase();
  const extras: string[] = [];
  if (/sunset|dusk|golden hour|last light/.test(lower)) {
    extras.push("golden hour sunset sky, warm rim light");
  }
  if (/storm|rain|thunder|lightning/.test(lower)) {
    extras.push("heavy rain, storm clouds, wet reflections");
  }
  if (/street.?lamp|lamp.?post|lantern/.test(lower)) {
    extras.push("glowing street lamp in darkness");
  }
  if (/home|house|door|porch|cottage/.test(lower)) {
    extras.push("cozy house exterior, lit windows");
  }
  if (/road|path|street|highway/.test(lower)) {
    extras.push("quiet empty road stretching into the distance");
  }
  if (/walk|walking|alone/.test(lower)) {
    extras.push("lone figure walking away from camera, medium-wide shot");
  }
  return [
    narration.trim(),
    extras.join(", "),
    `${style} cinematic frame, photorealistic, shallow depth of field, no text`,
  ]
    .filter((part) => part.length > 0)
    .join(". ");
}

export function buildInvalidMockPayload(): unknown {
  return {
    title: "",
    summary: "missing required fields",
  };
}
