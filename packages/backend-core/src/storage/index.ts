// infra/src/storage/index.ts
/**
 * @abe-stack/backend-core
 *
 * Storage providers (Local, S3) and HTTP file server.
 */

// Configuration
export { loadStorageConfig, validateStorage } from './config';

// Types
export type {
  StorageProvider,
  UploadParams,
  StorageConfig,
  StorageProviderName,
  LocalStorageConfig,
  S3StorageConfig,
} from './types';

// Factory
export { createStorage } from './factory';

// Providers (direct access if needed)
export { LocalStorageProvider } from './providers/local';
export { S3StorageProvider } from './providers/s3';

// URL Signing
export {
  createSignedUrl,
  parseSignedUrl,
  isUrlExpired,
  normalizeStorageKey,
  getDefaultExpiration,
  normalizeFilename as normalizeStorageFilename,
  createSignature as createStorageSignature,
  verifySignature as verifyStorageSignature,
  type SignedUrlData,
} from './signing';

// HTTP Server (re-exported for convenience)
export {
  registerFileServer,
  type FilesConfig,
  normalizeFilename,
  type FileSignatureData,
  createSignature as createFileSignature,
  verifySignature as verifyFileSignature,
} from './http/index';
