import { VisualStyle, type StoryAnalysis } from "@asv/shared";
import { describe, expect, it } from "vitest";
import { planScenesFromAnalysis } from "./planner.js";

const analysisFixture: StoryAnalysis = {
  title: "Forest journey",
  summary: "A girl explores a forest and finds a house.",
  genre: "Adventure",
  characters: [
    {
      key: "char_main",
      name: "Mira",
      age: "10",
      appearance: "Young girl with a red coat",
      personality: "Brave",
    },
  ],
  locations: [
    {
      key: "loc_forest",
      name: "Forest",
      description: "Dense trees and mist",
      lighting: "Dappled daylight",
      environment: "Woodland",
    },
  ],
  importantObjects: [],
  timeline: "Linear",
  visualStyleNotes: "Cinematic",
  promptVersion: "1.0.0",
  scenes: [
    {
      sequence: 1,
      title: "Enter forest",
      narration: "Mira enters the forest.",
      visualDescription: "Girl walks among tall trees.",
      mood: "curious",
      locationKey: "loc_forest",
      characterKeys: ["char_main"],
    },
    {
      sequence: 2,
      title: "Strange sound",
      narration: "She hears a strange sound.",
      visualDescription: "She pauses and listens.",
      mood: "tense",
      locationKey: "loc_forest",
      characterKeys: ["char_main"],
    },
    {
      sequence: 3,
      title: "Abandoned house",
      narration: "An abandoned house appears.",
      visualDescription: "Old house behind branches.",
      mood: "discovery",
      locationKey: "loc_forest",
      characterKeys: ["char_main"],
    },
  ],
};

describe("planScenesFromAnalysis", () => {
  it("creates the expected number of scenes for 5-minute / ~8s rule", () => {
    const keyMap = new Map([["char_main", "uuid-char"]]);
    const locMap = new Map([["loc_forest", "uuid-loc"]]);
    const plan = planScenesFromAnalysis({
      projectId: "proj-1",
      targetDurationSec: 300,
      targetSceneDurationSec: 8,
      visualStyle: VisualStyle.CINEMATIC,
      analysis: analysisFixture,
      characterKeyToId: keyMap,
      locationKeyToId: locMap,
    });

    expect(plan.sceneCount).toBe(38);
    expect(plan.scenes).toHaveLength(38);
    expect(plan.scenes.map((s) => s.sequence)).toEqual(
      Array.from({ length: 38 }, (_, i) => i + 1),
    );
    const durationSum = plan.scenes.reduce((t, s) => t + s.durationSec, 0);
    expect(durationSum).toBe(300);
  });
});
