import { fetchFromApi } from "./fetch-api";
import type { ApiResponse } from "./api-types";

export interface SceneDto {
  id: string;
  sequence: number;
  title: string;
  narration: string;
  durationSec: number;
  imageStatus: string;
  videoStatus: string;
  audioStatus: string;
}

export async function listProjectScenes(
  projectId: string,
): Promise<ApiResponse<{ scenes: SceneDto[] }>> {
  const res = await fetchFromApi(`/api/projects/${projectId}/scenes`, {
    cache: "no-store",
  });
  return (await res.json()) as ApiResponse<{ scenes: SceneDto[] }>;
}
