/** Soft defer — requeue without burning a failure attempt. */
export class DeferredJobError extends Error {
  readonly defer = true as const;

  constructor(message: string) {
    super(message);
    this.name = "DeferredJobError";
  }
}

export function isDeferredJobError(error: unknown): error is DeferredJobError {
  return (
    error instanceof DeferredJobError ||
    (typeof error === "object" &&
      error !== null &&
      "defer" in error &&
      (error as { defer?: unknown }).defer === true)
  );
}
