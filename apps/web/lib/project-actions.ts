import { ProjectStatus, type ProjectStatus as ProjectStatusType } from "@asv/shared";

export interface ProjectPrimaryAction {
  label: string;
  hint: string;
}

export function getProjectPrimaryAction(
  status: ProjectStatusType,
): ProjectPrimaryAction {
  switch (status) {
    case ProjectStatus.DRAFT:
    case ProjectStatus.FAILED:
      return { label: "Analyze script", hint: "Run story analysis on the project page" };
    case ProjectStatus.ANALYZING:
      return { label: "Analyzing…", hint: "Analysis runs on the server" };
    case ProjectStatus.PLANNING:
      return { label: "Plan scenes", hint: "Build timed scenes from the analysis" };
    case ProjectStatus.GENERATING_STORYBOARD:
      return { label: "Generate video", hint: "Enqueue jobs and run the worker" };
    case ProjectStatus.COMPLETED:
      return { label: "Watch video", hint: "Play or download the final MP4" };
    case ProjectStatus.CANCELLED:
      return { label: "Review project", hint: "Adjust script and start again" };
    default:
      return { label: "View progress", hint: "Generation is in progress" };
  }
}

export function formatProjectStatusLabel(status: ProjectStatusType): string {
  return status.replaceAll("_", " ").toLowerCase();
}
