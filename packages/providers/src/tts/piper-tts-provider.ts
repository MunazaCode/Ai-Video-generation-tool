import type { StorageProvider } from "@asv/storage";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { TTSProvider, TtsGenerationRequest } from "./types.js";

export interface PiperTtsConfig {
  executable: string;
  modelPath: string;
  timeoutMs?: number;
}

async function runPiper(
  config: PiperTtsConfig,
  text: string,
  outputPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = ["--model", config.modelPath, "--output_file", outputPath];
    const child = spawn(config.executable, args, {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Piper TTS timed out"));
    }, config.timeoutMs ?? 120_000);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Piper exited with code ${String(code)}: ${stderr.slice(0, 500)}`,
          ),
        );
      }
    });
    child.stdin.write(text, "utf8");
    child.stdin.end();
  });
}

export class PiperTtsProvider implements TTSProvider {
  readonly id = "piper";

  constructor(
    private readonly storage: StorageProvider,
    private readonly config: PiperTtsConfig,
  ) {}

  async generateSpeech(request: TtsGenerationRequest): Promise<GeneratedAssetMeta> {
    const workDir = await mkdtemp(path.join(tmpdir(), "asv-piper-"));
    const outFile = path.join(workDir, "narration.wav");
    try {
      await runPiper(this.config, request.text, outFile);
      const data = await readFile(outFile);
      const hash = deterministicHash(
        `${request.projectId}:${request.sceneId}:${request.text}:${request.language}`,
      );
      const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/audio/narration-piper-${hash}.wav`;
      await this.storage.save(relativePath, data);

      return {
        providerId: this.id,
        mock: false,
        relativePath,
        contentType: "audio/wav",
        label: "Piper narration generated",
      };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}

export function createPiperTtsFromEnv(
  storage: StorageProvider,
  env: Record<string, string | undefined>,
): PiperTtsProvider {
  const executable = env.PIPER_EXECUTABLE?.trim();
  if (!executable) {
    throw new Error("PIPER_EXECUTABLE is required for piper TTS provider");
  }
  const modelPath = env.PIPER_VOICE?.trim() ?? env.PIPER_MODEL?.trim();
  if (!modelPath) {
    throw new Error("PIPER_VOICE (path to .onnx model) is required for piper TTS");
  }
  return new PiperTtsProvider(storage, { executable, modelPath });
}
