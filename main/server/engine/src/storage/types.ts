// main/server/engine/src/storage/types.ts
/**
 * Storage Provider Types
 *
 * Re-exports shared storage config types and defines engine-specific types.
 *
 * Naming convention:
 * - StorageProvider = the storage client interface (implements upload/download/delete)
 * - StorageProviderName = the string union ('local' | 's3' | ...)
 * - StorageConfig = discriminated union of provider-specific configs
 */

export type { LocalStorageConfig, S3StorageConfig, StorageConfig } from '@bslt/shared';

/**
 * Storage provider interface — alias for the shared StorageClient contract.
 * Backend-core providers (LocalStorageProvider, S3StorageProvider) implement this.
 */
export type { StorageClient as StorageProvider } from '@bslt/shared';

/**
 * Storage provider name string union — alias for the shared StorageProvider type.
 */
export type { StorageProvider as StorageProviderName } from '@bslt/shared';

/**
 * Parameters for uploading a file to storage.
 *
 * @param key - Storage key (file path)
 * @param contentType - MIME type of the content
 * @param body - File content as Buffer, Uint8Array, or string
 */
export interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | string;
}
