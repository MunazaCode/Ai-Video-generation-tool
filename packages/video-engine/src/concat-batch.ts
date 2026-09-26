/** Default max clips per FFmpeg concat pass (long-form 5–20+ min). */
export const DEFAULT_CONCAT_BATCH_SIZE = 30;

export function chunkPaths(paths: readonly string[], batchSize: number): string[][] {
  if (batchSize <= 0) {
    throw new Error("batchSize must be positive");
  }
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += batchSize) {
    chunks.push(paths.slice(i, i + batchSize));
  }
  return chunks;
}
