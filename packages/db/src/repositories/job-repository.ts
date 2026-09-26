import {
  JobStatus,
  JobType,
  ProjectStatus,
  sceneNeedsGenerationJob,
  type CreateJobInput,
  type Job,
  type JobError,
  type SceneJobSnapshot,
  assertJobStatusTransition,
} from "@asv/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { mapJobRow } from "../mappers.js";
import { jobs, projects } from "../schema.js";
import { newId, nowMs } from "../utils.js";

const ACTIVE_STATUSES = [JobStatus.QUEUED, JobStatus.RUNNING] as const;

/** Lower number = higher claim priority (images before video/audio/assemble). */
const JOB_TYPE_CLAIM_ORDER = sql`CASE ${jobs.type}
  WHEN ${JobType.GENERATE_IMAGE} THEN 0
  WHEN ${JobType.GENERATE_VIDEO} THEN 1
  WHEN ${JobType.GENERATE_AUDIO} THEN 2
  WHEN ${JobType.GENERATE_SUBTITLES} THEN 3
  WHEN ${JobType.ASSEMBLE_VIDEO} THEN 4
  ELSE 5
END`;

export class JobRepository {
  constructor(private readonly db: DrizzleDb) {}

  create(input: CreateJobInput): Job {
    const ts = nowMs();
    const row = {
      id: newId(),
      projectId: input.projectId,
      sceneId: input.sceneId ?? null,
      type: input.type,
      status: JobStatus.QUEUED,
      progress: 0,
      currentStep: input.currentStep ?? null,
      attempts: 0,
      errorJson: null,
      createdAt: ts,
      startedAt: null,
      completedAt: null,
    };
    this.db.insert(jobs).values(row).run();
    return mapJobRow(row);
  }

  createMany(inputs: CreateJobInput[]): Job[] {
    const base = Date.now();
    return inputs.map((input, index) => {
      const ts = new Date(base + index);
      const row = {
        id: newId(),
        projectId: input.projectId,
        sceneId: input.sceneId ?? null,
        type: input.type,
        status: JobStatus.QUEUED,
        progress: 0,
        currentStep: input.currentStep ?? null,
        attempts: 0,
        errorJson: null,
        createdAt: ts,
        startedAt: null,
        completedAt: null,
      };
      this.db.insert(jobs).values(row).run();
      return mapJobRow(row);
    });
  }

  findById(id: string): Job | null {
    const row = this.db.select().from(jobs).where(eq(jobs.id, id)).get();
    return row ? mapJobRow(row) : null;
  }

  listByProjectId(projectId: string): Job[] {
    const rows = this.db
      .select()
      .from(jobs)
      .where(eq(jobs.projectId, projectId))
      .orderBy(asc(jobs.createdAt))
      .all();
    return rows.map(mapJobRow);
  }

  hasActiveJobs(projectId: string): boolean {
    const row = this.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.projectId, projectId),
          inArray(jobs.status, [...ACTIVE_STATUSES]),
        ),
      )
      .get();
    return row !== undefined;
  }

  claimNextQueued(): Job | null {
    return this.db.transaction((tx) => {
      const row = tx
        .select()
        .from(jobs)
        .where(eq(jobs.status, JobStatus.QUEUED))
        .orderBy(asc(JOB_TYPE_CLAIM_ORDER), asc(jobs.createdAt))
        .limit(1)
        .get();
      if (!row) {
        return null;
      }

      const startedAt = nowMs();
      tx.update(jobs)
        .set({
          status: JobStatus.RUNNING,
          startedAt,
          currentStep: row.currentStep ?? "running",
          attempts: row.attempts + 1,
        })
        .where(eq(jobs.id, row.id))
        .run();

      const claimed = tx.select().from(jobs).where(eq(jobs.id, row.id)).get();
      return claimed ? mapJobRow(claimed) : null;
    });
  }

  updateStatus(
    id: string,
    status: JobStatus,
    fields?: {
      progress?: number;
      currentStep?: string | null;
      error?: JobError | null;
      attempts?: number;
    },
  ): Job | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }
    assertJobStatusTransition(existing.status, status);

    const patch: Partial<typeof jobs.$inferInsert> = { status };
    if (fields?.progress !== undefined) patch.progress = fields.progress;
    if (fields?.currentStep !== undefined) patch.currentStep = fields.currentStep;
    if (fields?.attempts !== undefined) patch.attempts = fields.attempts;
    if (fields?.error !== undefined) {
      patch.errorJson = fields.error ? JSON.stringify(fields.error) : null;
    }

    if (status === JobStatus.RUNNING && existing.startedAt === null) {
      patch.startedAt = nowMs();
    }
    if (
      status === JobStatus.COMPLETED ||
      status === JobStatus.FAILED ||
      status === JobStatus.CANCELLED
    ) {
      patch.completedAt = nowMs();
    }
    if (status === JobStatus.QUEUED) {
      patch.completedAt = null;
      patch.startedAt = null;
    }

    this.db.update(jobs).set(patch).where(eq(jobs.id, id)).run();
    return this.findById(id);
  }

  requeueAfterFailure(id: string, error: JobError): Job | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }
    return this.updateStatus(id, JobStatus.QUEUED, {
      progress: 0,
      currentStep: "queued_for_retry",
      error,
    });
  }

  cancelAllForProject(projectId: string): number {
    const active = this.db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.projectId, projectId),
          inArray(jobs.status, [...ACTIVE_STATUSES]),
        ),
      )
      .all();

    let count = 0;
    for (const row of active) {
      const job = mapJobRow(row);
      if (canCancel(job)) {
        this.updateStatus(job.id, JobStatus.CANCELLED, {
          currentStep: "cancelled",
          error: {
            code: "JOB_CANCELLED",
            message: "Cancelled by user",
            retryable: false,
          },
        });
        count += 1;
      }
    }
    return count;
  }

  cancelJob(id: string): Job | null {
    const job = this.findById(id);
    if (!job || !canCancel(job)) {
      return null;
    }
    return this.updateStatus(id, JobStatus.CANCELLED, {
      currentStep: "cancelled",
      error: {
        code: "JOB_CANCELLED",
        message: "Cancelled by user",
        retryable: false,
      },
    });
  }

  /**
   * Recover jobs stuck RUNNING after worker crash. Cancelled projects → CANCELLED;
   * otherwise requeue for retry.
   */
  reclaimStaleRunningJobs(staleAfterMs: number): number {
    if (staleAfterMs <= 0) {
      return 0;
    }
    const cutoff = nowMs().getTime() - staleAfterMs;
    const rows = this.db
      .select()
      .from(jobs)
      .where(eq(jobs.status, JobStatus.RUNNING))
      .all();

    let count = 0;
    for (const row of rows) {
      const job = mapJobRow(row);
      const startedMs = job.startedAt?.getTime() ?? job.createdAt.getTime();
      if (startedMs >= cutoff) {
        continue;
      }

      const projectRow = this.db
        .select({ status: projects.status })
        .from(projects)
        .where(eq(projects.id, job.projectId))
        .get();

      if (projectRow?.status === ProjectStatus.CANCELLED) {
        this.updateStatus(job.id, JobStatus.CANCELLED, {
          currentStep: "cancelled_stale_running",
          error: {
            code: "JOB_CANCELLED",
            message: "Stale running job on cancelled project",
            retryable: false,
          },
        });
      } else {
        this.requeueAfterFailure(job.id, {
          code: "STALE_RUNNING_RECLAIMED",
          message: "Running job reclaimed after worker timeout",
          retryable: true,
        });
      }
      count += 1;
    }
    return count;
  }
}

function canCancel(job: Job): boolean {
  return job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING;
}

export interface BuildSceneGenerationJobsOptions {
  subtitlesEnabled?: boolean;
  /** When false, skip assembly (used in tests). Default true. */
  includeAssemble?: boolean;
  /** Enqueue assembly even when every scene job is already satisfied (e.g. final MP4 missing). */
  forceAssemble?: boolean;
  /** Skip still-image jobs when using text-to-video (VIDEO_PROVIDER=pollinations, wan, etc.). */
  skipImageJobs?: boolean;
}

export function buildSceneGenerationJobs(
  projectId: string,
  scenes: SceneJobSnapshot[],
  options: BuildSceneGenerationJobsOptions = {},
): CreateJobInput[] {
  const created: CreateJobInput[] = [];
  const jobOptions = { subtitlesEnabled: options.subtitlesEnabled ?? false };

  // Phase-ordered: all images, then videos, then audio/subtitles, then assemble.
  // Prevents video jobs from racing ahead of stills when timestamps collide.
  if (!options.skipImageJobs) {
    for (const scene of scenes) {
      if (sceneNeedsGenerationJob(scene, JobType.GENERATE_IMAGE, jobOptions)) {
        created.push({
          projectId,
          sceneId: scene.id,
          type: JobType.GENERATE_IMAGE,
          currentStep: "generate_image",
        });
      }
    }
  }
  for (const scene of scenes) {
    if (sceneNeedsGenerationJob(scene, JobType.GENERATE_VIDEO, jobOptions)) {
      created.push({
        projectId,
        sceneId: scene.id,
        type: JobType.GENERATE_VIDEO,
        currentStep: "generate_video",
      });
    }
  }
  for (const scene of scenes) {
    if (sceneNeedsGenerationJob(scene, JobType.GENERATE_AUDIO, jobOptions)) {
      created.push({
        projectId,
        sceneId: scene.id,
        type: JobType.GENERATE_AUDIO,
        currentStep: "generate_audio",
      });
    }
    if (sceneNeedsGenerationJob(scene, JobType.GENERATE_SUBTITLES, jobOptions)) {
      created.push({
        projectId,
        sceneId: scene.id,
        type: JobType.GENERATE_SUBTITLES,
        currentStep: "generate_subtitles",
      });
    }
  }

  const includeAssemble = options.includeAssemble ?? true;
  const needsAssemble =
    created.length > 0 || (options.forceAssemble ?? false);
  if (includeAssemble && needsAssemble) {
    created.push({
      projectId,
      sceneId: null,
      type: JobType.ASSEMBLE_VIDEO,
      currentStep: "assemble_video",
    });
  }

  return created;
}

export function buildSingleSceneRegenerationJobs(
  projectId: string,
  sceneId: string,
  options: { subtitlesEnabled?: boolean; skipImageJobs?: boolean },
): CreateJobInput[] {
  const created: CreateJobInput[] = [];
  if (!options.skipImageJobs) {
    created.push({
      projectId,
      sceneId,
      type: JobType.GENERATE_IMAGE,
      currentStep: "regenerate_image",
    });
  }
  created.push(
    {
      projectId,
      sceneId,
      type: JobType.GENERATE_VIDEO,
      currentStep: "regenerate_video",
    },
    {
      projectId,
      sceneId,
      type: JobType.GENERATE_AUDIO,
      currentStep: "regenerate_audio",
    },
  );
  if (options.subtitlesEnabled) {
    created.push({
      projectId,
      sceneId,
      type: JobType.GENERATE_SUBTITLES,
      currentStep: "regenerate_subtitles",
    });
  }
  created.push({
    projectId,
    sceneId: null,
    type: JobType.ASSEMBLE_VIDEO,
    currentStep: "reassemble_video",
  });
  return created;
}
