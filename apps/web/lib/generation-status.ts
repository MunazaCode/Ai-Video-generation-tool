import {
  ProjectStatus,
  canRegenerateSingleScene,
  canResumeGeneration,
  type ProjectStatus as ProjectStatusType,
} from "@asv/shared";

const POLL_STATUSES = new Set<ProjectStatusType>([
  ProjectStatus.GENERATING_IMAGES,
  ProjectStatus.GENERATING_VIDEO,
  ProjectStatus.GENERATING_AUDIO,
  ProjectStatus.ASSEMBLING,
  ProjectStatus.PROCESSING,
]);

export function shouldPollGenerationProgress(
  status: ProjectStatusType,
): boolean {
  return POLL_STATUSES.has(status);
}

export function shouldShowProgressBar(
  status: ProjectStatusType,
  progress: number,
): boolean {
  if (shouldPollGenerationProgress(status)) {
    return true;
  }
  if (status === ProjectStatus.COMPLETED) {
    return true;
  }
  return progress > 0;
}

export function projectsNeedLiveRefresh(
  projects: { status: ProjectStatusType }[],
): boolean {
  return projects.some((p) => shouldPollGenerationProgress(p.status));
}

export function canCancelGeneration(status: ProjectStatusType): boolean {
  return shouldPollGenerationProgress(status);
}

export function canResumeGenerationUi(
  status: ProjectStatusType,
  jobSummary?: { queued: number; running: number } | null,
): boolean {
  if (status === ProjectStatus.FAILED || status === ProjectStatus.CANCELLED) {
    return true;
  }
  if (!canResumeGeneration(status)) {
    return false;
  }
  const active = (jobSummary?.queued ?? 0) + (jobSummary?.running ?? 0);
  return active === 0;
}

export function canRegenerateSceneUi(status: ProjectStatusType): boolean {
  return canRegenerateSingleScene(status);
}

export const PROJECT_LIST_POLL_MS = 2500;
export const PROJECT_DETAIL_POLL_MS = 2000;
