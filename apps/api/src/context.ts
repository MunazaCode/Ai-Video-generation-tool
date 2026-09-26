import type { StoryAnalyzer } from "@asv/ai";
import type { DatabaseContext } from "@asv/db";
import type { ProviderBundle } from "@asv/providers";
import type { LocalStorageProvider } from "@asv/storage";
import type { ApiEnv } from "./env.js";

export interface AppVariables {
  env: ApiEnv;
  db: DatabaseContext;
  storage: LocalStorageProvider;
  storyAnalyzer: StoryAnalyzer;
  providers: ProviderBundle;
}
