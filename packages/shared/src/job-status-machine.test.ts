import { describe, expect, it } from "vitest";
import { JobStatus } from "./enums.js";
import { canTransitionJobStatus } from "./status/job-status-machine.js";

describe("job status machine", () => {
  it("allows queued → running → completed", () => {
    expect(canTransitionJobStatus(JobStatus.QUEUED, JobStatus.RUNNING)).toBe(
      true,
    );
    expect(canTransitionJobStatus(JobStatus.RUNNING, JobStatus.COMPLETED)).toBe(
      true,
    );
  });

  it("allows retry re-queue from running", () => {
    expect(canTransitionJobStatus(JobStatus.RUNNING, JobStatus.QUEUED)).toBe(
      true,
    );
  });

  it("blocks completed → running", () => {
    expect(canTransitionJobStatus(JobStatus.COMPLETED, JobStatus.RUNNING)).toBe(
      false,
    );
  });
});
