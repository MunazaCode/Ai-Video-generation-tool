import { bootstrapMonorepoEnv } from "./bootstrap-env.js";

bootstrapMonorepoEnv(import.meta.url);

import { createDatabase, migrateDatabase } from "@asv/db";

import {

  createProviderBundle,

  formatProviderConfigIssues,

  ProviderConfigurationError,

} from "@asv/providers";

import { APP_NAME } from "@asv/shared";

import { LocalStorageProvider } from "@asv/storage";

import { loadWorkerEnv } from "./env.js";

import { JobProcessor } from "./job-processor.js";

import { runWorkerLoop } from "./worker-loop.js";



const env = loadWorkerEnv();



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

      `[worker] Provider configuration error: ${formatProviderConfigIssues(error.issues)}`,

    );

    process.exit(1);

  }

  throw error;

}



const processor = new JobProcessor(

  db.repositories,

  providers,

  {
    storage,
    allowMockVisuals: env.MOCK_AI,
    ...(env.FFMPEG_PATH ? { ffmpegPath: env.FFMPEG_PATH } : {}),
  },

);



console.info(

  `[worker] ${APP_NAME} worker started (mockAi=${String(env.MOCK_AI)}, pollMs=${String(env.WORKER_POLL_INTERVAL_MS)})`,

);



const abort = new AbortController();

process.on("SIGINT", () => {

  abort.abort();

});

process.on("SIGTERM", () => {

  abort.abort();

});



void runWorkerLoop({

  repositories: db.repositories,

  processor,

  pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,

  staleJobMs: env.WORKER_STALE_JOB_MS,

  signal: abort.signal,

});

