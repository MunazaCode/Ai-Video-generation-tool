import { getPublicApiBaseUrl } from "./api-config";

export class ApiConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConnectionError";
  }
}

/** Fetch JSON from the backend API with a clear error when the API is unreachable. */
export async function fetchFromApi(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${getPublicApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    return await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ApiConnectionError(
      `Cannot reach the API at ${getPublicApiBaseUrl()} (${detail}). ` +
        `Start it with pnpm dev:api from the repo root, and ensure NEXT_PUBLIC_API_URL matches.`,
    );
  }
}
