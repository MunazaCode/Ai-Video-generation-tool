import type { LLMProvider, StoryAnalysisLLMInput } from "@asv/providers";
import {
  storyAnalysisSchema,
  type StoryAnalysis,
  type VisualStyle,
} from "@asv/shared";
import { parseStructuredOutput } from "./structured-output.js";

export interface StoryAnalyzer {
  analyze(input: StoryAnalysisLLMInput): Promise<StoryAnalysis>;
}

export class StoryAnalyzerService implements StoryAnalyzer {
  constructor(private readonly llm: LLMProvider) {}

  analyze(input: StoryAnalysisLLMInput): Promise<StoryAnalysis> {
    return this.runWithValidation(input);
  }

  private async runWithValidation(
    input: StoryAnalysisLLMInput,
  ): Promise<StoryAnalysis> {
    const result = await parseStructuredOutput({
      schema: storyAnalysisSchema,
      maxAttempts: 3,
      fetchRaw: async () =>
        this.llm.generateStructuredOutput("STORY_ANALYSIS", input),
      repair: (raw) => repairStoryAnalysis(raw, input.visualStyle),
    });

    if (!result.ok) {
      throw new Error(`Story analysis validation failed: ${result.message}`);
    }

    return result.data;
  }
}

function repairStoryAnalysis(raw: unknown, visualStyle: VisualStyle): unknown {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }
  const record = raw as Record<string, unknown>;
  const title = record.title;
  const summary = record.summary;
  const genre = record.genre;
  const timeline = record.timeline;
  const visualStyleNotes = record.visualStyleNotes;
  const scenes = record.scenes;
  const promptVersion = record.promptVersion;

  return {
    ...record,
    title: typeof title === "string" && title.length > 0 ? title : "Untitled story",
    summary:
      typeof summary === "string" && summary.length > 0 ? summary : "Summary pending",
    genre: typeof genre === "string" && genre.length > 0 ? genre : "General",
    timeline:
      typeof timeline === "string" && timeline.length > 0 ? timeline : "Linear",
    visualStyleNotes:
      typeof visualStyleNotes === "string" && visualStyleNotes.length > 0
        ? visualStyleNotes
        : visualStyle,
    scenes: Array.isArray(scenes) ? scenes : [],
    promptVersion:
      typeof promptVersion === "string" ? promptVersion : "1.0.0",
  };
}

export function createStoryAnalyzer(llm: LLMProvider): StoryAnalyzer {
  return new StoryAnalyzerService(llm);
}
