export class ScenePlannerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenePlannerConfigError";
  }
}

/** Dynamic scene count — never hard-code a fixed scene total. */
export function calculateSceneCount(
  targetDurationSec: number,
  targetSceneDurationSec: number,
): number {
  if (!Number.isFinite(targetDurationSec) || targetDurationSec <= 0) {
    throw new ScenePlannerConfigError("targetDurationSec must be a positive number");
  }
  if (!Number.isFinite(targetSceneDurationSec) || targetSceneDurationSec <= 0) {
    throw new ScenePlannerConfigError(
      "targetSceneDurationSec must be a positive number",
    );
  }
  return Math.ceil(targetDurationSec / targetSceneDurationSec);
}

/**
 * Splits target duration across scenes; sum equals targetDurationSec exactly.
 */
export function distributeSceneDurations(
  targetDurationSec: number,
  sceneCount: number,
): number[] {
  if (sceneCount <= 0) {
    throw new ScenePlannerConfigError("sceneCount must be positive");
  }
  if (targetDurationSec <= 0) {
    throw new ScenePlannerConfigError("targetDurationSec must be positive");
  }

  const base = Math.floor(targetDurationSec / sceneCount);
  const remainder = targetDurationSec % sceneCount;

  return Array.from({ length: sceneCount }, (_, index) => {
    return base + (index < remainder ? 1 : 0);
  });
}

export function sumDurations(durations: number[]): number {
  return durations.reduce((total, value) => total + value, 0);
}
