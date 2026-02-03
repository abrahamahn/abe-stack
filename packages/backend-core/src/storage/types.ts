// infra/src/storage/types.ts
/**
 * Storage Provider Types
 */

// Re-export config types for convenience
export type {
    LocalStorageConfig,
    S3StorageConfig,
    StorageClient,
    StorageConfig,
    StorageClient as StorageProvider,
    StorageProvider as StorageProviderName
} from '@abe-stack/shared';


export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}

