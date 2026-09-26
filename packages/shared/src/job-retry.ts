export const MAX_JOB_ATTEMPTS = 3;

export const JOB_BACKOFF_MS = [2_000, 5_000] as const;

/** Reclaim RUNNING jobs with no worker heartbeat longer than this (worker crash recovery). */
export const DEFAULT_WORKER_STALE_JOB_MS = 15 * 60 * 1000;

export function getJobBackoffMs(attempt: number): number {
  if (attempt <= 1) {
    return JOB_BACKOFF_MS[0];
  }
  if (attempt === 2) {
    return JOB_BACKOFF_MS[1];
  }
  return JOB_BACKOFF_MS[JOB_BACKOFF_MS.length - 1] ?? 5_000;
}

export function shouldRetryJob(attempts: number, retryable: boolean): boolean {
  if (!retryable) {
    return false;
  }
  return attempts < MAX_JOB_ATTEMPTS;
}
