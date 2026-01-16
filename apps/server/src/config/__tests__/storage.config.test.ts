// apps/server/src/config/__tests__/storage.config.test.ts
import { describe, it, expect } from 'vitest';

import { loadStorageConfig } from '../storage.config';

describe('loadStorageConfig', () => {
  describe('local storage', () => {
    it('should return local provider with default path when no env vars set', () => {
      const config = loadStorageConfig({});
      expect(config.provider).toBe('local');
      expect(config).toHaveProperty('rootPath');
      if (config.provider === 'local') {
        expect(config.rootPath).toBe('../../uploads');
      }
    });

    it('should use STORAGE_ROOT_PATH when provided', () => {
      const config = loadStorageConfig({
        STORAGE_ROOT_PATH: '/custom/uploads',
      });
      expect(config.provider).toBe('local');
      if (config.provider === 'local') {
        expect(config.rootPath).toBe('/custom/uploads');
      }
    });

    it('should include publicBaseUrl when provided', () => {
      const config = loadStorageConfig({
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com',
      });
      expect(config.provider).toBe('local');
      if (config.provider === 'local') {
        expect(config.publicBaseUrl).toBe('https://cdn.example.com');
      }
    });
  });

  describe('S3 storage', () => {
    it('should return S3 provider when STORAGE_PROVIDER=s3', () => {
      const config = loadStorageConfig({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
      });
      expect(config.provider).toBe('s3');
      if (config.provider === 's3') {
        expect(config.bucket).toBe('my-bucket');
        expect(config.region).toBe('us-east-1');
      }
    });

    it('should throw when S3 is selected but bucket is missing', () => {
      expect(() =>
        loadStorageConfig({
          STORAGE_PROVIDER: 's3',
          S3_REGION: 'us-east-1',
        }),
      ).toThrow('S3_BUCKET and S3_REGION are required');
    });

    it('should throw when S3 is selected but region is missing', () => {
      expect(() =>
        loadStorageConfig({
          STORAGE_PROVIDER: 's3',
          S3_BUCKET: 'my-bucket',
        }),
      ).toThrow('S3_BUCKET and S3_REGION are required');
    });

    it('should include optional S3 config when provided', () => {
      const config = loadStorageConfig({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY_ID: 'access-key',
        S3_SECRET_ACCESS_KEY: 'secret-key',
        S3_ENDPOINT: 'https://s3.custom.com',
        S3_FORCE_PATH_STYLE: 'true',
        S3_PRESIGN_EXPIRES_IN_SECONDS: '3600',
      });
      expect(config.provider).toBe('s3');
      if (config.provider === 's3') {
        expect(config.accessKeyId).toBe('access-key');
        expect(config.secretAccessKey).toBe('secret-key');
        expect(config.endpoint).toBe('https://s3.custom.com');
        expect(config.forcePathStyle).toBe(true);
        expect(config.presignExpiresInSeconds).toBe(3600);
      }
    });
  });
});
