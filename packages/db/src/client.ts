import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DrizzleDb = ReturnType<typeof createDrizzle>;

export function resolveSqlitePath(databaseUrl: string): string {
  const prefix = "file:";
  if (!databaseUrl.startsWith(prefix)) {
    throw new Error(
      `DATABASE_URL must be a SQLite file URL (file:./path). Received: ${databaseUrl}`,
    );
  }
  let filePath = databaseUrl.slice(prefix.length);
  if (filePath.startsWith("//")) {
    filePath = filePath.slice(2);
  }
  if (filePath.includes(":memory:")) {
    return filePath;
  }
  return filePath;
}

export function createSqliteConnection(databaseUrl: string): Database.Database {
  const filePath = resolveSqlitePath(databaseUrl);
  if (!filePath.includes(":memory:")) {
    mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  return new Database(filePath);
}

export function createDrizzle(databaseUrl: string) {
  const sqlite = createSqliteConnection(databaseUrl);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
