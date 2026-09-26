import { spawn } from "node:child_process";

export class FfmpegExecutionError extends Error {
  constructor(
    message: string,
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "FfmpegExecutionError";
  }
}

export interface RunFfmpegOptions {
  ffmpegPath?: string;
  cwd?: string;
}

export async function runFfmpeg(
  args: readonly string[],
  options: RunFfmpegOptions = {},
): Promise<void> {
  if (args.length === 0) {
    throw new Error("FFmpeg args must not be empty");
  }
  if (args.includes("|")) {
    throw new Error("Invalid FFmpeg invocation shape");
  }

  const binary = options.ffmpegPath?.trim() ?? "ffmpeg";
  const fullArgs = ["-hide_banner", "-nostdin", "-y", ...args];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, fullArgs, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 32_000) {
        stderr = stderr.slice(-32_000);
      }
    });

    child.on("error", (error: Error) => {
      reject(error);
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new FfmpegExecutionError(
          `FFmpeg exited with code ${String(code)}`,
          code,
          stderr,
        ),
      );
    });
  });
}
