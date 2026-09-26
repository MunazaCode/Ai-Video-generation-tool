export interface StorageProvider {
  save(relativePath: string, data: Buffer): Promise<string>;
  get(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<void>;
  exists(relativePath: string): Promise<boolean>;
  getAbsolutePath?(relativePath: string): string;
}
