import { ProjectStatus } from "@asv/shared";
import { projectFinalVideoRelativePath } from "@asv/video-engine";
import type { Context } from "hono";
import type { AppVariables } from "../context.js";
import { jsonError } from "./responses.js";

function safeDownloadFilename(title: string): string {
  const base = title.replace(/[^\w\s-]/g, "").trim() || "story-video";
  return `${base.replace(/\s+/g, "-")}.mp4`;
}

export async function streamProjectVideo(
  c: Context<{ Variables: AppVariables }>,
  disposition: "inline" | "attachment",
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

  const storage = c.get("storage");
  const relativePath = projectFinalVideoRelativePath(id);
  const exists = await storage.exists(relativePath);
  if (!exists) {
    return jsonError(
      c,
      {
        code: "VIDEO_NOT_READY",
        message:
          project.status === ProjectStatus.COMPLETED
            ? "Final video file is missing"
            : "Video is not ready yet. Run generation and wait for assembly.",
        retryable: project.status !== ProjectStatus.FAILED,
      },
      404,
    );
  }

  const data = await storage.get(relativePath);
  const filename = safeDownloadFilename(project.title);

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(data.length),
      "Content-Disposition":
        disposition === "attachment"
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
