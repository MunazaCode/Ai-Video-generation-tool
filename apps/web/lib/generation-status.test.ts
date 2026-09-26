import { ProjectStatus } from "@asv/shared";
import { describe, expect, it } from "vitest";
import {
  projectsNeedLiveRefresh,
  shouldPollGenerationProgress,
  shouldShowProgressBar,
} from "./generation-status";

describe("generation-status", () => {
  it("detects active generation for polling", () => {
    expect(shouldPollGenerationProgress(ProjectStatus.GENERATING_IMAGES)).toBe(
      true,
    );
    expect(shouldPollGenerationProgress(ProjectStatus.DRAFT)).toBe(false);
  });

  it("shows progress bar only for real progress states", () => {
    expect(shouldShowProgressBar(ProjectStatus.DRAFT, 0)).toBe(false);
    expect(shouldShowProgressBar(ProjectStatus.COMPLETED, 100)).toBe(true);
    expect(shouldShowProgressBar(ProjectStatus.GENERATING_VIDEO, 42)).toBe(
      true,
    );
  });

  it("refreshes list when any project is generating", () => {
    expect(
      projectsNeedLiveRefresh([
        { status: ProjectStatus.DRAFT },
        { status: ProjectStatus.GENERATING_AUDIO },
      ]),
    ).toBe(true);
    expect(
      projectsNeedLiveRefresh([{ status: ProjectStatus.COMPLETED }]),
    ).toBe(false);
  });
});
