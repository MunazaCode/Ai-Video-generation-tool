import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeRelativePath } from "./sanitize-path.js";
import type { StorageProvider } from "./types.js";

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly rootPath: string) {}

  private resolve(relativePath: string): string {
    const safe = sanitizeRelativePath(relativePath);
    const full = path.resolve(this.rootPath, safe);
    const root = path.resolve(this.rootPath);
    if (!full.startsWith(root + path.sep) && full !== root) {
      throw new Error("Resolved path escapes storage root");
    }
    return full;
  }

  async save(relativePath: string, data: Buffer): Promise<string> {
    const full = this.resolve(relativePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return sanitizeRelativePath(relativePath);
  }

  async get(relativePath: string): Promise<Buffer> {
    return readFile(this.resolve(relativePath));
  }

  async delete(relativePath: string): Promise<void> {
    await rm(this.resolve(relativePath), { force: true });
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await readFile(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  /** Absolute path for FFmpeg and other local tools (not exposed via API). */
  getAbsolutePath(relativePath: string): string {
    return this.resolve(relativePath);
  }
}
