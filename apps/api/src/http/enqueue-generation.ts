import type { Repositories } from "@asv/db";
import { buildSceneGenerationJobs } from "@asv/db";
import {
  JobStatus,
  JobType,
  ProjectStatus,
  canResumeGeneration,
  inferGenerationResumeStatus,
  videoProviderRequiresSourceImage,
  type Project,
} from "@asv/shared";
import { projectFinalVideoRelativePath } from "@asv/video-engine";
import type { LocalStorageProvider } from "@asv/storage";

export type EnqueueGenerationResult =
  | { ok: true; jobs: ReturnType<Repositories["jobs"]["createMany"]>; resumed: boolean }
  | {
      ok: false;
      code:
        | "INVALID_PROJECT_STATE"
        | "SCENES_REQUIRED"
        | "GENERATION_IN_PROGRESS"
        | "NOTHING_TO_RESUME";
      message: string;
    };

export async function enqueueProjectGeneration(
  repos: Repositories,
  storage: LocalStorageProvider,
  project: Project,
  mode: "start" | "resume",
  videoProviderId: string,
): Promise<EnqueueGenerationResult> {
  const skipImageJobs = !videoProviderRequiresSourceImage(videoProviderId);
  const scenes = repos.scenes.listByProjectId(project.id);
  if (scenes.length === 0) {
    return {
      ok: false,
      code: "SCENES_REQUIRED",
      message: "Plan scenes before starting generation",
    };
  }

  if (
    mode === "resume" &&
    (project.status === ProjectStatus.FAILED ||
      project.status === ProjectStatus.CANCELLED)
  ) {
    repos.jobs.cancelAllForProject(project.id);
    repos.scenes.resetRunningAssetsForProject(project.id);
  }

  if (repos.jobs.hasActiveJobs(project.id)) {
    if (mode === "resume") {
      const activeJobs = repos.jobs.listByProjectId(project.id).filter(
        (j) => j.status === JobStatus.QUEUED || j.status === JobStatus.RUNNING,
      );
      return {
        ok: true,
        jobs: activeJobs,
        resumed: true,
      };
    }
    return {
      ok: false,
      code: "GENERATION_IN_PROGRESS",
      message: "Generation jobs are already queued or running",
    };
  }

  if (mode === "start") {
    if (project.status !== ProjectStatus.GENERATING_STORYBOARD) {
      return {
        ok: false,
        code: "INVALID_PROJECT_STATE",
        message: `Cannot start generation while status is ${project.status}`,
      };
    }
  } else if (!canResumeGeneration(project.status)) {
    return {
      ok: false,
      code: "INVALID_PROJECT_STATE",
      message: `Cannot resume generation while status is ${project.status}`,
    };
  }

  const finalExists = await storage.exists(
    projectFinalVideoRelativePath(project.id),
  );
  const jobInputs = buildSceneGenerationJobs(project.id, scenes, {
    subtitlesEnabled: project.subtitleSettings.enabled,
    forceAssemble: !finalExists,
    skipImageJobs,
  });

  if (jobInputs.length === 0) {
    return {
      ok: false,
      code: "NOTHING_TO_RESUME",
      message: "All scene assets and final video are already present",
    };
  }

  const onlyAssemble =
    jobInputs.length === 1 && jobInputs[0]?.type === JobType.ASSEMBLE_VIDEO;
  if (mode === "resume" && onlyAssemble && finalExists) {
    return {
      ok: false,
      code: "NOTHING_TO_RESUME",
      message: "All scene assets and final video are already present",
    };
  }

  const jobs = repos.jobs.createMany(jobInputs);
  const nextStatus =
    mode === "start"
      ? skipImageJobs
        ? ProjectStatus.GENERATING_VIDEO
        : ProjectStatus.GENERATING_IMAGES
      : inferGenerationResumeStatus(scenes, project.subtitleSettings.enabled, {
          skipImageJobs,
        });

  repos.projects.update(project.id, {
    status: nextStatus,
    progress: mode === "start" ? 0 : project.progress,
  });

  return { ok: true, jobs, resumed: mode === "resume" };
}
