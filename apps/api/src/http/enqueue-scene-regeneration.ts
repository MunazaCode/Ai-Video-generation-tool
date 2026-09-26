import {
  buildSingleSceneRegenerationJobs,
  type Repositories,
} from "@asv/db";
import {
  ProjectStatus,
  SceneAssetStatus,
  canRegenerateSingleScene,
  videoProviderRequiresSourceImage,
  type CreateJobInput,
  type Job,
  type Project,
  type Scene,
} from "@asv/shared";

export type EnqueueSceneRegenerationResult =
  | { ok: true; jobs: Job[] }
  | {
      ok: false;
      code:
        | "PROJECT_NOT_FOUND"
        | "SCENE_NOT_FOUND"
        | "INVALID_PROJECT_STATE"
        | "GENERATION_IN_PROGRESS";
      message: string;
    };

export function enqueueSceneRegeneration(
  repos: Repositories,
  project: Project,
  scene: Scene,
  videoProviderId: string,
): EnqueueSceneRegenerationResult {
  const skipImageJobs = !videoProviderRequiresSourceImage(videoProviderId);
  if (repos.jobs.hasActiveJobs(project.id)) {
    return {
      ok: false,
      code: "GENERATION_IN_PROGRESS",
      message: "Generation jobs are already queued or running",
    };
  }

  if (!canRegenerateSingleScene(project.status)) {
    return {
      ok: false,
      code: "INVALID_PROJECT_STATE",
      message: `Cannot regenerate a scene while project status is ${project.status}`,
    };
  }

  repos.scenes.update(scene.id, {
    imageStatus: SceneAssetStatus.PENDING,
    videoStatus: SceneAssetStatus.PENDING,
    audioStatus: SceneAssetStatus.PENDING,
    assetPaths: {},
  });

  const jobInputs: CreateJobInput[] = buildSingleSceneRegenerationJobs(
    project.id,
    scene.id,
    {
      subtitlesEnabled: project.subtitleSettings.enabled,
      skipImageJobs,
    },
  );
  const jobs = repos.jobs.createMany(jobInputs);

  repos.projects.update(project.id, {
    status: skipImageJobs
      ? ProjectStatus.GENERATING_VIDEO
      : ProjectStatus.GENERATING_IMAGES,
  });

  return { ok: true, jobs };
}
