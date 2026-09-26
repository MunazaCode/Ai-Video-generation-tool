import { fetchFromApi } from "./fetch-api";
import type { ApiResponse, ProjectDto } from "./api-types";

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

export async function createProject(
  body: Record<string, unknown>,
): Promise<ApiResponse<ProjectDto>> {
  const res = await fetchFromApi(`/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseApiResponse<ProjectDto>(res);
}

export async function listProjects(): Promise<
  ApiResponse<{ projects: ProjectDto[] }>
> {
  const res = await fetchFromApi(`/api/projects`, {
    cache: "no-store",
  });
  return parseApiResponse<{ projects: ProjectDto[] }>(res);
}

export async function getProject(id: string): Promise<ApiResponse<ProjectDto>> {
  const res = await fetchFromApi(`/api/projects/${id}`, {
    cache: "no-store",
  });
  return parseApiResponse<ProjectDto>(res);
}
