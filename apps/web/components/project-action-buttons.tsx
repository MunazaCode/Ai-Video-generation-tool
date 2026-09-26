"use client";

import { ProjectStatus, type ProjectStatus as ProjectStatusType } from "@asv/shared";
import { AnalyzeProjectButton } from "@/components/analyze-project-button";
import { CancelGenerationButton } from "@/components/cancel-generation-button";
import { GenerateVideoButton } from "@/components/generate-video-button";
import { PlanScenesButton } from "@/components/plan-scenes-button";
import { ResumeGenerationButton } from "@/components/resume-generation-button";
import { useProjectProgressLive } from "@/components/project-progress-provider";
import {
  canCancelGeneration,
  canResumeGenerationUi,
} from "@/lib/generation-status";

export function ProjectActionButtons({
  projectId,
  status: initialStatus,
  hasStoryAnalysis,
}: {
  projectId: string;
  status: ProjectStatusType;
  hasStoryAnalysis: boolean;
}) {
  const live = useProjectProgressLive();
  const status = live.status ?? initialStatus;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <AnalyzeProjectButton
        projectId={projectId}
        disabled={
          status !== ProjectStatus.DRAFT &&
          status !== ProjectStatus.PLANNING &&
          status !== ProjectStatus.FAILED
        }
      />
      <PlanScenesButton
        projectId={projectId}
        disabled={!hasStoryAnalysis || status !== ProjectStatus.PLANNING}
      />
      <GenerateVideoButton
        projectId={projectId}
        disabled={status !== ProjectStatus.GENERATING_STORYBOARD}
      />
      {canResumeGenerationUi(status, live.summary) ? (
        <ResumeGenerationButton projectId={projectId} />
      ) : null}
      {canCancelGeneration(status) ? (
        <CancelGenerationButton projectId={projectId} />
      ) : null}
    </div>
  );
}
