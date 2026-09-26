import type { StorageProvider } from "@asv/storage";
import { createSolidPng, slateRgbFromSeed } from "../utils/solid-png.js";
import { deterministicHash } from "../utils/deterministic-hash.js";
import type { GeneratedAssetMeta, ImageGenerationRequest, ImageProvider } from "./types.js";

export class MockImageProvider implements ImageProvider {
  readonly id = "mock-image";

  constructor(private readonly storage: StorageProvider) {}

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedAssetMeta> {
    const hash = deterministicHash(
      `${request.projectId}:${request.sceneId}:${request.prompt}:${String(request.width)}x${String(request.height)}`,
    );
    const relativePath = `projects/${request.projectId}/scenes/${request.sceneId}/images/mock-${hash}.png`;
    const rgb = slateRgbFromSeed(hash);
    const width = Math.min(1280, Math.max(320, request.width));
    const height = Math.min(720, Math.max(180, request.height));
    await this.storage.save(relativePath, createSolidPng(width, height, rgb));

    return {
      providerId: this.id,
      mock: true,
      relativePath,
      contentType: "image/png",
      label: "Mock image generated",
    };
  }
}