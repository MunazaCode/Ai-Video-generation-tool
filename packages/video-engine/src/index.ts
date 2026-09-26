export {
  assembleProjectVideo,
  projectFinalVideoRelativePath,
  type AssembleProjectVideoRequest,
  type AssembleProjectVideoResult,
  type SceneAssemblyInput,
} from "./assemble.js";
export {
  buildColorClipArgs,
  buildConcatArgs,
  buildCopyVideoArgs,
  buildImageClipArgs,
  buildKenBurnsClipArgs,
  buildMixMusicArgs,
  buildMuxSceneAudioArgs,
  buildNormalizeVideoArgs,
  buildScalePadFilter,
  kenBurnsMotionForSequence,
  escapeConcatListPath,
  formatConcatListEntry,
  type KenBurnsMotion,
} from "./ffmpeg-args.js";
export {
  checkFfmpegAvailable,
  resolveFfmpegBinary,
} from "./ffmpeg-path.js";
export { FfmpegExecutionError, runFfmpeg } from "./ffmpeg-run.js";
export { isMockImagePath } from "./mock-image.js";
export { isMockVideoPayload, MOCK_VIDEO_HEADER } from "./mock-video.js";
export { dimensionsForAspectRatio, type OutputDimensions } from "./resolution.js";

export function videoEnginePackageReady(): string {
  return "FFmpeg normalize, concat, and audio mix";
}
