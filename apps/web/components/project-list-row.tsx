import Link from "next/link";
import type { ProjectDto } from "@/lib/api-types";
import { getProjectPrimaryAction } from "@/lib/project-actions";
import { shouldShowProgressBar } from "@/lib/generation-status";
import { ProjectProgressBar } from "@/components/ui/project-progress-bar";
import { ProjectStatusBadge } from "@/components/ui/project-status-badge";

export function ProjectListRow({ project }: { project: ProjectDto }) {
  const action = getProjectPrimaryAction(project.status);
  const showBar = shouldShowProgressBar(project.status, project.progress);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-3 px-4 py-4 transition hover:bg-background/60"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-foreground">{project.title}</p>
          <p className="text-xs text-muted">
            {Math.round(project.targetDurationSec / 60)} min target ·{" "}
            {project.aspectRatio}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <ProjectStatusBadge status={project.status} />
          <span className="text-xs text-muted">
            {new Date(project.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>
      {showBar ? (
        <ProjectProgressBar
          progress={project.progress}
          label="Job progress"
        />
      ) : null}
      <p className="text-xs text-muted">
        <span className="font-medium text-foreground">{action.label}</span>
        {" · "}
        {action.hint}
      </p>
    </Link>
  );
}
