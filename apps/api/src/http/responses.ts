import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ApiErrorBody {
  code: string;
  message: string;
  retryable: boolean;
}

export function jsonSuccess<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true as const, data }, status);
}

export function jsonError(
  c: Context,
  error: ApiErrorBody,
  status: ContentfulStatusCode,
) {
  return c.json({ success: false as const, error }, status);
}
