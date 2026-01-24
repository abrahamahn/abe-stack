// apps/server/src/config/infra/storage.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, it } from 'vitest';
import { loadStorage, validateStorage } from './storage';

describe('Storage Configuration', () => {
  describe('Local Provider', () => {
    it('should return local provider with correct default path', () => {
      const config = loadStorage({} as unknown as FullEnv);

      expect(config.provider).toBe('local');
      if (config.provider === 'local') {
        // Aligned with the implementation default
        expect(config.rootPath).toBe('.data/uploads');
      }
    });

    it('should allow custom storage paths', () => {
      const config = loadStorage({ STORAGE_ROOT_PATH: '/mnt/storage' } as unknown as FullEnv);

      if (config.provider === 'local') {
        expect(config.rootPath).toBe('/mnt/storage');
      }
    });
  });

  describe('S3 Provider', () => {
    it('should load full S3 configuration', () => {
      const env = {
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'abe-bucket',
        S3_REGION: 'eu-west-1',
        S3_FORCE_PATH_STYLE: 'true',
        S3_PRESIGN_EXPIRES_IN_SECONDS: 7200,
      } as unknown as FullEnv;

      const config = loadStorage(env);

      expect(config.provider).toBe('s3');
      if (config.provider === 's3') {
        expect(config.bucket).toBe('abe-bucket');
        expect(config.forcePathStyle).toBe(true);
        expect(config.presignExpiresInSeconds).toBe(7200);
      }
    });
  });

  describe('Validation Logic', () => {
    it('should collect errors for missing S3 bucket and region', () => {
      const config = loadStorage({ STORAGE_PROVIDER: 's3' } as unknown as FullEnv);
      const errors = validateStorage(config, true);

      expect(errors).toContain('S3_BUCKET is required for S3 storage');
      expect(errors).toContain('S3_REGION is required for S3 storage');
    });

    it('should require credentials in production mode', () => {
      const config = loadStorage({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'test',
        S3_REGION: 'us-east-1',
      } as unknown as FullEnv);

      const errors = validateStorage(config, true); // isProd = true

      expect(errors).toContain('S3_ACCESS_KEY_ID is required in production');
      expect(errors).toContain('S3_SECRET_ACCESS_KEY is required in production');
    });

    it('should pass validation with complete config', () => {
      const config = loadStorage({
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'test',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
      } as unknown as FullEnv);

      const errors = validateStorage(config, true);
      expect(errors.length).toBe(0);
    });
  });
});
