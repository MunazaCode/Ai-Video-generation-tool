import { spawn } from "node:child_process";

export function resolveFfmpegBinary(explicitPath?: string): string {
  const trimmed = explicitPath?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "ffmpeg";
}

export async function checkFfmpegAvailable(
  explicitPath?: string,
): Promise<boolean> {
  const binary = resolveFfmpegBinary(explicitPath);
  return new Promise((resolve) => {
    const child = spawn(binary, ["-version"], {
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("error", () => {
      resolve(false);
    });
    child.on("close", (code: number | null) => {
      resolve(code === 0);
    });
  });
}
