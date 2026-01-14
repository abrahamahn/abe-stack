// apps/server/src/infra/storage/types.ts
/**
 * Storage Provider Types
 *
 * Types for storage implementation (providers, upload params).
 * Config types are in config/storage.config.ts
 */

// Re-export config types for convenience
export type {
  StorageConfig,
  StorageProviderName,
  LocalStorageConfig,
  S3StorageConfig,
} from '../../config/storage.config';

export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}

export interface StorageProvider {
  upload(params: UploadParams): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
