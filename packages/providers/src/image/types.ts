export interface ImageGenerationRequest {
  projectId: string;
  sceneId: string;
  prompt: string;
  width: number;
  height: number;
}

export interface GeneratedAssetMeta {
  providerId: string;
  mock: boolean;
  relativePath: string;
  contentType: string;
  label: string;
}

export interface ImageProvider {
  readonly id: string;
  generateImage(request: ImageGenerationRequest): Promise<GeneratedAssetMeta>;
}
