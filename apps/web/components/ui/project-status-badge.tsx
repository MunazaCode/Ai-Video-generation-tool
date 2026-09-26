import type { ProjectStatus as ProjectStatusType } from "@asv/shared";
import { formatProjectStatusLabel } from "@/lib/project-actions";
import { shouldPollGenerationProgress } from "@/lib/generation-status";

export function ProjectStatusBadge({ status }: { status: ProjectStatusType }) {
  const live = shouldPollGenerationProgress(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        live
          ? "bg-accent/15 text-accent"
          : "bg-background text-muted"
      }`}
    >
      {live ? (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
          aria-hidden="true"
        />
      ) : null}
      {formatProjectStatusLabel(status)}
    </span>
  );
}
