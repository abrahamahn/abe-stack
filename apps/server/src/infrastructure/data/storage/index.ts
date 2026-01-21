// apps/server/src/infrastructure/data/storage/index.ts

// Factory
export { createStorage } from './factory';

// Types
export type {
  StorageConfig,
  StorageProviderName,
  LocalStorageConfig,
  S3StorageConfig,
  UploadParams,
  StorageProvider,
} from './types';

// Providers (re-exported for direct access if needed)
export { LocalStorageProvider, S3StorageProvider } from './providers';

// Utils (signed URLs)
export {
  createSignature,
  verifySignature,
  createSignedUrl,
  parseSignedUrl,
  isUrlExpired,
  normalizeFilename,
  normalizeStorageKey,
  getDefaultExpiration,
  type SignedUrlData,
} from './utils';
