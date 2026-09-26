import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "../..");

// Next.js only loads `.env*` from apps/web; share repo-root `.env` with API/worker.
dotenv.config({ path: path.join(monorepoRoot, ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@asv/shared"],
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
