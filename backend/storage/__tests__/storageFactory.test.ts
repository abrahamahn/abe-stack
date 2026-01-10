import { describe, it, expect } from 'vitest';

import { createStorage } from '@storageFactory';

import type { LocalStorageConfig, S3StorageConfig } from '../types';

describe('createStorage', () => {
  it('should create a LocalStorageProvider when provider is "local"', () => {
    const config: LocalStorageConfig = {
      provider: 'local',
      rootPath: '/tmp/uploads',
    };

    const storage = createStorage(config);

    expect(storage).toBeDefined();
    expect(storage).toHaveProperty('upload');
    expect(storage).toHaveProperty('getSignedUrl');
  });

  it('should create an S3StorageProvider when provider is "s3"', () => {
    const config: S3StorageConfig = {
      provider: 's3',
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    };

    const storage = createStorage(config);

    expect(storage).toBeDefined();
    expect(storage).toHaveProperty('upload');
    expect(storage).toHaveProperty('getSignedUrl');
  });

  it('should throw error for unsupported provider', () => {
    const config = {
      provider: 'unsupported' as 'local',
      rootPath: '/tmp',
    };

    expect(() => createStorage(config)).toThrow(/Unsupported storage provider/);
  });
});
