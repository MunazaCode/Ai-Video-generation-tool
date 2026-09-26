import { z } from "zod";



const envSchema = z.object({

  MOCK_AI: z

    .enum(["true", "false"])

    .default("true")

    .transform((v) => v === "true"),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),

  WORKER_STALE_JOB_MS: z.coerce.number().int().nonnegative().default(900_000),

  STORAGE_PATH: z.string().min(1).default("./storage"),

  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),

  LLM_PROVIDER: z.string().min(1).default("mock"),

  IMAGE_PROVIDER: z.string().min(1).default("mock"),

  VIDEO_PROVIDER: z.string().min(1).default("mock"),

  TTS_PROVIDER: z.string().min(1).default("mock"),

  MUSIC_PROVIDER: z.string().min(1).default("mock"),

  FFMPEG_PATH: z.string().optional(),

});



export type WorkerEnv = z.infer<typeof envSchema>;



export function loadWorkerEnv(): WorkerEnv {

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {

    const message = parsed.error.issues

      .map((i) => `${i.path.join(".")}: ${i.message}`)

      .join("; ");

    throw new Error(`Invalid worker environment: ${message}`);

  }

  return parsed.data;

}

