import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Load repo-root `.env` and cwd so `DATABASE_URL` / `STORAGE_PATH` match `pnpm dev:*` from monorepo root. */
export function bootstrapMonorepoEnv(entryUrl: string): void {
  const appDir = path.resolve(path.dirname(fileURLToPath(entryUrl)), "..");
  const repoRoot = path.resolve(appDir, "../..");
  dotenv.config({ path: path.join(repoRoot, ".env") });
  process.chdir(repoRoot);
}
