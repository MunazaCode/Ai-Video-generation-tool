import { ProjectStatus } from "../enums.js";

const forwardTransitions: Readonly<
  Partial<Record<ProjectStatus, readonly ProjectStatus[]>>
> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.ANALYZING, ProjectStatus.CANCELLED],
  [ProjectStatus.ANALYZING]: [
    ProjectStatus.PLANNING,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.PLANNING]: [
    ProjectStatus.GENERATING_STORYBOARD,
    ProjectStatus.ANALYZING,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.FAILED]: [
    ProjectStatus.ANALYZING,
    ProjectStatus.GENERATING_IMAGES,
    ProjectStatus.GENERATING_VIDEO,
    ProjectStatus.GENERATING_AUDIO,
    ProjectStatus.ASSEMBLING,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.CANCELLED]: [
    ProjectStatus.ANALYZING,
    ProjectStatus.GENERATING_IMAGES,
    ProjectStatus.GENERATING_VIDEO,
    ProjectStatus.GENERATING_AUDIO,
    ProjectStatus.ASSEMBLING,
  ],
  [ProjectStatus.PROCESSING]: [
    ProjectStatus.COMPLETED,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
    ProjectStatus.ASSEMBLING,
    ProjectStatus.GENERATING_IMAGES,
  ],
  [ProjectStatus.GENERATING_STORYBOARD]: [
    ProjectStatus.GENERATING_IMAGES,
    ProjectStatus.GENERATING_VIDEO, // text-to-video skips image jobs
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.GENERATING_IMAGES]: [
    ProjectStatus.GENERATING_VIDEO,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.GENERATING_VIDEO]: [
    ProjectStatus.GENERATING_AUDIO,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.GENERATING_AUDIO]: [
    ProjectStatus.ASSEMBLING,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.ASSEMBLING]: [
    ProjectStatus.PROCESSING,
    ProjectStatus.COMPLETED,
    ProjectStatus.FAILED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.COMPLETED]: [ProjectStatus.GENERATING_IMAGES],
};

const terminalStatuses: ReadonlySet<ProjectStatus> = new Set([
  ProjectStatus.COMPLETED,
  ProjectStatus.FAILED,
  ProjectStatus.CANCELLED,
]);

export function isTerminalProjectStatus(status: ProjectStatus): boolean {
  return terminalStatuses.has(status);
}

export function canTransitionProjectStatus(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) {
    return true;
  }
  if (to === ProjectStatus.FAILED) {
    return !isTerminalProjectStatus(from);
  }
  const allowed = forwardTransitions[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

export function assertProjectStatusTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): void {
  if (!canTransitionProjectStatus(from, to)) {
    throw new Error(
      `Invalid project status transition: ${from} → ${to}`,
    );
  }
}
