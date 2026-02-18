// main/shared/src/config/env.cache.test.ts
import { describe, expect, it } from 'vitest';

import { CacheEnvSchema } from './env.cache';

describe('CacheEnvSchema', () => {
  describe('defaults', () => {
    it('defaults CACHE_TTL_MS to 300000', () => {
      const result = CacheEnvSchema.parse({});
      expect(result.CACHE_TTL_MS).toBe(300000);
    });

    it('defaults CACHE_MAX_SIZE to 1000', () => {
      const result = CacheEnvSchema.parse({});
      expect(result.CACHE_MAX_SIZE).toBe(1000);
    });

    it('defaults REDIS_HOST to localhost', () => {
      const result = CacheEnvSchema.parse({});
      expect(result.REDIS_HOST).toBe('localhost');
    });

    it('defaults REDIS_PORT to 6379', () => {
      const result = CacheEnvSchema.parse({});
      expect(result.REDIS_PORT).toBe(6379);
    });

    it('leaves optional fields undefined when absent', () => {
      const result = CacheEnvSchema.parse({});
      expect(result.CACHE_PROVIDER).toBeUndefined();
      expect(result.CACHE_USE_REDIS).toBeUndefined();
      expect(result.REDIS_PASSWORD).toBeUndefined();
      expect(result.REDIS_DB).toBeUndefined();
    });
  });

  describe('CACHE_PROVIDER', () => {
    it('accepts local', () => {
      expect(CacheEnvSchema.parse({ CACHE_PROVIDER: 'local' }).CACHE_PROVIDER).toBe('local');
    });

    it('accepts redis', () => {
      expect(CacheEnvSchema.parse({ CACHE_PROVIDER: 'redis' }).CACHE_PROVIDER).toBe('redis');
    });

    it('rejects an unknown provider', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_PROVIDER: 'memcached' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_PROVIDER: '' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_PROVIDER: 1 })).toThrow();
    });
  });

  describe('CACHE_TTL_MS', () => {
    it('accepts a custom numeric TTL', () => {
      const result = CacheEnvSchema.parse({ CACHE_TTL_MS: 60000 });
      expect(result.CACHE_TTL_MS).toBe(60000);
    });

    it('coerces a string number to a number', () => {
      const result = CacheEnvSchema.parse({ CACHE_TTL_MS: '120000' });
      expect(result.CACHE_TTL_MS).toBe(120000);
    });

    it('rejects a non-numeric string', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_TTL_MS: 'fast' })).toThrow();
    });

    it('accepts zero as a valid TTL', () => {
      const result = CacheEnvSchema.parse({ CACHE_TTL_MS: 0 });
      expect(result.CACHE_TTL_MS).toBe(0);
    });

    it('accepts a negative TTL (schema does not enforce minimum)', () => {
      // coerceNumber has no min constraint here, so -1 is accepted at schema level
      const result = CacheEnvSchema.parse({ CACHE_TTL_MS: -1 });
      expect(result.CACHE_TTL_MS).toBe(-1);
    });
  });

  describe('CACHE_MAX_SIZE', () => {
    it('accepts a custom max size', () => {
      const result = CacheEnvSchema.parse({ CACHE_MAX_SIZE: 500 });
      expect(result.CACHE_MAX_SIZE).toBe(500);
    });

    it('coerces a string number', () => {
      const result = CacheEnvSchema.parse({ CACHE_MAX_SIZE: '200' });
      expect(result.CACHE_MAX_SIZE).toBe(200);
    });

    it('rejects an alphabetic string', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_MAX_SIZE: 'large' })).toThrow();
    });
  });

  describe('CACHE_USE_REDIS', () => {
    it('accepts true', () => {
      expect(CacheEnvSchema.parse({ CACHE_USE_REDIS: 'true' }).CACHE_USE_REDIS).toBe('true');
    });

    it('accepts false', () => {
      expect(CacheEnvSchema.parse({ CACHE_USE_REDIS: 'false' }).CACHE_USE_REDIS).toBe('false');
    });

    it('rejects yes', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_USE_REDIS: 'yes' })).toThrow();
    });

    it('rejects a boolean value', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_USE_REDIS: true })).toThrow();
    });

    it('rejects 1', () => {
      expect(() => CacheEnvSchema.parse({ CACHE_USE_REDIS: 1 })).toThrow();
    });
  });

  describe('REDIS_HOST', () => {
    it('accepts a custom hostname', () => {
      expect(CacheEnvSchema.parse({ REDIS_HOST: 'redis.internal' }).REDIS_HOST).toBe(
        'redis.internal',
      );
    });

    it('rejects a non-string value', () => {
      expect(() => CacheEnvSchema.parse({ REDIS_HOST: 12345 })).toThrow();
    });
  });

  describe('REDIS_PORT', () => {
    it('accepts a valid port number', () => {
      expect(CacheEnvSchema.parse({ REDIS_PORT: 6380 }).REDIS_PORT).toBe(6380);
    });

    it('coerces a port string', () => {
      expect(CacheEnvSchema.parse({ REDIS_PORT: '6380' }).REDIS_PORT).toBe(6380);
    });

    it('rejects a non-numeric port string', () => {
      expect(() => CacheEnvSchema.parse({ REDIS_PORT: 'abc' })).toThrow();
    });

    it('accepts port 0 (schema does not enforce min port)', () => {
      const result = CacheEnvSchema.parse({ REDIS_PORT: 0 });
      expect(result.REDIS_PORT).toBe(0);
    });
  });

  describe('REDIS_PASSWORD', () => {
    it('accepts a password string', () => {
      const result = CacheEnvSchema.parse({ REDIS_PASSWORD: 's3cr3t' });
      expect(result.REDIS_PASSWORD).toBe('s3cr3t');
    });

    it('rejects a non-string password', () => {
      expect(() => CacheEnvSchema.parse({ REDIS_PASSWORD: 42 })).toThrow();
    });
  });

  describe('REDIS_DB', () => {
    it('accepts a valid DB index', () => {
      const result = CacheEnvSchema.parse({ REDIS_DB: 2 });
      expect(result.REDIS_DB).toBe(2);
    });

    it('coerces a string DB index', () => {
      const result = CacheEnvSchema.parse({ REDIS_DB: '3' });
      expect(result.REDIS_DB).toBe(3);
    });

    it('rejects a non-numeric DB value', () => {
      expect(() => CacheEnvSchema.parse({ REDIS_DB: 'primary' })).toThrow();
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => CacheEnvSchema.parse(null)).toThrow();
    });

    it('rejects undefined', () => {
      expect(() => CacheEnvSchema.parse(undefined)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => CacheEnvSchema.parse(['redis'])).toThrow();
    });

    it('rejects a number', () => {
      expect(() => CacheEnvSchema.parse(6379)).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for a minimal valid input', () => {
      const result = CacheEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = CacheEnvSchema.safeParse({ CACHE_PROVIDER: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for a non-numeric TTL without throwing', () => {
      const result = CacheEnvSchema.safeParse({ CACHE_TTL_MS: 'not-a-number' });
      expect(result.success).toBe(false);
    });
  });
});
