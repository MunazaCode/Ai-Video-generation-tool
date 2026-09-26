import type { StorageProvider } from "@asv/storage";
import {
  buildKenBurnsClipArgs,
  kenBurnsMotionForSequence,
  resolveFfmpegBinary,
  runFfmpeg,
} from "@asv/video-engine";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { VideoGenerationRequest, VideoProvider } from "./types.js";

export interface ImageMotionVideoConfig {
  ffmpegPath?: string;
}

/**
 * Turns a real scene still into a moving MP4 via FFmpeg Ken Burns (zoom/pan + fades).
 * Used when full AI video APIs are unavailable.
 */
export class ImageMotionVideoProvider implements VideoProvider {
  readonly id = "image-motion";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: ImageMotionVideoConfig = {},
  ) {}

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedAssetMeta> {
    const imageRelative = request.sourceImageRelativePath?.trim();
    if (!imageRelative) {
      throw new Error(
        "image-motion video requires sourceImageRelativePath (generate the scene image first)",
      );
    }
    if (!(await this.storage.exists(imageRelative))) {
      throw new Error(
        `Scene image missing for image-motion: ${imageRelative}. Re-run image generation.`,
      );
    }
    if (typeof this.storage.getAbsolutePath !== "function") {
      throw new Error("Storage provider must implement getAbsolutePath for image-motion");
    }

    const imageAbs = this.storage.getAbsolutePath(imageRelative);
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${imageRelative}:${String(request.durationSec)}:${String(request.sequence ?? 1)}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/videos/motion-${hash}.mp4`;
    const outputAbs = this.storage.getAbsolutePath(relativePath);
    await mkdir(path.dirname(outputAbs), { recursive: true });

    const ffmpegPath = resolveFfmpegBinary(this.config.ffmpegPath);
    const motion = kenBurnsMotionForSequence(request.sequence ?? 1);

    await runFfmpeg(
      buildKenBurnsClipArgs(imageAbs, outputAbs, {
        durationSec: Math.max(1, request.durationSec),
        width: request.width,
        height: request.height,
        fps: request.fps,
        motion,
      }),
      { ffmpegPath },
    );

    return {
      providerId: this.id,
      mock: false,
      relativePath,
      contentType: "video/mp4",
      label: "Ken Burns motion clip from scene image",
    };
  }
}

export function createImageMotionVideoProvider(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): ImageMotionVideoProvider {
  const ffmpegPath = env.FFMPEG_PATH?.trim();
  return new ImageMotionVideoProvider(
    storage,
    ffmpegPath ? { ffmpegPath } : {},
  );
}
