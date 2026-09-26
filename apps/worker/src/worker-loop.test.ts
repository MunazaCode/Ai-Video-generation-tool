import {
  applyMigrations,
  createDrizzle,
  createRepositories,
  type Repositories,
} from "@asv/db";
import {
  AspectRatio,
  JobStatus,
  JobType,
  LanguageCode,
  VisualStyle,
  VoiceGender,
  type Job,
} from "@asv/shared";
import { describe, expect, it } from "vitest";
import type { JobProcessor } from "./job-processor.js";
import { drainJobQueue } from "./worker-loop.js";

function setupRepos(): Repositories {
  const db = createDrizzle("file::memory:");
  applyMigrations(db);
  return createRepositories(db);
}

function createMinimalProject(repos: Repositories) {
  return repos.projects.create({
    title: "Worker test",
    script: "",
    targetDurationSec: 60,
    aspectRatio: AspectRatio.R16_9,
    visualStyle: VisualStyle.CINEMATIC,
    language: LanguageCode.EN,
    voiceSettings: { gender: VoiceGender.FEMALE, language: LanguageCode.EN },
    subtitleSettings: { enabled: false },
    musicSettings: { enabled: false, volume: 0.2 },
  });
}

describe("drainJobQueue", () => {
  it("does not mark cancelled jobs as FAILED when processing throws", async () => {
    const repos = setupRepos();
    const project = createMinimalProject(repos);
    const job = repos.jobs.create({
      projectId: project.id,
      type: JobType.ANALYZE_SCRIPT,
    });

    const processor = {
      process: async (claimed: Job) => {
        repos.jobs.cancelJob(claimed.id);
        throw new Error("simulated provider failure");
      },
    } as JobProcessor;

    await drainJobQueue(repos, processor, 1);

    const after = repos.jobs.findById(job.id);
    expect(after?.status).toBe(JobStatus.CANCELLED);
  });

  it("requeues RUNNING jobs on retryable failure", async () => {
    const repos = setupRepos();
    const project = createMinimalProject(repos);
    repos.jobs.create({
      projectId: project.id,
      type: JobType.PLAN_SCENES,
    });

    let calls = 0;
    const processor = {
      process: async (claimed: Job) => {
        calls += 1;
        if (calls === 1) {
          throw new Error("transient");
        }
        repos.jobs.updateStatus(claimed.id, JobStatus.COMPLETED, {
          progress: 100,
        });
      },
    } as JobProcessor;

    await drainJobQueue(repos, processor, 2);

    const jobs = repos.jobs.listByProjectId(project.id);
    expect(jobs[0]?.status).toBe(JobStatus.COMPLETED);
    expect(calls).toBe(2);
  });
});
