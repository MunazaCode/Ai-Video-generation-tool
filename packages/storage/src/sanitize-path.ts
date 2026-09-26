import path from "node:path";

export class StoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoragePathError";
  }
}

/** Prevents path traversal; returns normalized POSIX-style relative paths. */
export function sanitizeRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.length === 0) {
    throw new StoragePathError("Path must not be empty");
  }
  if (normalized.includes("..")) {
    throw new StoragePathError("Path traversal is not allowed");
  }
  if (path.isAbsolute(normalized)) {
    throw new StoragePathError("Absolute paths are not allowed");
  }
  return normalized;
}
