import { describe, expect, it } from "vitest";
import { JobType, ProjectStatus, SceneAssetStatus } from "../enums.js";
import { calculateSceneCount } from "../scene-planner/math.js";
import {
  canRegenerateSingleScene,
  canResumeGeneration,
  inferGenerationResumeStatus,
  sceneNeedsGenerationJob,
} from "./scene-jobs.js";
import type { SceneJobSnapshot } from "./scene-jobs.js";

function scene(partial: Partial<SceneJobSnapshot> & { id: string }): SceneJobSnapshot {
  return {
    imageStatus: SceneAssetStatus.PENDING,
    videoStatus: SceneAssetStatus.PENDING,
    audioStatus: SceneAssetStatus.PENDING,
    assetPaths: {},
    ...partial,
  };
}

describe("scene-jobs", () => {
  it("supports long-form scene counts (20+ min)", () => {
    expect(calculateSceneCount(1200, 8)).toBe(150);
  });

  it("skips completed scene assets when planning jobs", () => {
    const done = scene({
      id: "s1",
      imageStatus: SceneAssetStatus.COMPLETED,
      assetPaths: { image: "projects/p/scenes/s1/images/x.png" },
    });
    expect(sceneNeedsGenerationJob(done, JobType.GENERATE_IMAGE, {})).toBe(false);
    expect(sceneNeedsGenerationJob(done, JobType.GENERATE_VIDEO, {})).toBe(true);
  });

  it("infers resume status from first incomplete stage", () => {
    const scenes = [
      scene({
        id: "s1",
        imageStatus: SceneAssetStatus.COMPLETED,
        videoStatus: SceneAssetStatus.COMPLETED,
        audioStatus: SceneAssetStatus.COMPLETED,
        assetPaths: { image: "a", video: "b", audio: "c" },
      }),
      scene({ id: "s2" }),
    ];
    expect(inferGenerationResumeStatus(scenes, false)).toBe(
      ProjectStatus.GENERATING_IMAGES,
    );
  });

  it("allows resume from failed or cancelled runs", () => {
    expect(canResumeGeneration(ProjectStatus.FAILED)).toBe(true);
    expect(canResumeGeneration(ProjectStatus.CANCELLED)).toBe(true);
    expect(canResumeGeneration(ProjectStatus.COMPLETED)).toBe(false);
  });

  it("allows single-scene regen from completed projects", () => {
    expect(canRegenerateSingleScene(ProjectStatus.COMPLETED)).toBe(true);
    expect(canRegenerateSingleScene(ProjectStatus.GENERATING_VIDEO)).toBe(false);
  });
});
