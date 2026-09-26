import type { Repositories } from "@asv/db";
import {
  JobStatus,
  ProjectStatus,
  getJobBackoffMs,
  shouldRetryJob,
  type Job,
} from "@asv/shared";
import type { JobProcessor } from "./job-processor.js";
import { isDeferredJobError } from "./deferred-job-error.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runWorkerLoop(options: {
  repositories: Repositories;
  processor: JobProcessor;
  pollIntervalMs: number;
  staleJobMs?: number;
  signal?: AbortSignal;
}): Promise<void> {
  const { repositories, processor, pollIntervalMs, staleJobMs = 0, signal } =
    options;

  while (!signal?.aborted) {
    if (staleJobMs > 0) {
      repositories.jobs.reclaimStaleRunningJobs(staleJobMs);
    }
    const claimed = repositories.jobs.claimNextQueued();
    if (!claimed) {
      await sleep(pollIntervalMs);
      continue;
    }

    const job: Job = claimed;

    try {
      await processor.process(job);
    } catch (error) {
      const latest = repositories.jobs.findById(job.id);
      if (latest?.status !== JobStatus.RUNNING) {
        continue;
      }

      if (isDeferredJobError(error)) {
        const attempts = Math.max(0, latest.attempts - 1);
        repositories.jobs.updateStatus(job.id, JobStatus.QUEUED, {
          currentStep: "waiting_for_dependency",
          attempts,
          error: {
            code: "DEFERRED",
            message: error.message,
            retryable: true,
          },
        });
        await sleep(pollIntervalMs);
        continue;
      }

      const message =
        error instanceof Error ? error.message : "Job processing failed";
      const jobError = {
        code: "JOB_FAILED",
        message,
        retryable: true,
      };

      if (shouldRetryJob(latest.attempts, jobError.retryable)) {
        repositories.jobs.requeueAfterFailure(job.id, jobError);
        await sleep(getJobBackoffMs(latest.attempts));
      } else {
        repositories.jobs.updateStatus(job.id, JobStatus.FAILED, {
          error: jobError,
          currentStep: "failed",
        });
        try {
          repositories.projects.update(job.projectId, {
            status: ProjectStatus.FAILED,
          });
        } catch {
          /* project may already be terminal */
        }
      }
    }
  }
}

/** Process all currently queued jobs (for tests and one-shot drains). */
export async function drainJobQueue(
  repositories: Repositories,
  processor: JobProcessor,
  maxJobs = 10_000,
): Promise<number> {
  let processed = 0;
  while (processed < maxJobs) {
    const claimed = repositories.jobs.claimNextQueued();
    if (!claimed) {
      break;
    }
    const job: Job = claimed;
    try {
      await processor.process(job);
    } catch (error) {
      const latest = repositories.jobs.findById(job.id);
      if (latest?.status !== JobStatus.RUNNING) {
        /* cancelled or reclaimed while processing */
      } else if (isDeferredJobError(error)) {
        repositories.jobs.updateStatus(job.id, JobStatus.QUEUED, {
          currentStep: "waiting_for_dependency",
          attempts: Math.max(0, latest.attempts - 1),
        });
        break;
      } else if (shouldRetryJob(latest.attempts, true)) {
        const message =
          error instanceof Error ? error.message : "Job processing failed";
        repositories.jobs.requeueAfterFailure(job.id, {
          code: "JOB_FAILED",
          message,
          retryable: true,
        });
      } else {
        const message =
          error instanceof Error ? error.message : "Job processing failed";
        repositories.jobs.updateStatus(job.id, JobStatus.FAILED, {
          error: { code: "JOB_FAILED", message, retryable: false },
        });
      }
    }
    processed += 1;
  }
  return processed;
}
