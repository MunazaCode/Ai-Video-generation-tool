import { JobType, SceneAssetStatus } from "@asv/shared";
import { describe, expect, it } from "vitest";
import { buildSceneGenerationJobs } from "./repositories/job-repository.js";

describe("buildSceneGenerationJobs", () => {
  it("adds subtitle jobs when enabled", () => {
    const jobs = buildSceneGenerationJobs(
      "p1",
      [
        {
          id: "s1",
          imageStatus: SceneAssetStatus.PENDING,
          videoStatus: SceneAssetStatus.PENDING,
          audioStatus: SceneAssetStatus.PENDING,
          assetPaths: {},
        },
        {
          id: "s2",
          imageStatus: SceneAssetStatus.PENDING,
          videoStatus: SceneAssetStatus.PENDING,
          audioStatus: SceneAssetStatus.PENDING,
          assetPaths: {},
        },
      ],
      { subtitlesEnabled: true },
    );
    const subtitleJobs = jobs.filter((j) => j.type === JobType.GENERATE_SUBTITLES);
    expect(subtitleJobs).toHaveLength(2);
    expect(jobs.at(-1)?.type).toBe(JobType.ASSEMBLE_VIDEO);
  });

  it("omits subtitle jobs when disabled", () => {
    const jobs = buildSceneGenerationJobs(
      "p1",
      [
        {
          id: "s1",
          imageStatus: SceneAssetStatus.PENDING,
          videoStatus: SceneAssetStatus.PENDING,
          audioStatus: SceneAssetStatus.PENDING,
          assetPaths: {},
        },
      ],
      { subtitlesEnabled: false },
    );
    expect(jobs.some((j) => j.type === JobType.GENERATE_SUBTITLES)).toBe(false);
  });

  it("skips image jobs when skipImageJobs is set (text-to-video)", () => {
    const jobs = buildSceneGenerationJobs(
      "p1",
      [
        {
          id: "s1",
          imageStatus: SceneAssetStatus.PENDING,
          videoStatus: SceneAssetStatus.PENDING,
          audioStatus: SceneAssetStatus.PENDING,
          assetPaths: {},
        },
      ],
      { subtitlesEnabled: false, skipImageJobs: true },
    );
    expect(jobs.some((j) => j.type === JobType.GENERATE_IMAGE)).toBe(false);
    expect(jobs.some((j) => j.type === JobType.GENERATE_VIDEO)).toBe(true);
  });

  it("skips completed scene assets on resume", () => {
    const jobs = buildSceneGenerationJobs(
      "p1",
      [
        {
          id: "s1",
          imageStatus: SceneAssetStatus.COMPLETED,
          videoStatus: SceneAssetStatus.COMPLETED,
          audioStatus: SceneAssetStatus.COMPLETED,
          assetPaths: {
            image: "projects/p/scenes/s1/images/a.png",
            video: "projects/p/scenes/s1/videos/a.mp4",
            audio: "projects/p/scenes/s1/audio/a.wav",
            subtitleVtt: "projects/p/scenes/s1/subtitles/a.vtt",
          },
        },
        {
          id: "s2",
          imageStatus: SceneAssetStatus.PENDING,
          videoStatus: SceneAssetStatus.PENDING,
          audioStatus: SceneAssetStatus.PENDING,
          assetPaths: {},
        },
      ],
      { subtitlesEnabled: true, forceAssemble: true },
    );
    expect(jobs.filter((j) => j.sceneId === "s1")).toHaveLength(0);
    expect(jobs.some((j) => j.sceneId === "s2")).toBe(true);
    expect(jobs.at(-1)?.type).toBe(JobType.ASSEMBLE_VIDEO);
  });
});
