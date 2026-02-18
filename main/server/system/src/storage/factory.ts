// main/server/system/src/storage/factory.ts
import { LocalStorageProvider } from './providers/local';
import { S3StorageProvider } from './providers/s3';

import type { StorageConfig, StorageProvider } from './types';

/**
 * Creates a storage provider instance based on the configuration.
 *
 * @param config - Storage configuration specifying the provider type and its settings
 * @returns A storage provider instance
 * @throws Error if the provider type is unsupported
 * @complexity O(1) - direct instantiation
 */
export function createStorage(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'local':
      return new LocalStorageProvider(config);
    case 's3':
      return new S3StorageProvider(config);
    default: {
      const unsupported: string = (config as { provider: string }).provider;
      throw new Error(`Unsupported storage provider: ${unsupported}`);
    }
  }
}
