// apps/server/src/infrastructure/cache/__tests__/cache-factory.test.ts
import { CacheProviderNotFoundError } from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';


import {
  createCache,
  createCacheFromEnv,
  createMemoryCache,
  createRedisCache,
} from '../cache-factory';
import { MemoryCacheProvider } from '../memory-provider';
import { RedisCacheProvider } from '../redis-provider';

// ============================================================================
// Cache Factory Tests
// ============================================================================

describe('cache factory', () => {
  describe('createCache', () => {
    test('should create memory provider', () => {
      const cache = createCache({
        provider: 'memory',
        maxSize: 100,
      });

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
      expect(cache.name).toBe('memory');
    });

    test('should create redis provider', () => {
      const cache = createCache({
        provider: 'redis',
        url: 'redis://localhost:6379',
      });

      expect(cache).toBeInstanceOf(RedisCacheProvider);
      expect(cache.name).toBe('redis');
    });

    test('should throw for unknown provider', () => {
      expect(() =>
        createCache({
          provider: 'unknown' as 'memory',
          maxSize: 100,
        }),
      ).toThrow(CacheProviderNotFoundError);
    });

    test('should pass options to provider', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const cache = createCache(
        {
          provider: 'memory',
          maxSize: 100,
        },
        { logger },
      );

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });
  });

  describe('createMemoryCache', () => {
    let cache: MemoryCacheProvider;

    afterEach(async () => {
      if (cache) {
        await cache.close();
      }
    });

    test('should create memory cache with defaults', () => {
      cache = createMemoryCache();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
      expect(cache.name).toBe('memory');
    });

    test('should apply overrides', async () => {
      cache = createMemoryCache({ maxSize: 5 });

      // Fill cache to verify maxSize
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });

    test('should pass options', async () => {
      const evicted: string[] = [];

      cache = createMemoryCache(
        { maxSize: 2 },
        { onEviction: (key) => evicted.push(key) },
      );

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(evicted).toHaveLength(1);
    });
  });

  describe('createRedisCache', () => {
    test('should create redis cache with URL', () => {
      const cache = createRedisCache('redis://localhost:6379');

      expect(cache).toBeInstanceOf(RedisCacheProvider);
      expect(cache.name).toBe('redis');
    });

    test('should apply overrides', () => {
      const cache = createRedisCache('redis://localhost:6379', {
        keyPrefix: 'test',
        db: 1,
      });

      expect(cache).toBeInstanceOf(RedisCacheProvider);
    });
  });

  describe('createCacheFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should create memory cache by default', () => {
      delete process.env['CACHE_PROVIDER'];
      delete process.env['REDIS_URL'];

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should create memory cache when CACHE_PROVIDER is memory', () => {
      process.env['CACHE_PROVIDER'] = 'memory';

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should create redis cache when configured', () => {
      process.env['CACHE_PROVIDER'] = 'redis';
      process.env['REDIS_URL'] = 'redis://localhost:6379';

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(RedisCacheProvider);
    });

    test('should fall back to memory when redis URL is missing', () => {
      process.env['CACHE_PROVIDER'] = 'redis';
      delete process.env['REDIS_URL'];

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should use environment configuration', () => {
      process.env['CACHE_PROVIDER'] = 'memory';
      process.env['CACHE_KEY_PREFIX'] = 'myapp';
      process.env['CACHE_DEFAULT_TTL'] = '120000';
      process.env['CACHE_MAX_SIZE'] = '500';

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should configure redis options from environment', () => {
      process.env['CACHE_PROVIDER'] = 'redis';
      process.env['REDIS_URL'] = 'redis://localhost:6379';
      process.env['REDIS_DB'] = '2';
      process.env['REDIS_TLS'] = 'true';

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(RedisCacheProvider);
    });
  });
});
