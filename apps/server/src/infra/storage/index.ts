// apps/server/src/infra/storage/index.ts

// Factory
export { createStorage } from './storageFactory';

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
export { LocalStorageProvider, S3StorageProvider } from './providers/index';

// Utils
export { normalizeStorageKey } from './utils';
