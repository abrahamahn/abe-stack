// src/server/engine/src/storage/index.ts
/**
 * @abe-stack/server-engine
 *
 * Storage providers (Local, S3) and HTTP file server.
 */

// Configuration
export { loadStorageConfig, validateStorage } from './config';

// Types
export type {
  LocalStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageProvider,
  StorageProviderName,
  UploadParams,
} from './types';

// Factory
export { createStorage } from './factory';

// Providers (direct access if needed)
export { LocalStorageProvider } from './providers/local';
export { S3StorageProvider } from './providers/s3';

// URL Signing (canonical implementations)
export {
  createSignature as createStorageSignature,
  createSignedUrl,
  getDefaultExpiration,
  isUrlExpired,
  normalizeFilename as normalizeStorageFilename,
  normalizeStorageKey,
  parseSignedUrl,
  verifySignature as verifyStorageSignature,
  type SignedUrlData,
} from './signing';

// HTTP Server
export {
  createSignature as createFileSignature,
  normalizeFilename,
  registerFileServer,
  verifySignature as verifyFileSignature,
  type FileSignatureData,
  type FilesConfig,
} from './http/index';
