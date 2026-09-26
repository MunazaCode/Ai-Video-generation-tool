import { fetchFromApi } from "./fetch-api";
import type { ApiResponse } from "./api-types";
import type { ProjectStatus } from "@asv/shared";

export interface ProjectProgressPayload {
  project: { status: ProjectStatus; progress: number };
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  sceneAssets?: {
    total: number;
    imagesComplete: number;
    videosComplete: number;
    audioComplete: number;
    subtitlesComplete: number;
  };
  finalVideoReady?: boolean;
  assemblyNote?: string | null;
}

export async function fetchProjectProgress(
  projectId: string,
): Promise<ApiResponse<ProjectProgressPayload>> {
  const res = await fetchFromApi(`/api/projects/${projectId}/progress`, {
    cache: "no-store",
  });
  return (await res.json()) as ApiResponse<ProjectProgressPayload>;
}
