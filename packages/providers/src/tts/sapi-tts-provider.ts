import type { StorageProvider } from "@asv/storage";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta } from "../image/types.js";
import type { TTSProvider, TtsGenerationRequest } from "./types.js";

/**
 * Windows SAPI narration via System.Speech (no API key).
 * Explicit TTS_PROVIDER=sapi — useful for local cinematic demos.
 */
export class SapiTtsProvider implements TTSProvider {
  readonly id = "sapi";

  constructor(private readonly storage: StorageProvider) {}

  async generateSpeech(request: TtsGenerationRequest): Promise<GeneratedAssetMeta> {
    if (process.platform !== "win32") {
      throw new Error(
        "TTS_PROVIDER=sapi requires Windows (System.Speech). " +
          "Use TTS_PROVIDER=openai (OPENAI_API_KEY) or TTS_PROVIDER=piper on this OS.",
      );
    }

    if (typeof this.storage.getAbsolutePath !== "function") {
      throw new Error("Storage provider must implement getAbsolutePath for SAPI TTS");
    }

    const text = request.text.trim();
    if (!text) {
      throw new Error("TTS narration text is empty");
    }

    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${text}:${request.voiceGender ?? "neutral"}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/audio/sapi-${hash}.wav`;

    const workDir = path.join(tmpdir(), `asv-sapi-${hash}`);
    await mkdir(workDir, { recursive: true });
    const textFile = path.join(workDir, "narration.txt");
    const wavFile = path.join(workDir, "out.wav");
    await writeFile(textFile, text, "utf8");

    const voiceHint = mapVoice(request.voiceGender);
    const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -1
$synth.Volume = 100
${voiceHint}
$synth.SetOutputToWaveFile(${psQuote(wavFile)})
$synth.Speak([IO.File]::ReadAllText(${psQuote(textFile)}))
$synth.Dispose()
`;

    try {
      await runPowerShell(ps);
      const wav = await readFile(wavFile);
      if (wav.length < 1000) {
        throw new Error("SAPI produced an empty WAV");
      }
      await this.storage.save(relativePath, wav);

      return {
        providerId: this.id,
        mock: false,
        relativePath,
        contentType: "audio/wav",
        label: "Windows SAPI narration",
      };
    } finally {
      await unlink(textFile).catch(() => undefined);
      await unlink(wavFile).catch(() => undefined);
    }
  }
}

function mapVoice(gender?: string): string {
  const g = (gender ?? "").toLowerCase();
  if (g === "female") {
    return `
$preferred = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Female' } | Select-Object -First 1
if ($preferred) { $synth.SelectVoice($preferred.VoiceInfo.Name) }
`;
  }
  if (g === "male") {
    return `
$preferred = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Male' } | Select-Object -First 1
if ($preferred) { $synth.SelectVoice($preferred.VoiceInfo.Name) }
`;
  }
  return "";
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runPowerShell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `SAPI PowerShell failed (code ${String(code)}): ${stderr.slice(0, 400)}`,
        ),
      );
    });
  });
}

export function createSapiTtsProvider(storage: StorageProvider): SapiTtsProvider {
  return new SapiTtsProvider(storage);
}
