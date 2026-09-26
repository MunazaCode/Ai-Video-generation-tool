"use client";

import { ProjectProgressBar } from "@/components/ui/project-progress-bar";
import { ProjectStatusBadge } from "@/components/ui/project-status-badge";
import { shouldShowProgressBar } from "@/lib/generation-status";
import { useProjectProgressLive } from "./project-progress-provider";

export function ProjectLiveHeader() {
  const { status, progress } = useProjectProgressLive();

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ProjectStatusBadge status={status} />
        {shouldShowProgressBar(status, progress) ? (
          <span className="text-sm text-muted">{progress}%</span>
        ) : null}
      </div>
      {shouldShowProgressBar(status, progress) ? (
        <div className="mt-3 max-w-md">
          <ProjectProgressBar progress={progress} />
        </div>
      ) : null}
    </>
  );
}
