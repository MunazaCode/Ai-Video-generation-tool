import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.url().default("http://localhost:3000"),
  MOCK_AI: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  STORAGE_PATH: z.string().min(1).default("./storage"),
  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),
  LLM_PROVIDER: z.string().min(1).default("mock"),
  IMAGE_PROVIDER: z.string().min(1).default("mock"),
  VIDEO_PROVIDER: z.string().min(1).default("mock"),
  TTS_PROVIDER: z.string().min(1).default("mock"),
  MUSIC_PROVIDER: z.string().min(1).default("mock"),
  TARGET_SCENE_DURATION_SEC: z.coerce.number().int().positive().default(8),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(): ApiEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }
  return parsed.data;
}
