# Cancellation and worker recovery

## User cancel

`POST /api/projects/:id/cancel`:

1. Marks all **QUEUED** and **RUNNING** jobs for the project as **CANCELLED**.
2. Sets the project to **CANCELLED** when it is not already terminal.
3. Resets any scene asset flags stuck in **RUNNING** to **QUEUED** so resume/planning stays consistent.

The web app exposes **Cancel generation** while a run is active.

## Worker behavior

While processing a job, the worker re-reads job status at checkpoints (`isStillRunning`). If the job is no longer **RUNNING** (typically **CANCELLED**), it stops without marking the job **FAILED** or **COMPLETED**.

On errors, retry/fail logic runs only when the job is still **RUNNING**, so cancelled jobs are not resurrected as failures.

Assembly skips marking the project **COMPLETED** if the project was cancelled (or is otherwise terminal) after FFmpeg finishes.

**Note:** FFmpeg assembly is not aborted mid-process; cancel takes effect before/after the assemble step or once the subprocess returns.

## Stale RUNNING jobs (worker crash)

If a worker dies while a job is **RUNNING**, that row can block `hasActiveJobs` and resume until it is reclaimed.

Each worker poll (and startup loop) calls `reclaimStaleRunningJobs` when `WORKER_STALE_JOB_MS` &gt; 0 (default **15 minutes**):

| Project state | Stale RUNNING job becomes |
|---------------|---------------------------|
| Not cancelled | **QUEUED** (`STALE_RUNNING_RECLAIMED`, retryable) |
| **CANCELLED** | **CANCELLED** |

Set `WORKER_STALE_JOB_MS=0` to disable reclaim (not recommended in production).

## Resume after cancel

`POST /api/projects/:id/resume` enqueues only missing work (see [long-form.md](./long-form.md)). Cancelled jobs are not restarted; new jobs are created for outstanding scene assets.
