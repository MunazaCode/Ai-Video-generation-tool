import { JobStatus } from "../enums.js";

const forwardTransitions: Readonly<
  Partial<Record<JobStatus, readonly JobStatus[]>>
> = {
  [JobStatus.QUEUED]: [
    JobStatus.RUNNING,
    JobStatus.CANCELLED,
    JobStatus.FAILED,
  ],
  [JobStatus.RUNNING]: [
    JobStatus.COMPLETED,
    JobStatus.FAILED,
    JobStatus.CANCELLED,
    JobStatus.QUEUED,
  ],
};

const terminalStatuses: ReadonlySet<JobStatus> = new Set([
  JobStatus.COMPLETED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
]);

export function isTerminalJobStatus(status: JobStatus): boolean {
  return terminalStatuses.has(status);
}

export function canTransitionJobStatus(
  from: JobStatus,
  to: JobStatus,
): boolean {
  if (from === to) {
    return true;
  }
  const allowed = forwardTransitions[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

export function assertJobStatusTransition(
  from: JobStatus,
  to: JobStatus,
): void {
  if (!canTransitionJobStatus(from, to)) {
    throw new Error(`Invalid job status transition: ${from} → ${to}`);
  }
}
