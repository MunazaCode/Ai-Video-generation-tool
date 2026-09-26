import {
  AspectRatio,
  JobStatus,
  JobType,
  LanguageCode,
  ProjectStatus,
  SceneAssetStatus,
  VisualStyle,
  VoiceGender,
} from "@asv/shared";
import { describe, expect, it } from "vitest";
import { createDrizzle, createRepositories } from "./index.js";
import { applyMigrations } from "./migrate.js";

function setupDb() {
  const db = createDrizzle("file::memory:");
  applyMigrations(db);
  return { repositories: createRepositories(db) };
}

describe("repositories integration", () => {
  it("creates and lists projects", () => {
    const { repositories } = setupDb();
    const project = repositories.projects.create({
      title: "Forest Story",
      script: "A girl enters a forest...",
      targetDurationSec: 300,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.CINEMATIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.FEMALE, language: LanguageCode.EN },
      subtitleSettings: { enabled: true },
      musicSettings: { enabled: false, volume: 0.2 },
    });

    expect(project.status).toBe(ProjectStatus.DRAFT);
    expect(repositories.projects.list()).toHaveLength(1);
    expect(repositories.projects.findById(project.id)?.title).toBe("Forest Story");
  });

  it("orders scenes by sequence", () => {
    const { repositories } = setupDb();
    const project = repositories.projects.create({
      title: "Scenes",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.REALISTIC,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.NEUTRAL, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });

    repositories.scenes.createMany([
      {
        projectId: project.id,
        sequence: 2,
        title: "Second",
        narration: "",
        visualDescription: "",
        imagePrompt: "",
        videoPrompt: "",
        durationSec: 8,
        characterIds: [],
        locationId: null,
        mood: "",
        camera: "",
        lighting: "",
        style: null,
        previousSceneContext: null,
        nextSceneContext: null,
        imageStatus: SceneAssetStatus.PENDING,
        videoStatus: SceneAssetStatus.PENDING,
        audioStatus: SceneAssetStatus.PENDING,
      },
      {
        projectId: project.id,
        sequence: 1,
        title: "First",
        narration: "",
        visualDescription: "",
        imagePrompt: "",
        videoPrompt: "",
        durationSec: 8,
        characterIds: [],
        locationId: null,
        mood: "",
        camera: "",
        lighting: "",
        style: null,
        previousSceneContext: null,
        nextSceneContext: null,
        imageStatus: SceneAssetStatus.PENDING,
        videoStatus: SceneAssetStatus.PENDING,
        audioStatus: SceneAssetStatus.PENDING,
      },
    ]);

    const scenes = repositories.scenes.listByProjectId(project.id);
    expect(scenes.map((s) => s.sequence)).toEqual([1, 2]);
    expect(scenes[0]?.title).toBe("First");
  });

  it("enforces project status transitions on update", () => {
    const { repositories } = setupDb();
    const project = repositories.projects.create({
      title: "Status",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R16_9,
      visualStyle: VisualStyle.ANIME,
      language: LanguageCode.UR,
      voiceSettings: { gender: VoiceGender.MALE, language: LanguageCode.UR },
      subtitleSettings: { enabled: true },
      musicSettings: { enabled: true, volume: 0.15 },
    });

    repositories.projects.update(project.id, { status: ProjectStatus.ANALYZING });
    expect(() => {
      repositories.projects.update(project.id, { status: ProjectStatus.COMPLETED });
    }).toThrow(/Invalid project status transition/);
  });

  it("creates jobs and transitions status", () => {
    const { repositories } = setupDb();
    const project = repositories.projects.create({
      title: "Jobs",
      script: "",
      targetDurationSec: 60,
      aspectRatio: AspectRatio.R1_1,
      visualStyle: VisualStyle.DOCUMENTARY,
      language: LanguageCode.EN,
      voiceSettings: { gender: VoiceGender.FEMALE, language: LanguageCode.EN },
      subtitleSettings: { enabled: false },
      musicSettings: { enabled: false, volume: 0.2 },
    });

    const job = repositories.jobs.create({
      projectId: project.id,
      type: JobType.ANALYZE_SCRIPT,
      currentStep: "queued",
    });

    repositories.jobs.updateStatus(job.id, JobStatus.RUNNING, {
      progress: 10,
      currentStep: "analyze",
    });
    const done = repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
    });
    expect(done?.status).toBe(JobStatus.COMPLETED);
    expect(done?.progress).toBe(100);
  });
});
