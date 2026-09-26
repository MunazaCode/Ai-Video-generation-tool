import type { JobStatus, JobType } from "../enums.js";

export interface JobError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface Job {
  id: string;
  projectId: string;
  sceneId: string | null;
  type: JobType;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  attempts: number;
  error: JobError | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateJobInput {
  projectId: string;
  sceneId?: string | null;
  type: JobType;
  currentStep?: string | null;
}
