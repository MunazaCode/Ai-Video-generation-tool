import { JobType } from "@asv/shared";
import { describe, expect, it } from "vitest";
import { buildSingleSceneRegenerationJobs } from "./repositories/job-repository.js";

describe("buildSingleSceneRegenerationJobs", () => {
  it("queues one scene pipeline plus reassemble", () => {
    const jobs = buildSingleSceneRegenerationJobs("p1", "s9", {
      subtitlesEnabled: true,
    });
    expect(jobs.filter((j) => j.sceneId === "s9")).toHaveLength(4);
    expect(jobs.at(-1)?.type).toBe(JobType.ASSEMBLE_VIDEO);
    expect(jobs.at(-1)?.sceneId).toBeNull();
  });

  it("omits subtitle job when disabled", () => {
    const jobs = buildSingleSceneRegenerationJobs("p1", "s1", {
      subtitlesEnabled: false,
    });
    expect(jobs.filter((j) => j.sceneId === "s1")).toHaveLength(3);
  });
});
