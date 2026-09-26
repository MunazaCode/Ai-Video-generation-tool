import {
  AspectRatio,
  JobStatus,
  JobType,
  LanguageCode,
  ProjectStatus,
  SceneAssetStatus,
  VisualStyle,
  VoiceGender,
  shouldRetryJob,
} from "@asv/shared";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDrizzle, createRepositories } from "./index.js";
import { applyMigrations } from "./migrate.js";
import { jobs } from "./schema.js";

function setup() {
  const db = createDrizzle("file::memory:");
  applyMigrations(db);
  return { db, repos: createRepositories(db) };
}

describe("JobRepository queue", () => {
  it("claims queued jobs in FIFO order", () => {
    const { repos } = setup();
    const project = repos.projects.create({
      title: "Jobs",
      script: "test",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.CINEMATIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.FEMALE, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });

    repos.jobs.create({
      projectId: project.id,
      type: JobType.ANALYZE_SCRIPT,
      currentStep: "first",
    });
    repos.jobs.create({
      projectId: project.id,
      type: JobType.PLAN_SCENES,
      currentStep: "second",
    });

    const first = repos.jobs.claimNextQueued();
    expect(first?.status).toBe(JobStatus.RUNNING);
    expect(first?.currentStep).toBe("first");

    const second = repos.jobs.claimNextQueued();
    expect(second?.type).toBe(JobType.PLAN_SCENES);
  });

  it("cancels active jobs for a project", () => {
    const { repos } = setup();
    const project = repos.projects.create({
      title: "Cancel",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.REALISTIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.NEUTRAL, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });
    const job = repos.jobs.create({
      projectId: project.id,
      type: JobType.GENERATE_VIDEO,
    });
    repos.jobs.updateStatus(job.id, JobStatus.RUNNING);

    const count = repos.jobs.cancelAllForProject(project.id);
    expect(count).toBe(1);
    expect(repos.jobs.findById(job.id)?.status).toBe(JobStatus.CANCELLED);
  });

  it("uses shared retry rules", () => {
    expect(shouldRetryJob(2, true)).toBe(true);
    expect(shouldRetryJob(3, true)).toBe(false);
  });

  it("reclaims stale RUNNING jobs back to QUEUED", () => {
    const { db, repos } = setup();
    const project = repos.projects.create({
      title: "Stale",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.REALISTIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.NEUTRAL, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });
    const job = repos.jobs.create({
      projectId: project.id,
      type: JobType.GENERATE_IMAGE,
    });
    repos.jobs.updateStatus(job.id, JobStatus.RUNNING);
    db.update(jobs)
      .set({ startedAt: new Date(Date.now() - 60_000) })
      .where(eq(jobs.id, job.id))
      .run();

    expect(repos.jobs.reclaimStaleRunningJobs(30_000)).toBe(1);
    expect(repos.jobs.findById(job.id)?.status).toBe(JobStatus.QUEUED);
    expect(repos.jobs.claimNextQueued()?.id).toBe(job.id);
  });

  it("reclaims stale RUNNING jobs on cancelled projects to CANCELLED", () => {
    const { db, repos } = setup();
    const project = repos.projects.create({
      title: "Stale cancel",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.REALISTIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.NEUTRAL, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });
    repos.projects.update(project.id, { status: ProjectStatus.CANCELLED });
    const job = repos.jobs.create({
      projectId: project.id,
      type: JobType.GENERATE_VIDEO,
    });
    repos.jobs.updateStatus(job.id, JobStatus.RUNNING);
    db.update(jobs)
      .set({ startedAt: new Date(Date.now() - 60_000) })
      .where(eq(jobs.id, job.id))
      .run();

    expect(repos.jobs.reclaimStaleRunningJobs(30_000)).toBe(1);
    expect(repos.jobs.findById(job.id)?.status).toBe(JobStatus.CANCELLED);
  });
});

describe("SceneRepository cancel cleanup", () => {
  it("resetRunningAssetsForProject clears RUNNING asset flags", () => {
    const { repos } = setup();
    const project = repos.projects.create({
      title: "Scene reset",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.REALISTIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.NEUTRAL, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });
    const [scene] = repos.scenes.createMany([
      {
        projectId: project.id,
        sequence: 1,
        title: "S1",
        narration: "n",
        visualDescription: "v",
        imagePrompt: "i",
        videoPrompt: "vp",
        durationSec: 4,
        characterIds: [],
        locationId: null,
        mood: "m",
        camera: "c",
        lighting: "l",
        style: null,
        previousSceneContext: null,
        nextSceneContext: null,
        ...repos.scenes.defaultAssetStatuses(),
        imageStatus: SceneAssetStatus.RUNNING,
        videoStatus: SceneAssetStatus.PENDING,
        audioStatus: SceneAssetStatus.RUNNING,
      },
    ]);
    expect(scene).toBeDefined();

    const reset = repos.scenes.resetRunningAssetsForProject(project.id);
    expect(reset).toBe(2);
    const updated = repos.scenes.listByProjectId(project.id)[0];
    expect(updated?.imageStatus).toBe(SceneAssetStatus.QUEUED);
    expect(updated?.audioStatus).toBe(SceneAssetStatus.QUEUED);
    expect(updated?.videoStatus).toBe(SceneAssetStatus.PENDING);
  });
});
