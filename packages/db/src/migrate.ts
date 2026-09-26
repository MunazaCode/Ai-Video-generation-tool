import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { DrizzleDb } from "./client.js";
import { createDrizzle } from "./client.js";

function migrationsFolderPath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "drizzle",
  );
}

export function applyMigrations(db: DrizzleDb): void {
  migrate(db, { migrationsFolder: migrationsFolderPath() });
}

export function migrateDatabase(databaseUrl: string): void {
  const db = createDrizzle(databaseUrl);
  applyMigrations(db);
}
