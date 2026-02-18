// main/shared/src/config/env.storage.test.ts
import { describe, expect, it } from 'vitest';

import { StorageEnvSchema } from './env.storage';

describe('StorageEnvSchema', () => {
  describe('defaults', () => {
    it('defaults STORAGE_PROVIDER to local', () => {
      const result = StorageEnvSchema.parse({});
      expect(result.STORAGE_PROVIDER).toBe('local');
    });

    it('leaves all optional fields undefined when absent', () => {
      const result = StorageEnvSchema.parse({});
      expect(result.STORAGE_ROOT_PATH).toBeUndefined();
      expect(result.STORAGE_PUBLIC_BASE_URL).toBeUndefined();
      expect(result.S3_ACCESS_KEY_ID).toBeUndefined();
      expect(result.S3_SECRET_ACCESS_KEY).toBeUndefined();
      expect(result.S3_BUCKET).toBeUndefined();
      expect(result.S3_REGION).toBeUndefined();
      expect(result.S3_ENDPOINT).toBeUndefined();
      expect(result.S3_FORCE_PATH_STYLE).toBeUndefined();
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBeUndefined();
    });
  });

  describe('STORAGE_PROVIDER', () => {
    it('accepts local', () => {
      expect(StorageEnvSchema.parse({ STORAGE_PROVIDER: 'local' }).STORAGE_PROVIDER).toBe('local');
    });

    it('accepts s3', () => {
      expect(StorageEnvSchema.parse({ STORAGE_PROVIDER: 's3' }).STORAGE_PROVIDER).toBe('s3');
    });

    it('rejects gcs', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PROVIDER: 'gcs' })).toThrow();
    });

    it('rejects azure', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PROVIDER: 'azure' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PROVIDER: '' })).toThrow();
    });

    it('rejects uppercase S3', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PROVIDER: 'S3' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PROVIDER: 3 })).toThrow();
    });
  });

  describe('local storage fields', () => {
    it('accepts STORAGE_ROOT_PATH', () => {
      const result = StorageEnvSchema.parse({ STORAGE_ROOT_PATH: '/data/uploads' });
      expect(result.STORAGE_ROOT_PATH).toBe('/data/uploads');
    });

    it('rejects a non-string STORAGE_ROOT_PATH', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_ROOT_PATH: 42 })).toThrow();
    });

    it('accepts STORAGE_PUBLIC_BASE_URL with a valid HTTPS URL', () => {
      const result = StorageEnvSchema.parse({
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.com',
      });
      expect(result.STORAGE_PUBLIC_BASE_URL).toBe('https://cdn.example.com');
    });

    it('rejects STORAGE_PUBLIC_BASE_URL without a protocol', () => {
      expect(() =>
        StorageEnvSchema.parse({ STORAGE_PUBLIC_BASE_URL: 'cdn.example.com' }),
      ).toThrow();
    });

    it('rejects STORAGE_PUBLIC_BASE_URL that is a bare path', () => {
      expect(() =>
        StorageEnvSchema.parse({ STORAGE_PUBLIC_BASE_URL: '/public/files' }),
      ).toThrow();
    });

    it('rejects a non-string STORAGE_PUBLIC_BASE_URL', () => {
      expect(() => StorageEnvSchema.parse({ STORAGE_PUBLIC_BASE_URL: 8080 })).toThrow();
    });
  });

  describe('S3 fields', () => {
    it('accepts all S3 fields', () => {
      const result = StorageEnvSchema.parse({
        STORAGE_PROVIDER: 's3',
        S3_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        S3_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        S3_BUCKET: 'my-app-bucket',
        S3_REGION: 'us-east-1',
        S3_ENDPOINT: 'https://s3.amazonaws.com',
        S3_FORCE_PATH_STYLE: 'true',
        S3_PRESIGN_EXPIRES_IN_SECONDS: 3600,
      });
      expect(result.S3_ACCESS_KEY_ID).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.S3_SECRET_ACCESS_KEY).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(result.S3_BUCKET).toBe('my-app-bucket');
      expect(result.S3_REGION).toBe('us-east-1');
      expect(result.S3_ENDPOINT).toBe('https://s3.amazonaws.com');
      expect(result.S3_FORCE_PATH_STYLE).toBe('true');
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBe(3600);
    });

    it('rejects a non-string S3_ACCESS_KEY_ID', () => {
      expect(() => StorageEnvSchema.parse({ S3_ACCESS_KEY_ID: 123 })).toThrow();
    });

    it('rejects a non-string S3_SECRET_ACCESS_KEY', () => {
      expect(() => StorageEnvSchema.parse({ S3_SECRET_ACCESS_KEY: null })).toThrow();
    });

    it('rejects a non-string S3_BUCKET', () => {
      expect(() => StorageEnvSchema.parse({ S3_BUCKET: true })).toThrow();
    });

    it('rejects a non-string S3_REGION', () => {
      expect(() => StorageEnvSchema.parse({ S3_REGION: 1 })).toThrow();
    });
  });

  describe('S3_ENDPOINT', () => {
    it('accepts a valid HTTPS endpoint', () => {
      const result = StorageEnvSchema.parse({
        S3_ENDPOINT: 'https://minio.internal.example.com:9000',
      });
      expect(result.S3_ENDPOINT).toBe('https://minio.internal.example.com:9000');
    });

    it('rejects an endpoint without a protocol', () => {
      expect(() => StorageEnvSchema.parse({ S3_ENDPOINT: 'minio.example.com:9000' })).toThrow();
    });

    it('rejects an empty string endpoint', () => {
      expect(() => StorageEnvSchema.parse({ S3_ENDPOINT: '' })).toThrow();
    });

    it('rejects a non-string endpoint', () => {
      expect(() => StorageEnvSchema.parse({ S3_ENDPOINT: 9000 })).toThrow();
    });
  });

  describe('S3_FORCE_PATH_STYLE', () => {
    it('accepts true', () => {
      expect(StorageEnvSchema.parse({ S3_FORCE_PATH_STYLE: 'true' }).S3_FORCE_PATH_STYLE).toBe(
        'true',
      );
    });

    it('accepts false', () => {
      expect(StorageEnvSchema.parse({ S3_FORCE_PATH_STYLE: 'false' }).S3_FORCE_PATH_STYLE).toBe(
        'false',
      );
    });

    it('rejects 1', () => {
      expect(() => StorageEnvSchema.parse({ S3_FORCE_PATH_STYLE: '1' })).toThrow();
    });

    it('rejects a boolean true', () => {
      expect(() => StorageEnvSchema.parse({ S3_FORCE_PATH_STYLE: true })).toThrow();
    });

    it('rejects yes', () => {
      expect(() => StorageEnvSchema.parse({ S3_FORCE_PATH_STYLE: 'yes' })).toThrow();
    });
  });

  describe('S3_PRESIGN_EXPIRES_IN_SECONDS', () => {
    it('accepts a standard expiry of 3600', () => {
      const result = StorageEnvSchema.parse({ S3_PRESIGN_EXPIRES_IN_SECONDS: 3600 });
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBe(3600);
    });

    it('coerces a string value', () => {
      const result = StorageEnvSchema.parse({ S3_PRESIGN_EXPIRES_IN_SECONDS: '900' });
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBe(900);
    });

    it('rejects a non-numeric string', () => {
      expect(() => StorageEnvSchema.parse({ S3_PRESIGN_EXPIRES_IN_SECONDS: 'hour' })).toThrow();
    });

    it('accepts zero (no minimum enforced)', () => {
      const result = StorageEnvSchema.parse({ S3_PRESIGN_EXPIRES_IN_SECONDS: 0 });
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBe(0);
    });

    it('accepts a very long expiry (no maximum enforced at schema level)', () => {
      const result = StorageEnvSchema.parse({ S3_PRESIGN_EXPIRES_IN_SECONDS: 604800 });
      expect(result.S3_PRESIGN_EXPIRES_IN_SECONDS).toBe(604800);
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => StorageEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => StorageEnvSchema.parse(['local'])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => StorageEnvSchema.parse('s3')).toThrow();
    });

    it('rejects a number', () => {
      expect(() => StorageEnvSchema.parse(0)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = StorageEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = StorageEnvSchema.safeParse({ STORAGE_PROVIDER: 'gcs' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for a URL without protocol without throwing', () => {
      const result = StorageEnvSchema.safeParse({ STORAGE_PUBLIC_BASE_URL: 'cdn.example.com' });
      expect(result.success).toBe(false);
    });
  });
});
