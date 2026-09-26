import { aiPackageReady, type StoryAnalyzer } from "@asv/ai";
import type { DatabaseContext } from "@asv/db";
import { dbPackageReady } from "@asv/db";
import {
  providersPackageReady,
  validateProviderFactoryOptions,
  type ProviderBundle,
} from "@asv/providers";
import { APP_NAME } from "@asv/shared";
import { storagePackageReady } from "@asv/storage";
import { videoEnginePackageReady } from "@asv/video-engine";
import type { LocalStorageProvider } from "@asv/storage";
import { cors } from "hono/cors";
import { Hono } from "hono";
import type { AppVariables } from "./context.js";
import type { ApiEnv } from "./env.js";
import { jsonError } from "./http/responses.js";
import { projectsRoutes } from "./routes/projects.js";

export function createApp(options: {
  env: ApiEnv;
  db: DatabaseContext;
  storage: LocalStorageProvider;
  storyAnalyzer: StoryAnalyzer;
  providers: ProviderBundle;
}): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    "*",
    cors({
      origin: options.env.APP_URL,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Content-Type"],
    }),
  );

  app.use("*", async (c, next) => {
    c.set("env", options.env);
    c.set("db", options.db);
    c.set("storage", options.storage);
    c.set("storyAnalyzer", options.storyAnalyzer);
    c.set("providers", options.providers);
    await next();
  });

  app.get("/health", (c) => {
    const validation = validateProviderFactoryOptions(
      {
        mockAi: options.env.MOCK_AI,
        llmProvider: options.env.LLM_PROVIDER,
        imageProvider: options.env.IMAGE_PROVIDER,
        videoProvider: options.env.VIDEO_PROVIDER,
        ttsProvider: options.env.TTS_PROVIDER,
        musicProvider: options.env.MUSIC_PROVIDER,
        storage: options.storage,
      },
      process.env,
    );

    return c.json({
      success: true,
      data: {
        name: APP_NAME,
        mockAi: options.env.MOCK_AI,
        providers: options.providers.capabilities,
        providerConfig: {
          valid: validation.valid,
          issues: validation.issues,
        },
        modules: {
          db: dbPackageReady(),
          ai: aiPackageReady(),
          providers: providersPackageReady(),
          storage: storagePackageReady(),
          videoEngine: videoEnginePackageReady(),
        },
      },
    });
  });

  app.get("/api/health", (c) => c.redirect("/health", 307));

  app.route("/api/projects", projectsRoutes);

  app.notFound((c) => {
    return jsonError(
      c,
      {
        code: "NOT_FOUND",
        message: "Route not found",
        retryable: false,
      },
      404,
    );
  });

  app.onError((err, c) => {
    console.error("[api] unhandled error", err);
    return jsonError(
      c,
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        retryable: true,
      },
      500,
    );
  });

  return app;
}
