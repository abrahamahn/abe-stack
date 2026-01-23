// apps/server/src//__tests__/storage..test.ts
import { describe, it, expect } from 'vitest';

import { loadStorage } from '../storage.';

describe('loadStorage', () => {
  describe('local storage', () => {
    it('should return local provider with default path when no env vars set', () => {
      const  = loadStorage({});
      expect(.provider).toBe('local');
      expect().toHaveProperty('rootPath');
      if (.provider === 'local') {
        expect(.rootPath).toBe('../../uploads');
      }
    });

    it('should use STORAGE_ROOT_PATH when provided', () => {
      const  = loadStorage({
        STORAGE_ROOT_PATH: '/custom/uploads',
      });
      expect(.provider).toBe('local');
      if (.provider === 'local') {
        expect(.rootPath).toBe('/custom/uploads');
      }
    });

    it('should include publicBaseUrl when provided', () => {
      const  = loadStorage({
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com',
      });
      expect(.provider).toBe('local');
      if (.provider === 'local') {
        expect(.publicBaseUrl).toBe('https://cdn.example.com');
      }
    });
  });

  describe('S3 storage', () => {
    it('should return S3 provider when STORAGE_PROVIDER=s3', () => {
      const  = loadStorage({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
      });
      expect(.provider).toBe('s3');
      if (.provider === 's3') {
        expect(.bucket).toBe('my-bucket');
        expect(.region).toBe('us-east-1');
      }
    });

    it('should throw when S3 is selected but bucket is missing', () => {
      expect(() =>
        loadStorage({
          STORAGE_PROVIDER: 's3',
          S3_REGION: 'us-east-1',
        }),
      ).toThrow('S3_BUCKET and S3_REGION are required');
    });

    it('should throw when S3 is selected but region is missing', () => {
      expect(() =>
        loadStorage({
          STORAGE_PROVIDER: 's3',
          S3_BUCKET: 'my-bucket',
        }),
      ).toThrow('S3_BUCKET and S3_REGION are required');
    });

    it('should include optional S3  when provided', () => {
      const  = loadStorage({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY_ID: 'access-key',
        S3_SECRET_ACCESS_KEY: 'secret-key',
        S3_ENDPOINT: 'https://s3.custom.com',
        S3_FORCE_PATH_STYLE: 'true',
        S3_PRESIGN_EXPIRES_IN_SECONDS: '3600',
      });
      expect(.provider).toBe('s3');
      if (.provider === 's3') {
        expect(.accessKeyId).toBe('access-key');
        expect(.secretAccessKey).toBe('secret-key');
        expect(.endpoint).toBe('https://s3.custom.com');
        expect(.forcePathStyle).toBe(true);
        expect(.presignExpiresInSeconds).toBe(3600);
      }
    });
  });
});
