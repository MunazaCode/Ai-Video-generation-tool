export interface SceneVisualInput {
  durationSec: number;
  /** Real encoded video file, or mock placeholder handled upstream. */
  videoPath: string | null;
  imagePath: string | null;
}

export type KenBurnsMotion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export function buildScalePadFilter(width: number, height: number): string {
  return `scale=${String(width)}:${String(height)}:force_original_aspect_ratio=decrease,pad=${String(width)}:${String(height)}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;
}

export function kenBurnsMotionForSequence(sequence: number): KenBurnsMotion {
  const motions: KenBurnsMotion[] = [
    "zoom-in",
    "pan-right",
    "zoom-out",
    "pan-left",
  ];
  const index = Math.abs(sequence - 1) % motions.length;
  return motions[index] ?? "zoom-in";
}

function kenBurnsZoompanExpr(
  motion: KenBurnsMotion,
  frames: number,
): { z: string; x: string; y: string; d: number } {
  const d = Math.max(1, frames);
  switch (motion) {
    case "zoom-out":
      return {
        z: "if(eq(on,1),1.45,max(1.0,zoom-0.0012))",
        x: "iw/2-(iw/zoom/2)",
        y: "ih/2-(ih/zoom/2)",
        d,
      };
    case "pan-left":
      return {
        z: "1.28",
        x: "if(eq(on,1),iw/zoom*0.35,max(0,x-1.15))",
        y: "ih/2-(ih/zoom/2)",
        d,
      };
    case "pan-right":
      return {
        z: "1.28",
        x: "if(eq(on,1),0,min(iw/zoom*0.35,x+1.15))",
        y: "ih/2-(ih/zoom/2)",
        d,
      };
    case "zoom-in":
    default:
      return {
        z: "min(1.45,zoom+0.0012)",
        x: "iw/2-(iw/zoom/2)",
        y: "ih/2-(ih/zoom/2)",
        d,
      };
  }
}

/** Ken Burns motion clip from a still image (cinematic pan/zoom + edge fades). */
export function buildKenBurnsClipArgs(
  imagePath: string,
  outputPath: string,
  options: {
    durationSec: number;
    width: number;
    height: number;
    fps: number;
    motion?: KenBurnsMotion;
  },
): string[] {
  const fps = Math.max(1, options.fps);
  const durationSec = Math.max(0.5, options.durationSec);
  const frames = Math.max(1, Math.round(durationSec * fps));
  const motion = options.motion ?? "zoom-in";
  const zp = kenBurnsZoompanExpr(motion, frames);
  const fadeOutStart = Math.max(0, durationSec - 0.45);
  const scaleW = Math.max(options.width * 2, 1920);
  const filter = [
    `scale=${String(scaleW)}:-1`,
    `zoompan=z='${zp.z}':x='${zp.x}':y='${zp.y}':d=${String(zp.d)}:s=${String(options.width)}x${String(options.height)}:fps=${String(fps)}`,
    "fade=t=in:st=0:d=0.35",
    `fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.45`,
    "format=yuv420p",
  ].join(",");

  return [
    "-loop",
    "1",
    "-i",
    imagePath,
    "-t",
    String(durationSec),
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath,
  ];
}

/** Image → moving clip (Ken Burns). */
export function buildImageClipArgs(
  imagePath: string,
  outputPath: string,
  options: {
    durationSec: number;
    width: number;
    height: number;
    fps: number;
    motion?: KenBurnsMotion;
  },
): string[] {
  return buildKenBurnsClipArgs(imagePath, outputPath, options);
}

/** Lavfi color clip — only when allowPlaceholderVisuals is explicitly enabled. */
export function buildColorClipArgs(
  outputPath: string,
  options: { durationSec: number; width: number; height: number; fps: number },
): string[] {
  return [
    "-f",
    "lavfi",
    "-i",
    `color=c=0x1a1a2e:s=${String(options.width)}x${String(options.height)}:r=${String(options.fps)}`,
    "-t",
    String(options.durationSec),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath,
  ];
}

/** Normalize a real video clip to target size/fps and strip audio. */
export function buildNormalizeVideoArgs(
  videoPath: string,
  outputPath: string,
  options: { durationSec: number; width: number; height: number; fps: number },
): string[] {
  const filter = buildScalePadFilter(options.width, options.height);
  const fadeOutStart = Math.max(0, options.durationSec - 0.4);
  return [
    "-i",
    videoPath,
    "-t",
    String(options.durationSec),
    "-vf",
    `${filter},fps=${String(options.fps)},fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.4`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath,
  ];
}

export function buildMuxSceneAudioArgs(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  durationSec?: number,
): string[] {
  const args = [
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
  ];
  if (durationSec !== undefined && durationSec > 0) {
    // Keep full scene length: pad short narration with silence (do not use -shortest).
    args.push(
      "-af",
      `apad=whole_dur=${durationSec.toFixed(3)}`,
      "-t",
      durationSec.toFixed(3),
    );
  } else {
    args.push("-shortest");
  }
  args.push(outputPath);
  return args;
}

export function buildCopyVideoArgs(videoPath: string, outputPath: string): string[] {
  return ["-i", videoPath, "-c", "copy", outputPath];
}

export function buildConcatArgs(listFilePath: string, outputPath: string): string[] {
  return [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFilePath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function buildMixMusicArgs(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  musicWeight = 0.2,
): string[] {
  const weight = Math.min(1, Math.max(0, musicWeight));
  return [
    "-i",
    videoPath,
    "-i",
    musicPath,
    "-filter_complex",
    `[0:a]volume=1[a0];[1:a]volume=${String(weight)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    outputPath,
  ];
}

export function escapeConcatListPath(filePath: string): string {
  return filePath.replace(/'/g, `'\\''`);
}

export function formatConcatListEntry(filePath: string): string {
  return `file '${escapeConcatListPath(filePath)}'`;
}
