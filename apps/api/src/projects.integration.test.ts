import { createStoryAnalyzer } from "@asv/ai";
import {
  applyMigrations,
  createDrizzle,
  createRepositories,
} from "@asv/db";
import { createProviderBundle } from "@asv/providers";
import { LocalStorageProvider } from "@asv/storage";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AspectRatio,
  JobStatus,
  LanguageCode,
  ProjectStatus,
  SceneAssetStatus,
  VisualStyle,
  VoiceGender,
} from "@asv/shared";
import { checkFfmpegAvailable } from "@asv/video-engine";
import { JobProcessor, drainJobQueue } from "@asv/worker/testing";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { ApiEnv } from "./env.js";
import type { DatabaseContext } from "@asv/db";
import type { ProviderBundle } from "@asv/providers";

const testEnv: ApiEnv = {
  PORT: 4000,
  APP_URL: "http://localhost:3000",
  MOCK_AI: true,
  STORAGE_PATH: "./storage",
  DATABASE_URL: "file::memory:",
  LLM_PROVIDER: "mock",
  TARGET_SCENE_DURATION_SEC: 8,
  IMAGE_PROVIDER: "mock",
  VIDEO_PROVIDER: "mock",
  TTS_PROVIDER: "mock",
  MUSIC_PROVIDER: "mock",
};

async function createTestApp() {
  const dbConn = createDrizzle("file::memory:");
  applyMigrations(dbConn);
  const db: DatabaseContext = {
    db: dbConn,
    repositories: createRepositories(dbConn),
  };
  const storageRoot = await mkdtemp(path.join(tmpdir(), "asv-api-test-"));
  const storage = new LocalStorageProvider(storageRoot);
  const providers: ProviderBundle = createProviderBundle({
    mockAi: true,
    llmProvider: "mock",
    imageProvider: "mock",
    videoProvider: "mock",
    ttsProvider: "mock",
    musicProvider: "mock",
    storage,
  });
  const storyAnalyzer = createStoryAnalyzer(providers.llm);
  return {
    app: createApp({ env: testEnv, db, storage, storyAnalyzer, providers }),
    db,
    providers,
    storage,
  };
}

async function projectReadyForGeneration(
  ctx: Awaited<ReturnType<typeof createTestApp>>,
  body: typeof sampleCreateBody = sampleCreateBody,
) {
  const createRes = await ctx.app.request("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const created = (await createRes.json()) as { data: { id: string } };
  await ctx.app.request(`/api/projects/${created.data.id}/analyze`, {
    method: "POST",
  });
  await ctx.app.request(`/api/projects/${created.data.id}/plan-scenes`, {
    method: "POST",
  });
  return created.data.id;
}

const sampleCreateBody = {
  title: "Forest Adventure",
  script: "A young girl enters a mysterious forest...",
  targetDurationSec: 300,
  aspectRatio: AspectRatio.R16_9,
  visualStyle: VisualStyle.CINEMATIC,
  language: LanguageCode.EN,
  voiceSettings: { gender: VoiceGender.FEMALE, language: LanguageCode.EN },
  subtitleSettings: { enabled: true },
  musicSettings: { enabled: false, volume: 0.2 },
};

describe("projects API", () => {
  it("POST /api/projects creates a project", async () => {
    const { app } = await createTestApp();
    const res = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      success: boolean;
      data: { id: string; status: string; title: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe("Forest Adventure");
    expect(json.data.status).toBe(ProjectStatus.DRAFT);
    expect(json.data.id.length).toBeGreaterThan(0);
  });

  it("GET /api/projects lists projects", async () => {
    const { app } = await createTestApp();
    await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });

    const res = await app.request("/api/projects");
    const json = (await res.json()) as {
      success: boolean;
      data: { projects: unknown[] };
    };
    expect(json.success).toBe(true);
    expect(json.data.projects.length).toBe(1);
  });

  it("GET /api/projects/:id returns 404 for missing project", async () => {
    const { app } = await createTestApp();
    const res = await app.request("/api/projects/missing-id");
    expect(res.status).toBe(404);
    const json = (await res.json()) as { success: boolean; error: { code: string } };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("PATCH /api/projects/:id updates script", async () => {
    const { app } = await createTestApp();
    const createRes = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });
    const created = (await createRes.json()) as {
      data: { id: string };
    };

    const patchRes = await app.request(`/api/projects/${created.data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: "Updated script" }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as {
      data: { script: string };
    };
    expect(patched.data.script).toBe("Updated script");
  });

  it("DELETE /api/projects/:id removes a project", async () => {
    const { app } = await createTestApp();
    const createRes = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });
    const created = (await createRes.json()) as {
      data: { id: string };
    };

    const deleteRes = await app.request(`/api/projects/${created.data.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    const getRes = await app.request(`/api/projects/${created.data.id}`);
    expect(getRes.status).toBe(404);
  });

  it("POST /api/projects/:id/analyze returns structured analysis", async () => {
    const { app } = await createTestApp();
    const createRes = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });
    const created = (await createRes.json()) as {
      data: { id: string };
    };

    const analyzeRes = await app.request(
      `/api/projects/${created.data.id}/analyze`,
      { method: "POST" },
    );
    expect(analyzeRes.status).toBe(200);
    const json = (await analyzeRes.json()) as {
      success: boolean;
      data: {
        mode: string;
        analysis: { scenes: unknown[] };
        project: { status: string; storyAnalysis: unknown };
      };
    };
    expect(json.success).toBe(true);
    expect(json.data.mode).toBe("mock");
    expect(json.data.analysis.scenes.length).toBeGreaterThan(0);
    expect(json.data.project.status).toBe(ProjectStatus.PLANNING);
    expect(json.data.project.storyAnalysis).not.toBeNull();
  });

  it("POST /api/projects/:id/plan-scenes creates timed scenes", async () => {
    const { app } = await createTestApp();
    const createRes = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleCreateBody),
    });
    const created = (await createRes.json()) as {
      data: { id: string };
    };

    await app.request(`/api/projects/${created.data.id}/analyze`, {
      method: "POST",
    });

    const planRes = await app.request(
      `/api/projects/${created.data.id}/plan-scenes`,
      { method: "POST" },
    );
    expect(planRes.status).toBe(200);
    const json = (await planRes.json()) as {
      success: boolean;
      data: {
        sceneCount: number;
        totalDurationSec: number;
        scenes: { sequence: number; durationSec: number }[];
        project: { status: string };
      };
    };
    expect(json.success).toBe(true);
    expect(json.data.sceneCount).toBe(38);
    expect(json.data.totalDurationSec).toBe(300);
    expect(json.data.scenes).toHaveLength(38);
    expect(json.data.scenes[0]?.sequence).toBe(1);
    const durationSum = json.data.scenes.reduce(
      (total, scene) => total + scene.durationSec,
      0,
    );
    expect(durationSum).toBe(300);
    expect(json.data.project.status).toBe(ProjectStatus.GENERATING_STORYBOARD);
  });

  it("rejects invalid create payload", async () => {
    const { app } = await createTestApp();
    const res = await app.request("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/projects/:id/generate enqueues scene jobs", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);

    const generateRes = await ctx.app.request(
      `/api/projects/${projectId}/generate`,
      { method: "POST" },
    );
    expect(generateRes.status).toBe(200);
    const json = (await generateRes.json()) as {
      data: {
        jobCount: number;
        project: { status: string };
        jobs: { type: string; status: string }[];
      };
    };
    expect(json.data.jobCount).toBe(9);
    expect(json.data.project.status).toBe(ProjectStatus.GENERATING_IMAGES);
    expect(json.data.jobs.every((j) => j.status === JobStatus.QUEUED)).toBe(true);
  });

  it("GET /api/projects/:id/progress reports job summary", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });

    const progressRes = await ctx.app.request(
      `/api/projects/${projectId}/progress`,
    );
    expect(progressRes.status).toBe(200);
    const json = (await progressRes.json()) as {
      data: { summary: { total: number; queued: number } };
    };
    expect(json.data.summary.total).toBe(9);
    expect(json.data.summary.queued).toBe(9);
  });

  it("worker drain completes generation jobs", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });

    const processor = new JobProcessor(ctx.db.repositories, ctx.providers, { allowMockVisuals: true, storage: ctx.storage,
    });
    const processed = await drainJobQueue(ctx.db.repositories, processor);
    expect(processed).toBe(9);

    const ffmpegReady = await checkFfmpegAvailable();
    const progressRes = await ctx.app.request(
      `/api/projects/${projectId}/progress`,
    );
    const json = (await progressRes.json()) as {
      data: {
        summary: { completed: number; failed: number };
        project: { status: string; progress: number };
      };
    };
    expect(json.data.summary.completed).toBe(9);
    expect(json.data.summary.failed).toBe(0);
    if (ffmpegReady) {
      expect(json.data.project.status).toBe(ProjectStatus.COMPLETED);
      expect(json.data.project.progress).toBe(100);
    } else {
      expect(json.data.project.status).toBe(ProjectStatus.PROCESSING);
      expect(json.data.project.progress).toBeGreaterThanOrEqual(95);
    }
  });

  it("GET /api/projects/:id/video returns 404 before final output exists", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);

    const res = await ctx.app.request(`/api/projects/${projectId}/video`);
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("VIDEO_NOT_READY");
  });

  it("mock E2E serves final MP4 after worker drain when FFmpeg is available", async (ctx) => {
    if (!(await checkFfmpegAvailable())) {
      ctx.skip();
    }

    const testCtx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(testCtx, shortBody);
    await testCtx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });

    const processor = new JobProcessor(testCtx.db.repositories, testCtx.providers, { allowMockVisuals: true, storage: testCtx.storage,
    });
    await drainJobQueue(testCtx.db.repositories, processor);

    const videoRes = await testCtx.app.request(
      `/api/projects/${projectId}/video`,
    );
    expect(videoRes.status).toBe(200);
    expect(videoRes.headers.get("content-type")).toContain("video/mp4");
    const bytes = await videoRes.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const downloadRes = await testCtx.app.request(
      `/api/projects/${projectId}/download`,
    );
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get("content-disposition")).toContain("attachment");

    const vttRes = await testCtx.app.request(
      `/api/projects/${projectId}/subtitles/vtt`,
    );
    expect(vttRes.status).toBe(200);
    expect(vttRes.headers.get("content-type")).toContain("text/vtt");
    const vttText = await vttRes.text();
    expect(vttText.startsWith("WEBVTT")).toBe(true);
  });

  it("POST /api/projects/:id/cancel resets scene assets stuck in RUNNING", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });

    const scene = ctx.db.repositories.scenes.listByProjectId(projectId)[0];
    if (!scene) {
      throw new Error("expected scene");
    }
    ctx.db.repositories.scenes.update(scene.id, {
      imageStatus: SceneAssetStatus.RUNNING,
      audioStatus: SceneAssetStatus.RUNNING,
    });

    await ctx.app.request(`/api/projects/${projectId}/cancel`, {
      method: "POST",
    });

    const after = ctx.db.repositories.scenes
      .listByProjectId(projectId)
      .find((s) => s.id === scene.id);
    expect(after?.imageStatus).toBe(SceneAssetStatus.QUEUED);
    expect(after?.audioStatus).toBe(SceneAssetStatus.QUEUED);
  });

  it("worker drain after cancel leaves jobs CANCELLED not FAILED", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });
    await ctx.app.request(`/api/projects/${projectId}/cancel`, {
      method: "POST",
    });

    const processor = new JobProcessor(ctx.db.repositories, ctx.providers, { allowMockVisuals: true, storage: ctx.storage,
    });
    const processed = await drainJobQueue(ctx.db.repositories, processor);
    expect(processed).toBe(0);

    const jobs = ctx.db.repositories.jobs.listByProjectId(projectId);
    expect(jobs.every((j) => j.status === JobStatus.CANCELLED)).toBe(true);
    expect(jobs.some((j) => j.status === JobStatus.FAILED)).toBe(false);
  });

  it("POST /api/projects/:id/cancel stops queued jobs", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });

    const cancelRes = await ctx.app.request(
      `/api/projects/${projectId}/cancel`,
      { method: "POST" },
    );
    expect(cancelRes.status).toBe(200);
    const json = (await cancelRes.json()) as {
      data: {
        cancelledJobs: number;
        project: { status: string };
      };
    };
    expect(json.data.cancelledJobs).toBe(9);
    expect(json.data.project.status).toBe(ProjectStatus.CANCELLED);
  });

  it("POST /api/projects/:id/resume enqueues incremental jobs after cancel", async () => {
    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });
    await ctx.app.request(`/api/projects/${projectId}/cancel`, {
      method: "POST",
    });

    const resumeRes = await ctx.app.request(
      `/api/projects/${projectId}/resume`,
      { method: "POST" },
    );
    expect(resumeRes.status).toBe(200);
    const json = (await resumeRes.json()) as {
      data: { jobCount: number; resumed: boolean };
    };
    expect(json.data.resumed).toBe(true);
    expect(json.data.jobCount).toBeGreaterThan(0);
  });

  it("POST scene regenerate enqueues jobs for one scene after completion", async () => {
    if (!(await checkFfmpegAvailable())) {
      return;
    }

    const ctx = await createTestApp();
    const shortBody = { ...sampleCreateBody, targetDurationSec: 16 };
    const projectId = await projectReadyForGeneration(ctx, shortBody);
    await ctx.app.request(`/api/projects/${projectId}/generate`, {
      method: "POST",
    });
    const processor = new JobProcessor(ctx.db.repositories, ctx.providers, { allowMockVisuals: true, storage: ctx.storage,
    });
    await drainJobQueue(ctx.db.repositories, processor);

    const scenes = ctx.db.repositories.scenes.listByProjectId(projectId);
    const target = scenes[0];
    if (!target) {
      throw new Error("expected at least one scene");
    }

    const regenRes = await ctx.app.request(
      `/api/projects/${projectId}/scenes/${target.id}/regenerate`,
      { method: "POST" },
    );
    expect(regenRes.status).toBe(200);
    const json = (await regenRes.json()) as { data: { jobCount: number } };
    expect(json.data.jobCount).toBe(5);
  });
});
