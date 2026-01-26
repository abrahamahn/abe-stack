// apps/server/src/infrastructure/cache/cache-factory.test.ts
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createCache, createCacheFromEnv, createMemoryCache } from './cache-factory';
import { MemoryCacheProvider } from './memory-provider';

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
       if (cache != null) {
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

      cache = createMemoryCache({ maxSize: 2 }, { onEviction: (key) => evicted.push(key) });

      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      expect(evicted).toHaveLength(1);
    });
  });

  describe('createCacheFromEnv', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should create memory cache by default', () => {
      process.env = { ...originalEnv };

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });

    test('should use environment configuration', () => {
      process.env = {
        ...originalEnv,
        CACHE_KEY_PREFIX: 'myapp',
        CACHE_DEFAULT_TTL: '120000',
        CACHE_MAX_SIZE: '500',
      };

      const cache = createCacheFromEnv();

      expect(cache).toBeInstanceOf(MemoryCacheProvider);
    });
  });
});
