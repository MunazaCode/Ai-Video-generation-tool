import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AspectRatio as AspectRatioType } from "@asv/shared";
import {
  buildColorClipArgs,
  buildConcatArgs,
  buildCopyVideoArgs,
  buildKenBurnsClipArgs,
  buildMixMusicArgs,
  buildMuxSceneAudioArgs,
  buildNormalizeVideoArgs,
  kenBurnsMotionForSequence,
  formatConcatListEntry,
  type SceneVisualInput,
} from "./ffmpeg-args.js";
import { resolveFfmpegBinary } from "./ffmpeg-path.js";
import { runFfmpeg } from "./ffmpeg-run.js";
import { isMockImagePath } from "./mock-image.js";
import { isMockVideoPayload } from "./mock-video.js";
import { chunkPaths, DEFAULT_CONCAT_BATCH_SIZE } from "./concat-batch.js";
import { dimensionsForAspectRatio } from "./resolution.js";

export interface SceneAssemblyInput {
  sequence: number;
  durationSec: number;
  videoPath: string | null;
  imagePath: string | null;
  audioPath: string | null;
}

export interface AssembleProjectVideoRequest {
  projectId: string;
  aspectRatio: AspectRatioType;
  outputPath: string;
  workDir: string;
  fps?: number;
  scenes: SceneAssemblyInput[];
  musicPath?: string | null;
  musicVolume?: number;
  ffmpegPath?: string;
  /** Max scene clips per concat demuxer pass (long-form projects). */
  maxScenesPerConcat?: number;
  /**
   * When false (default), missing/mock visuals throw instead of solid-color placeholders.
   * Only enable for legacy mock CI paths.
   */
  allowPlaceholderVisuals?: boolean;
}

export interface AssembleProjectVideoResult {
  outputPath: string;
  durationSec: number;
  sceneCount: number;
}

function assertAbsolutePath(label: string, filePath: string): void {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${label} must be an absolute path`);
  }
}

async function buildSceneVisualClip(
  scene: SceneAssemblyInput,
  visual: SceneVisualInput,
  outputPath: string,
  options: {
    width: number;
    height: number;
    fps: number;
    ffmpegPath: string;
    allowPlaceholderVisuals: boolean;
  },
): Promise<void> {
  const allowPlaceholders = options.allowPlaceholderVisuals;

  if (visual.videoPath) {
    const data = await readFile(visual.videoPath);
    const isMockVideo = isMockVideoPayload(data);
    if (!isMockVideo) {
      await runFfmpeg(
        buildNormalizeVideoArgs(visual.videoPath, outputPath, {
          durationSec: scene.durationSec,
          width: options.width,
          height: options.height,
          fps: options.fps,
        }),
        { ffmpegPath: options.ffmpegPath },
      );
      return;
    }
    if (!allowPlaceholders) {
      throw new Error(
        `Scene ${String(scene.sequence)} has a mock/invalid video clip. ` +
          `Regenerate with VIDEO_PROVIDER=pollinations, wan, or local-http (real text-to-video).`,
      );
    }
  }

  if (!allowPlaceholders) {
    throw new Error(
      `Scene ${String(scene.sequence)} has no real AI video clip. ` +
        `Ken Burns / still-image motion is disabled in real mode. ` +
        `Set VIDEO_PROVIDER=pollinations (or wan/local-http) and re-run scene video generation.`,
    );
  }

  const imageIsMock = isMockImagePath(visual.imagePath);
  if (visual.imagePath && (!imageIsMock || allowPlaceholders)) {
    await runFfmpeg(
      buildKenBurnsClipArgs(visual.imagePath, outputPath, {
        durationSec: scene.durationSec,
        width: options.width,
        height: options.height,
        fps: options.fps,
        motion: kenBurnsMotionForSequence(scene.sequence),
      }),
      { ffmpegPath: options.ffmpegPath },
    );
    return;
  }

  await runFfmpeg(
    buildColorClipArgs(outputPath, {
      durationSec: scene.durationSec,
      width: options.width,
      height: options.height,
      fps: options.fps,
    }),
    { ffmpegPath: options.ffmpegPath },
  );
}

async function concatVideoPaths(
  inputs: string[],
  outputPath: string,
  workDir: string,
  ffmpegPath: string,
  batchSize: number,
  depth = 0,
): Promise<void> {
  if (inputs.length === 0) {
    throw new Error("Cannot concat zero inputs");
  }
  if (inputs.length === 1) {
    const only = inputs[0];
    if (!only) {
      throw new Error("Cannot concat empty input list");
    }
    await runFfmpeg(buildCopyVideoArgs(only, outputPath), { ffmpegPath });
    return;
  }

  const chunks = chunkPaths(inputs, batchSize);
  if (chunks.length === 1) {
    const listPath = path.join(workDir, `concat-${String(depth)}.txt`);
    const firstChunk = chunks[0] ?? [];
    const body = firstChunk.map((p) => formatConcatListEntry(p)).join("\n");
    await writeFile(listPath, `${body}\n`, "utf8");
    await runFfmpeg(buildConcatArgs(listPath, outputPath), { ffmpegPath });
    return;
  }

  const intermediatePaths: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunkOut = path.join(
      workDir,
      `concat-tier-${String(depth)}-${String(i).padStart(3, "0")}.mp4`,
    );
    const chunk = chunks[i];
    if (!chunk) {
      continue;
    }
    await concatVideoPaths(chunk, chunkOut, workDir, ffmpegPath, batchSize, depth + 1);
    intermediatePaths.push(chunkOut);
  }
  await concatVideoPaths(
    intermediatePaths,
    outputPath,
    workDir,
    ffmpegPath,
    batchSize,
    depth + 1,
  );
}

export async function assembleProjectVideo(
  request: AssembleProjectVideoRequest,
): Promise<AssembleProjectVideoResult> {
  assertAbsolutePath("outputPath", request.outputPath);
  assertAbsolutePath("workDir", request.workDir);

  const sorted = [...request.scenes].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) {
    throw new Error("Cannot assemble video with zero scenes");
  }

  const { width, height } = dimensionsForAspectRatio(request.aspectRatio);
  const fps = request.fps ?? 24;
  const ffmpegPath = resolveFfmpegBinary(request.ffmpegPath);

  await rm(request.workDir, { recursive: true, force: true });
  await mkdir(request.workDir, { recursive: true });
  await mkdir(path.dirname(request.outputPath), { recursive: true });

  const sceneOutputs: string[] = [];

  for (const scene of sorted) {
    const base = path.join(
      request.workDir,
      `scene-${String(scene.sequence).padStart(4, "0")}`,
    );
    const visualPath = `${base}-visual.mp4`;
    const muxedPath = `${base}-muxed.mp4`;

    await buildSceneVisualClip(
      scene,
      {
        durationSec: scene.durationSec,
        videoPath: scene.videoPath,
        imagePath: scene.imagePath,
      },
      visualPath,
      {
        width,
        height,
        fps,
        ffmpegPath,
        allowPlaceholderVisuals: request.allowPlaceholderVisuals === true,
      },
    );

    if (scene.audioPath) {
      await runFfmpeg(
        buildMuxSceneAudioArgs(
          visualPath,
          scene.audioPath,
          muxedPath,
          scene.durationSec,
        ),
        { ffmpegPath },
      );
      sceneOutputs.push(muxedPath);
    } else {
      await runFfmpeg(buildCopyVideoArgs(visualPath, muxedPath), { ffmpegPath });
      sceneOutputs.push(muxedPath);
    }
  }

  const concatenatedPath = path.join(request.workDir, "concatenated.mp4");
  const batchSize = request.maxScenesPerConcat ?? DEFAULT_CONCAT_BATCH_SIZE;
  await concatVideoPaths(
    sceneOutputs,
    concatenatedPath,
    request.workDir,
    ffmpegPath,
    batchSize,
  );

  if (request.musicPath) {
    await runFfmpeg(
      buildMixMusicArgs(
        concatenatedPath,
        request.musicPath,
        request.outputPath,
        request.musicVolume ?? 0.2,
      ),
      { ffmpegPath },
    );
  } else {
    await runFfmpeg(buildCopyVideoArgs(concatenatedPath, request.outputPath), {
      ffmpegPath,
    });
  }

  const durationSec = sorted.reduce((total, scene) => total + scene.durationSec, 0);

  return {
    outputPath: request.outputPath,
    durationSec,
    sceneCount: sorted.length,
  };
}

export function projectFinalVideoRelativePath(projectId: string): string {
  return `projects/${projectId}/final/output.mp4`;
}
