import { AspectRatio, type AspectRatio as AspectRatioType } from "@asv/shared";

export interface OutputDimensions {
  width: number;
  height: number;
}

export function dimensionsForAspectRatio(
  aspectRatio: AspectRatioType,
): OutputDimensions {
  switch (aspectRatio) {
    case AspectRatio.R9_16:
      return { width: 720, height: 1280 };
    case AspectRatio.R1_1:
      return { width: 720, height: 720 };
    case AspectRatio.R16_9:
    default:
      return { width: 1280, height: 720 };
  }
}
