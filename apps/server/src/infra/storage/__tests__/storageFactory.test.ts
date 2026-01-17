// apps/server/src/infra/storage/__tests__/storageFactory.test.ts
import { createStorage } from '@storage/storageFactory';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { LocalStorageConfig, S3StorageConfig, StorageConfig } from '@config/storage.config';

// Use vi.hoisted for class mocks
const { MockLocalStorageProvider, MockS3StorageProvider } = vi.hoisted(() => {
  class MockLocalStorageProvider {
    _type = 'LocalStorageProvider';
    config: LocalStorageConfig;
    constructor(config: LocalStorageConfig) {
      this.config = config;
    }
    upload = vi.fn();
    getSignedUrl = vi.fn();
  }

  class MockS3StorageProvider {
    _type = 'S3StorageProvider';
    config: S3StorageConfig;
    constructor(config: S3StorageConfig) {
      this.config = config;
    }
    upload = vi.fn();
    getSignedUrl = vi.fn();
  }

  return { MockLocalStorageProvider, MockS3StorageProvider };
});

vi.mock('@providers/localStorageProvider', () => ({
  LocalStorageProvider: MockLocalStorageProvider,
}));

vi.mock('@providers/s3StorageProvider', () => ({
  S3StorageProvider: MockS3StorageProvider,
}));

describe('createStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('local provider', () => {
    it('should create a LocalStorageProvider for local config', () => {
      const config: LocalStorageConfig = {
        provider: 'local',
        rootPath: '/tmp/uploads',
      };

      const provider = createStorage(config);

      expect(provider).toBeInstanceOf(MockLocalStorageProvider);
      expect(provider).toHaveProperty('_type', 'LocalStorageProvider');
    });

    it('should pass full config including publicBaseUrl', () => {
      const config: LocalStorageConfig = {
        provider: 'local',
        rootPath: '/tmp/uploads',
        publicBaseUrl: 'https://cdn.example.com',
      };

      const provider = createStorage(config);

      expect(provider).toBeInstanceOf(MockLocalStorageProvider);
      expect((provider as InstanceType<typeof MockLocalStorageProvider>).config).toEqual(config);
    });
  });

  describe('S3 provider', () => {
    it('should create an S3StorageProvider for s3 config', () => {
      const config: S3StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
      };

      const provider = createStorage(config);

      expect(provider).toBeInstanceOf(MockS3StorageProvider);
      expect(provider).toHaveProperty('_type', 'S3StorageProvider');
    });

    it('should pass full S3 config including optional fields', () => {
      const config: S3StorageConfig = {
        provider: 's3',
        bucket: 'test-bucket',
        region: 'us-east-1',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        endpoint: 'https://minio.local:9000',
        forcePathStyle: true,
        presignExpiresInSeconds: 3600,
      };

      const provider = createStorage(config);

      expect(provider).toBeInstanceOf(MockS3StorageProvider);
      expect((provider as InstanceType<typeof MockS3StorageProvider>).config).toEqual(config);
    });
  });

  describe('unsupported provider', () => {
    it('should throw an error for unsupported provider type', () => {
      const invalidConfig = {
        provider: 'azure-blob',
        container: 'test',
      } as unknown as StorageConfig;

      expect(() => createStorage(invalidConfig)).toThrow('Unsupported storage provider');
    });

    it('should throw an error when provider is missing', () => {
      const invalidConfig = {
        rootPath: '/tmp/uploads',
      } as unknown as StorageConfig;

      expect(() => createStorage(invalidConfig)).toThrow('Unsupported storage provider');
    });
  });

  describe('provider interface', () => {
    it('should return a provider with upload method', () => {
      const config: LocalStorageConfig = {
        provider: 'local',
        rootPath: '/tmp/uploads',
      };

      const provider = createStorage(config);

      expect(provider).toHaveProperty('upload');
      expect(typeof provider.upload).toBe('function');
    });

    it('should return a provider with getSignedUrl method', () => {
      const config: LocalStorageConfig = {
        provider: 'local',
        rootPath: '/tmp/uploads',
      };

      const provider = createStorage(config);

      expect(provider).toHaveProperty('getSignedUrl');
      expect(typeof provider.getSignedUrl).toBe('function');
    });
  });
});
