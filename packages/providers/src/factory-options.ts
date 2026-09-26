import type { StorageProvider } from "@asv/storage";

export interface ProviderFactoryOptions {
  mockAi: boolean;
  llmProvider: string;
  imageProvider: string;
  videoProvider: string;
  ttsProvider: string;
  musicProvider: string;
  storage: StorageProvider;
}
