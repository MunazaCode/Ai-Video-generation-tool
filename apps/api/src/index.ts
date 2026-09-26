import { serve } from "@hono/node-server";
import { bootstrapMonorepoEnv } from "./bootstrap-env.js";

bootstrapMonorepoEnv(import.meta.url);
import { createStoryAnalyzer } from "@asv/ai";
import { createDatabase, migrateDatabase } from "@asv/db";
import {
  createProviderBundle,
  formatProviderConfigIssues,
  ProviderConfigurationError,
} from "@asv/providers";
import { APP_NAME } from "@asv/shared";
import { LocalStorageProvider } from "@asv/storage";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";

const env = loadEnv();

migrateDatabase(env.DATABASE_URL);
const db = createDatabase(env.DATABASE_URL);
const storage = new LocalStorageProvider(env.STORAGE_PATH);
let providers;
try {
  providers = createProviderBundle(
    {
      mockAi: env.MOCK_AI,
      llmProvider: env.LLM_PROVIDER,
      imageProvider: env.IMAGE_PROVIDER,
      videoProvider: env.VIDEO_PROVIDER,
      ttsProvider: env.TTS_PROVIDER,
      musicProvider: env.MUSIC_PROVIDER,
      storage,
    },
    process.env,
  );
} catch (error) {
  if (error instanceof ProviderConfigurationError) {
    console.error(
      `[api] Provider configuration error: ${formatProviderConfigIssues(error.issues)}`,
    );
    process.exit(1);
  }
  throw error;
}
const storyAnalyzer = createStoryAnalyzer(providers.llm);
const app = createApp({ env, db, storage, storyAnalyzer, providers });

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.info(
      `[api] ${APP_NAME} listening on http://127.0.0.1:${String(info.port)} (mockAi=${String(env.MOCK_AI)})`,
    );
  },
);

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[api] Port ${String(env.PORT)} is already in use. Stop the other API process (Ctrl+C in its terminal) or run:\n` +
        `  Get-NetTCPConnection -LocalPort ${String(env.PORT)} | Select OwningProcess\n` +
        `  Stop-Process -Id <PID> -Force`,
    );
    process.exit(1);
  }
  throw error;
});
