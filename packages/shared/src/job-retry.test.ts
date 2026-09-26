import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKER_STALE_JOB_MS,
  getJobBackoffMs,
  MAX_JOB_ATTEMPTS,
  shouldRetryJob,
} from "./job-retry.js";

describe("job retry", () => {
  it("caps attempts at MAX_JOB_ATTEMPTS", () => {
    expect(shouldRetryJob(MAX_JOB_ATTEMPTS - 1, true)).toBe(true);
    expect(shouldRetryJob(MAX_JOB_ATTEMPTS, true)).toBe(false);
  });

  it("never retries non-retryable errors", () => {
    expect(shouldRetryJob(0, false)).toBe(false);
  });

  it("uses exponential backoff schedule", () => {
    expect(getJobBackoffMs(1)).toBe(2000);
    expect(getJobBackoffMs(2)).toBe(5000);
    expect(getJobBackoffMs(9)).toBe(5000);
  });

  it("defines a positive default stale running reclaim window", () => {
    expect(DEFAULT_WORKER_STALE_JOB_MS).toBeGreaterThan(60_000);
  });
});
