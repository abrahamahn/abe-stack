// apps/server/src/infrastructure/data/storage/types.ts
/**
 * Storage Provider Types
 *
 * Types for storage implementation (providers, upload params).
 * Config types are in config/storage.config.ts
 */

// Re-export config types for convenience
export type {
  LocalStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageProviderName,
} from '@abe-stack/core/config';

export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}

export interface StorageProvider {
  upload(key: string, data: Buffer | Uint8Array | string, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
