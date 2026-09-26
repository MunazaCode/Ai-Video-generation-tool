import { planScenesFromAnalysis } from "@asv/ai";
import { enqueueProjectGeneration } from "../http/enqueue-generation.js";
import { enqueueSceneRegeneration } from "../http/enqueue-scene-regeneration.js";
import {
  JobStatus,
  JobType,
  ProjectStatus,
  summarizeSceneAssets,
  createProjectBodySchema,
  isTerminalProjectStatus,
  updateProjectBodySchema,
  type Job,
} from "@asv/shared";
import { projectFinalVideoRelativePath } from "@asv/video-engine";
import { Hono } from "hono";
import type { AppVariables } from "../context.js";
import {
  toCreateProjectInput,
  toUpdateProjectInput,
} from "../http/map-project-body.js";
import { jsonError, jsonSuccess } from "../http/responses.js";
import { serializeProject } from "../http/serialize-project.js";
import { serializeScene } from "../http/serialize-scene.js";
import { streamProjectSubtitles } from "../http/stream-project-subtitles.js";
import { streamProjectVideo } from "../http/stream-project-video.js";

export const projectsRoutes = new Hono<{ Variables: AppVariables }>();

projectsRoutes.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(
      c,
      {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        retryable: false,
      },
      400,
    );
  }

  const parsed = createProjectBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      c,
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((i) => i.message).join("; "),
        retryable: false,
      },
      400,
    );
  }

  const project = c
    .get("db")
    .repositories.projects.create(toCreateProjectInput(parsed.data));
  return jsonSuccess(c, serializeProject(project), 201);
});

projectsRoutes.get("/", (c) => {
  const projects = c
    .get("db")
    .repositories.projects.list()
    .map(serializeProject);
  return jsonSuccess(c, { projects });
});

projectsRoutes.get("/:id", (c) => {
  const project = c.get("db").repositories.projects.findById(c.req.param("id"));
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }
  return jsonSuccess(c, serializeProject(project));
});

projectsRoutes.patch("/:id", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return jsonError(
      c,
      {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        retryable: false,
      },
      400,
    );
  }

  const parsed = updateProjectBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      c,
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((i) => i.message).join("; "),
        retryable: false,
      },
      400,
    );
  }

  try {
    const updated = c
      .get("db")
      .repositories.projects.update(
        c.req.param("id"),
        toUpdateProjectInput(parsed.data),
      );
    if (!updated) {
      return jsonError(
        c,
        {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
          retryable: false,
        },
        404,
      );
    }
    return jsonSuccess(c, serializeProject(updated));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid project status")) {
      return jsonError(
        c,
        {
          code: "INVALID_STATUS_TRANSITION",
          message: error.message,
          retryable: false,
        },
        409,
      );
    }
    throw error;
  }
});

const ANALYZABLE_STATUSES = new Set<ProjectStatus>([
  ProjectStatus.DRAFT,
  ProjectStatus.PLANNING,
  ProjectStatus.FAILED,
]);

projectsRoutes.post("/:id/analyze", async (c) => {
  const id = c.req.param("id");
  const project = c.get("db").repositories.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  if (!project.script.trim()) {
    return jsonError(
      c,
      {
        code: "SCRIPT_REQUIRED",
        message: "Add script content before running analysis",
        retryable: false,
      },
      400,
    );
  }

  if (!ANALYZABLE_STATUSES.has(project.status)) {
    return jsonError(
      c,
      {
        code: "INVALID_PROJECT_STATE",
        message: `Cannot analyze while status is ${project.status}`,
        retryable: false,
      },
      409,
    );
  }

  const repos = c.get("db").repositories;
  repos.projects.update(id, { status: ProjectStatus.ANALYZING });

  try {
    const analysis = await c.get("storyAnalyzer").analyze({
      script: project.script,
      language: project.language,
      visualStyle: project.visualStyle,
      customVisualStyle: project.customVisualStyle,
      targetDurationSec: project.targetDurationSec,
    });

    repos.projects.saveStoryAnalysis(id, analysis);
    const updated = repos.projects.update(id, {
      status: ProjectStatus.PLANNING,
      progress: 0,
      title: analysis.title,
    });

    return jsonSuccess(c, {
      project: updated ? serializeProject(updated) : null,
      analysis,
      mode: c.get("env").MOCK_AI ? "mock" : "real",
    });
  } catch (error) {
    repos.projects.update(id, { status: ProjectStatus.FAILED });
    const message =
      error instanceof Error ? error.message : "Story analysis failed";
    return jsonError(
      c,
      {
        code: "STORY_ANALYSIS_FAILED",
        message,
        retryable: true,
      },
      502,
    );
  }
});

projectsRoutes.get("/:id/scenes", (c) => {
  const id = c.req.param("id");
  const project = c.get("db").repositories.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }
  const scenes = c
    .get("db")
    .repositories.scenes.listByProjectId(id)
    .map(serializeScene);
  return jsonSuccess(c, { scenes });
});

projectsRoutes.post("/:id/scenes/:sceneId/regenerate", (c) => {
  const projectId = c.req.param("id");
  const sceneId = c.req.param("sceneId");
  const repos = c.get("db").repositories;
  const project = repos.projects.findById(projectId);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  const scene = repos.scenes.listByProjectId(projectId).find((s) => s.id === sceneId);
  if (!scene) {
    return jsonError(
      c,
      {
        code: "SCENE_NOT_FOUND",
        message: "Scene not found",
        retryable: false,
      },
      404,
    );
  }

  const result = enqueueSceneRegeneration(
    repos,
    project,
    scene,
    c.get("env").VIDEO_PROVIDER,
  );
  if (!result.ok) {
    const status =
      result.code === "SCENE_NOT_FOUND" ? 404
      : result.code === "GENERATION_IN_PROGRESS" ? 409
      : 409;
    return jsonError(
      c,
      { code: result.code, message: result.message, retryable: false },
      status,
    );
  }

  const updated = repos.projects.findById(projectId);
  return jsonSuccess(c, {
    project: updated ? serializeProject(updated) : null,
    sceneId,
    jobCount: result.jobs.length,
    jobs: result.jobs.map(serializeJob),
  });
});

projectsRoutes.post("/:id/plan-scenes", (c) => {
  const id = c.req.param("id");
  const project = c.get("db").repositories.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  if (!project.storyAnalysis) {
    return jsonError(
      c,
      {
        code: "ANALYSIS_REQUIRED",
        message: "Run story analysis before planning scenes",
        retryable: false,
      },
      409,
    );
  }

  if (project.status !== ProjectStatus.PLANNING) {
    return jsonError(
      c,
      {
        code: "INVALID_PROJECT_STATE",
        message: `Cannot plan scenes while status is ${project.status}`,
        retryable: false,
      },
      409,
    );
  }

  const repos = c.get("db").repositories;
  const characterKeyToId = repos.characters.replaceFromAnalysis(
    id,
    project.storyAnalysis,
  );
  const locationKeyToId = repos.locations.replaceFromAnalysis(
    id,
    project.storyAnalysis,
  );

  const plan = planScenesFromAnalysis({
    projectId: id,
    targetDurationSec: project.targetDurationSec,
    targetSceneDurationSec: c.get("env").TARGET_SCENE_DURATION_SEC,
    visualStyle: project.visualStyle,
    analysis: project.storyAnalysis,
    characterKeyToId,
    locationKeyToId,
  });

  repos.scenes.replaceForProject(id, plan.scenes);
  const updated = repos.projects.update(id, {
    status: ProjectStatus.GENERATING_STORYBOARD,
    progress: 0,
  });

  return jsonSuccess(c, {
    project: updated ? serializeProject(updated) : null,
    sceneCount: plan.sceneCount,
    totalDurationSec: plan.totalDurationSec,
    targetSceneDurationSec: c.get("env").TARGET_SCENE_DURATION_SEC,
    scenes: repos.scenes.listByProjectId(id).map(serializeScene),
  });
});

projectsRoutes.post("/:id/generate", async (c) => {
  const id = c.req.param("id");
  const repos = c.get("db").repositories;
  const project = repos.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  const result = await enqueueProjectGeneration(
    repos,
    c.get("storage"),
    project,
    "start",
    c.get("env").VIDEO_PROVIDER,
  );
  if (!result.ok) {
    const status =
      result.code === "SCENES_REQUIRED" ? 400
      : result.code === "GENERATION_IN_PROGRESS" ? 409
      : 409;
    return jsonError(
      c,
      { code: result.code, message: result.message, retryable: false },
      status,
    );
  }

  const updated = repos.projects.findById(id);
  return jsonSuccess(c, {
    project: updated ? serializeProject(updated) : null,
    jobCount: result.jobs.length,
    jobs: result.jobs.map(serializeJob),
    resumed: result.resumed,
  });
});

projectsRoutes.post("/:id/resume", async (c) => {
  const id = c.req.param("id");
  const repos = c.get("db").repositories;
  const project = repos.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  const result = await enqueueProjectGeneration(
    repos,
    c.get("storage"),
    project,
    "resume",
    c.get("env").VIDEO_PROVIDER,
  );
  if (!result.ok) {
    const status =
      result.code === "NOTHING_TO_RESUME" ? 409
      : result.code === "GENERATION_IN_PROGRESS" ? 409
      : 409;
    return jsonError(
      c,
      {
        code: result.code,
        message: result.message,
        retryable: result.code === "NOTHING_TO_RESUME",
      },
      status,
    );
  }

  const updated = repos.projects.findById(id);
  return jsonSuccess(c, {
    project: updated ? serializeProject(updated) : null,
    jobCount: result.jobs.length,
    jobs: result.jobs.map(serializeJob),
    resumed: true,
  });
});

projectsRoutes.post("/:id/cancel", (c) => {
  const id = c.req.param("id");
  const repos = c.get("db").repositories;
  const project = repos.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  const cancelledJobs = repos.jobs.cancelAllForProject(id);
  repos.scenes.resetRunningAssetsForProject(id);

  let updated = project;
  if (!isTerminalProjectStatus(project.status)) {
    try {
      const next = repos.projects.update(id, { status: ProjectStatus.CANCELLED });
      if (next) {
        updated = next;
      }
    } catch {
      /* ignore if transition not allowed */
    }
  }

  return jsonSuccess(c, {
    project: serializeProject(updated),
    cancelledJobs,
  });
});

projectsRoutes.get("/:id/video", (c) => streamProjectVideo(c, "inline"));

projectsRoutes.get("/:id/download", (c) => streamProjectVideo(c, "attachment"));

projectsRoutes.get("/:id/subtitles/vtt", (c) => streamProjectSubtitles(c, "vtt"));

projectsRoutes.get("/:id/subtitles/srt", (c) => streamProjectSubtitles(c, "srt"));

projectsRoutes.get("/:id/progress", async (c) => {
  const id = c.req.param("id");
  const repos = c.get("db").repositories;
  const project = repos.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  const jobs = repos.jobs.listByProjectId(id);
  const scenes = repos.scenes.listByProjectId(id);
  const storage = c.get("storage");
  const finalRelative = projectFinalVideoRelativePath(id);
  let finalVideoReady = await storage.exists(finalRelative);

  const assembleJob = jobs
    .filter((j) => j.type === JobType.ASSEMBLE_VIDEO)
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    )[0];

  let assemblyNote: string | null = null;
  if (
    assembleJob?.status === JobStatus.COMPLETED &&
    assembleJob.currentStep === "assemble_skipped_no_ffmpeg"
  ) {
    assemblyNote =
      "Final MP4 was not built because FFmpeg was not found. Install FFmpeg, then use Resume generation.";
  } else if (
    !finalVideoReady &&
    jobs.length > 0 &&
    jobs.every(
      (j) =>
        j.status === JobStatus.COMPLETED ||
        j.status === JobStatus.CANCELLED ||
        j.status === JobStatus.FAILED,
    ) &&
    !jobs.some((j) => j.status === JobStatus.FAILED)
  ) {
    assemblyNote =
      "Scene assets are done but the final video is missing. Ensure the worker is running with FFmpeg, then Resume generation.";
  }

  let projectForResponse = project;
  if (
    finalVideoReady &&
    project.status !== ProjectStatus.COMPLETED &&
    project.status !== ProjectStatus.CANCELLED
  ) {
    try {
      const updated = repos.projects.update(id, {
        status: ProjectStatus.COMPLETED,
        progress: 100,
      });
      if (updated) {
        projectForResponse = updated;
      }
    } catch {
      /* ignore invalid transition; worker may still be writing */
    }
  }

  const summary = {
    total: jobs.length,
    queued: jobs.filter((j) => j.status === JobStatus.QUEUED).length,
    running: jobs.filter((j) => j.status === JobStatus.RUNNING).length,
    completed: jobs.filter((j) => j.status === JobStatus.COMPLETED).length,
    failed: jobs.filter((j) => j.status === JobStatus.FAILED).length,
    cancelled: jobs.filter((j) => j.status === JobStatus.CANCELLED).length,
  };

  return jsonSuccess(c, {
    project: serializeProject(projectForResponse),
    summary,
    sceneAssets: summarizeSceneAssets(scenes),
    finalVideoReady,
    assemblyNote,
    jobs: jobs.map(serializeJob),
  });
});

function serializeJob(job: Job) {
  return {
    id: job.id,
    projectId: job.projectId,
    sceneId: job.sceneId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    attempts: job.attempts,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

projectsRoutes.delete("/:id", (c) => {
  const deleted = c.get("db").repositories.projects.delete(c.req.param("id"));
  if (!deleted) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }
  return jsonSuccess(c, { id: c.req.param("id") });
});
