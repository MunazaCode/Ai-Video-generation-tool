import type { z } from "zod";

export interface StructuredOutputSuccess<T> {
  ok: true;
  data: T;
  attempts: number;
}

export interface StructuredOutputFailure {
  ok: false;
  message: string;
  attempts: number;
}

export type StructuredOutputResult<T> =
  | StructuredOutputSuccess<T>
  | StructuredOutputFailure;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const BACKOFF_MS = [2_000, 5_000] as const;

export async function parseStructuredOutput<T>(options: {
  schema: z.ZodType<T>;
  fetchRaw: () => Promise<unknown>;
  maxAttempts?: number;
  repair?: (raw: unknown, errorMessage: string) => unknown;
}): Promise<StructuredOutputResult<T>> {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastMessage = "Unknown validation error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw = await options.fetchRaw();
    let parsed = options.schema.safeParse(raw);
    if (parsed.success) {
      return { ok: true, data: parsed.data, attempts: attempt };
    }

    lastMessage = parsed.error.issues.map((i) => i.message).join("; ");

    if (options.repair) {
      raw = options.repair(raw, lastMessage);
      parsed = options.schema.safeParse(raw);
      if (parsed.success) {
        return { ok: true, data: parsed.data, attempts: attempt };
      }
      lastMessage = parsed.error.issues.map((i) => i.message).join("; ");
    }

    if (attempt < maxAttempts) {
      const backoff = BACKOFF_MS[attempt - 1] ?? 5_000;
      await sleep(backoff);
    }
  }

  return { ok: false, message: lastMessage, attempts: maxAttempts };
}
