import {
  projectSubtitleSrtRelativePath,
  projectSubtitleVttRelativePath,
} from "@asv/shared";
import type { Context } from "hono";
import type { AppVariables } from "../context.js";
import { jsonError } from "./responses.js";

export async function streamProjectSubtitles(
  c: Context<{ Variables: AppVariables }>,
  format: "vtt" | "srt",
): Promise<Response> {
  const id = c.req.param("id");
  if (!id) {
    return jsonError(
      c,
      {
        code: "VALIDATION_ERROR",
        message: "Project id is required",
        retryable: false,
      },
      400,
    );
  }

  const project = c.get("db").repositories.projects.findById(id);
  if (!project) {
    return jsonError(
      c,
      {
        code: "PROJECT_NOT_FOUND",
        message: "Project not found",
        retryable: false,
      },
      404,
    );
  }

  if (!project.subtitleSettings.enabled) {
    return jsonError(
      c,
      {
        code: "SUBTITLES_DISABLED",
        message: "Subtitles are disabled for this project",
        retryable: false,
      },
      404,
    );
  }

  const storage = c.get("storage");
  const relativePath =
    format === "vtt"
      ? projectSubtitleVttRelativePath(id)
      : projectSubtitleSrtRelativePath(id);
  const exists = await storage.exists(relativePath);
  if (!exists) {
    return jsonError(
      c,
      {
        code: "SUBTITLES_NOT_READY",
        message: "Subtitle files are not ready yet",
        retryable: true,
      },
      404,
    );
  }

  const data = await storage.get(relativePath);
  const contentType = format === "vtt" ? "text/vtt; charset=utf-8" : "application/x-subrip; charset=utf-8";

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=60",
    },
  });
}
