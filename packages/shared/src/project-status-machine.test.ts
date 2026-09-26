import { describe, expect, it } from "vitest";
import { ProjectStatus } from "./enums.js";
import {
  assertProjectStatusTransition,
  canTransitionProjectStatus,
  isTerminalProjectStatus,
} from "./status/project-status-machine.js";

describe("project status machine", () => {
  it("allows the happy-path pipeline", () => {
    const path = [
      ProjectStatus.DRAFT,
      ProjectStatus.ANALYZING,
      ProjectStatus.PLANNING,
      ProjectStatus.GENERATING_STORYBOARD,
      ProjectStatus.GENERATING_IMAGES,
      ProjectStatus.GENERATING_VIDEO,
      ProjectStatus.GENERATING_AUDIO,
      ProjectStatus.ASSEMBLING,
      ProjectStatus.PROCESSING,
      ProjectStatus.COMPLETED,
    ] as const;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path.at(i);
      const to = path.at(i + 1);
      if (from === undefined || to === undefined) {
        throw new Error("Invalid test path definition");
      }
      expect(canTransitionProjectStatus(from, to)).toBe(true);
      expect(() => {
        assertProjectStatusTransition(from, to);
      }).not.toThrow();
    }
  });

  it("allows text-to-video to skip image generation", () => {
    expect(
      canTransitionProjectStatus(
        ProjectStatus.GENERATING_STORYBOARD,
        ProjectStatus.GENERATING_VIDEO,
      ),
    ).toBe(true);
  });

  it("allows failure from any non-terminal state", () => {
    expect(
      canTransitionProjectStatus(ProjectStatus.GENERATING_VIDEO, ProjectStatus.FAILED),
    ).toBe(true);
    expect(
      canTransitionProjectStatus(ProjectStatus.COMPLETED, ProjectStatus.FAILED),
    ).toBe(false);
  });

  it("marks completed, failed, and cancelled as terminal", () => {
    expect(isTerminalProjectStatus(ProjectStatus.COMPLETED)).toBe(true);
    expect(isTerminalProjectStatus(ProjectStatus.DRAFT)).toBe(false);
  });

  it("rejects invalid skips", () => {
    expect(
      canTransitionProjectStatus(ProjectStatus.DRAFT, ProjectStatus.COMPLETED),
    ).toBe(false);
  });

  it("allows resume from failed into any generation phase", () => {
    expect(
      canTransitionProjectStatus(
        ProjectStatus.FAILED,
        ProjectStatus.GENERATING_VIDEO,
      ),
    ).toBe(true);
    expect(
      canTransitionProjectStatus(
        ProjectStatus.CANCELLED,
        ProjectStatus.GENERATING_AUDIO,
      ),
    ).toBe(true);
  });

  it("allows re-analysis from planning or failed", () => {
    expect(
      canTransitionProjectStatus(ProjectStatus.PLANNING, ProjectStatus.ANALYZING),
    ).toBe(true);
    expect(
      canTransitionProjectStatus(ProjectStatus.FAILED, ProjectStatus.ANALYZING),
    ).toBe(true);
  });

  it("allows scene regen from completed to generating images", () => {
    expect(
      canTransitionProjectStatus(
        ProjectStatus.COMPLETED,
        ProjectStatus.GENERATING_IMAGES,
      ),
    ).toBe(true);
  });

  it("allows assembling to complete when final MP4 is ready", () => {
    expect(
      canTransitionProjectStatus(
        ProjectStatus.ASSEMBLING,
        ProjectStatus.COMPLETED,
      ),
    ).toBe(true);
  });
});
