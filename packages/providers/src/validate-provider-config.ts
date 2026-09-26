import { videoProviderRequiresSourceImage } from "@asv/shared";
import type { ProviderFactoryOptions } from "./factory-options.js";
import type { ProviderConfigIssue } from "./provider-errors.js";
import {
  findProviderDefinition,
  listProviderIds,
  type ProviderKind,
} from "./provider-registry.js";

export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface ProviderValidationResult {
  valid: boolean;
  issues: ProviderConfigIssue[];
}

function envPresent(env: EnvSource, key: string): boolean {
  const value = env[key];
  return value !== undefined && value.trim().length > 0;
}

function validateKind(
  kind: ProviderKind,
  providerId: string,
  env: EnvSource,
): ProviderConfigIssue[] {
  const definition = findProviderDefinition(kind, providerId);
  if (!definition) {
    return [
      {
        kind,
        providerId,
        code: "UNKNOWN_PROVIDER",
        message: `Unknown ${kind} provider "${providerId}". Allowed: ${listProviderIds(kind).join(", ")}`,
      },
    ];
  }

  const missingEnv = definition.requiredEnv.filter((key) => !envPresent(env, key));
  if (missingEnv.length > 0) {
    return [
      {
        kind,
        providerId,
        code: "MISSING_ENV",
        message: `${kind} provider "${providerId}" is missing required env: ${missingEnv.join(", ")}`,
        missingEnv,
      },
    ];
  }

  return [];
}

export function validateProviderFactoryOptions(
  options: ProviderFactoryOptions,
  env: EnvSource,
): ProviderValidationResult {
  if (options.mockAi) {
    return { valid: true, issues: [] };
  }

  const issues: ProviderConfigIssue[] = [
    ...validateKind("llm", options.llmProvider, env),
    ...validateKind("image", options.imageProvider, env),
    ...validateKind("video", options.videoProvider, env),
    ...validateKind("tts", options.ttsProvider, env),
    ...validateKind("music", options.musicProvider, env),
  ];

  // Images are only required when the video backend is Ken Burns / image-derived.
  if (
    options.imageProvider === "mock" &&
    videoProviderRequiresSourceImage(options.videoProvider)
  ) {
    issues.push({
      kind: "image",
      providerId: "mock",
      code: "MOCK_NOT_ALLOWED",
      message:
        "IMAGE_PROVIDER=mock is not allowed with VIDEO_PROVIDER=image-motion. Use a real image provider, or switch VIDEO_PROVIDER to pollinations/wan/local-http for text-to-video.",
    });
  }

  if (options.videoProvider === "mock") {
    issues.push({
      kind: "video",
      providerId: "mock",
      code: "MOCK_NOT_ALLOWED",
      message:
        "VIDEO_PROVIDER=mock is not allowed when MOCK_AI=false. Set VIDEO_PROVIDER=pollinations (needs POLLINATIONS_API_KEY), wan (VIDEO_API_BASE_URL), or local-http (VIDEO_API_URL).",
    });
  }

  if (options.videoProvider === "image-motion") {
    issues.push({
      kind: "video",
      providerId: "image-motion",
      code: "MOCK_NOT_ALLOWED",
      message:
        "VIDEO_PROVIDER=image-motion (Ken Burns stills) is not allowed for real cinematic mode. Set VIDEO_PROVIDER=pollinations, wan, or local-http for real AI video clips.",
    });
  }

  const blocking = issues.filter(
    (issue) =>
      issue.code === "UNKNOWN_PROVIDER" ||
      issue.code === "MISSING_ENV" ||
      issue.code === "MOCK_NOT_ALLOWED",
  );

  return {
    valid: blocking.length === 0,
    issues,
  };
}
