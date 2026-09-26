export type { StorageProvider } from "./types.js";
export { LocalStorageProvider } from "./local-storage-provider.js";
export { sanitizeRelativePath, StoragePathError } from "./sanitize-path.js";

export function storagePackageReady(): string {
  return "LocalStorageProvider + path sanitization";
}
