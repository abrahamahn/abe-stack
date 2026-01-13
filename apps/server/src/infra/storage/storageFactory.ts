// apps/server/src/infra/storage/storageFactory.ts
import { LocalStorageProvider } from './localStorageProvider';
import { S3StorageProvider } from './s3StorageProvider';

import type { StorageConfig, StorageProvider } from './types';

function assertNever(value: never): never {
  throw new Error(
    `Unsupported storage provider: ${(value as { provider?: string }).provider ?? 'unknown'}`,
  );
}

export function createStorage(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'local':
      return new LocalStorageProvider(config);
    case 's3':
      return new S3StorageProvider(config);
    default:
      return assertNever(config);
  }
}
