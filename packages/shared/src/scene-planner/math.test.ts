import { describe, expect, it } from "vitest";
import {
  calculateSceneCount,
  distributeSceneDurations,
  sumDurations,
} from "./math.js";

describe("scene planner math", () => {
  it("calculates scene count from duration ratio", () => {
    expect(calculateSceneCount(300, 8)).toBe(38);
    expect(calculateSceneCount(60, 8)).toBe(8);
    expect(calculateSceneCount(61, 8)).toBe(8);
    expect(calculateSceneCount(62, 8)).toBe(8);
    expect(calculateSceneCount(63, 8)).toBe(8);
    expect(calculateSceneCount(64, 8)).toBe(8);
    expect(calculateSceneCount(65, 8)).toBe(9);
  });

  it("distributes durations that sum to the target", () => {
    const durations = distributeSceneDurations(300, 38);
    expect(durations).toHaveLength(38);
    expect(sumDurations(durations)).toBe(300);
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...durations)).toBeLessThanOrEqual(9);
  });

  it("supports long-form targets without a hard-coded cap", () => {
    const count = calculateSceneCount(1200, 8);
    expect(count).toBe(150);
    expect(sumDurations(distributeSceneDurations(1200, count))).toBe(1200);
  });
});
