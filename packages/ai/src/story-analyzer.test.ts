import { MockLLMProvider } from "@asv/providers";
import { LanguageCode, VisualStyle } from "@asv/shared";
import { describe, expect, it } from "vitest";
import { createStoryAnalyzer } from "./story-analyzer.js";

describe("StoryAnalyzerService", () => {
  it("returns validated structured analysis from mock LLM", async () => {
    const analyzer = createStoryAnalyzer(new MockLLMProvider());
    const result = await analyzer.analyze({
      script: "A boy walks through a forest. He hears a strange sound.",
      language: LanguageCode.EN,
      visualStyle: VisualStyle.CINEMATIC,
      customVisualStyle: null,
      targetDurationSec: 120,
    });

    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.scenes[0]?.sequence).toBe(1);
    expect(result.promptVersion).toBe("1.0.0");
  });
});
