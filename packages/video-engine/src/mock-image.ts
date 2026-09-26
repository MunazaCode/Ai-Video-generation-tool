import path from "node:path";

/**
 * Mock image provider writes files named `mock-*.png`.
 * Used to refuse solid-color placeholders when real cinematic mode is required.
 */
export function isMockImagePath(filePath: string | null | undefined): boolean {
  if (!filePath) {
    return false;
  }
  const base = path.basename(filePath).toLowerCase();
  return base.startsWith("mock-") && /\.(png|jpe?g|webp)$/i.test(base);
}
