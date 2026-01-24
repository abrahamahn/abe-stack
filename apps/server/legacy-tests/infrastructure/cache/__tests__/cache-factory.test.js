'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
// apps/server/src/infrastructure/cache/__tests__/cache-factory.test.ts
const vitest_1 = require('vitest');
const cache_factory_1 = require('../cache-factory');
const memory_provider_1 = require('../memory-provider');
// ============================================================================
// Cache Factory Tests
// ============================================================================
(0, vitest_1.describe)('cache factory', () => {
  (0, vitest_1.describe)('createCache', () => {
    (0, vitest_1.test)('should create memory provider', () => {
      const cache = (0, cache_factory_1.createCache)({
        provider: 'memory',
        maxSize: 100,
      });
      (0, vitest_1.expect)(cache).toBeInstanceOf(memory_provider_1.MemoryCacheProvider);
      (0, vitest_1.expect)(cache.name).toBe('memory');
    });
    (0, vitest_1.test)('should pass options to provider', () => {
      const logger = {
        debug: vitest_1.vi.fn(),
        info: vitest_1.vi.fn(),
        warn: vitest_1.vi.fn(),
        error: vitest_1.vi.fn(),
      };
      const cache = (0, cache_factory_1.createCache)(
        {
          provider: 'memory',
          maxSize: 100,
        },
        { logger },
      );
      (0, vitest_1.expect)(cache).toBeInstanceOf(memory_provider_1.MemoryCacheProvider);
    });
  });
  (0, vitest_1.describe)('createMemoryCache', () => {
    let cache;
    (0, vitest_1.afterEach)(async () => {
      if (cache) {
        await cache.close();
      }
    });
    (0, vitest_1.test)('should create memory cache with defaults', () => {
      cache = (0, cache_factory_1.createMemoryCache)();
      (0, vitest_1.expect)(cache).toBeInstanceOf(memory_provider_1.MemoryCacheProvider);
      (0, vitest_1.expect)(cache.name).toBe('memory');
    });
    (0, vitest_1.test)('should apply overrides', async () => {
      cache = (0, cache_factory_1.createMemoryCache)({ maxSize: 5 });
      // Fill cache to verify maxSize
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }
      const stats = cache.getStats();
      (0, vitest_1.expect)(stats.size).toBeLessThanOrEqual(5);
    });
    (0, vitest_1.test)('should pass options', async () => {
      const evicted = [];
      cache = (0, cache_factory_1.createMemoryCache)(
        { maxSize: 2 },
        { onEviction: (key) => evicted.push(key) },
      );
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');
      (0, vitest_1.expect)(evicted).toHaveLength(1);
    });
  });
  (0, vitest_1.describe)('createCacheFromEnv', () => {
    const originalEnv = process.env;
    (0, vitest_1.afterEach)(() => {
      process.env = originalEnv;
    });
    (0, vitest_1.test)('should create memory cache by default', () => {
      process.env = { ...originalEnv };
      const cache = (0, cache_factory_1.createCacheFromEnv)();
      (0, vitest_1.expect)(cache).toBeInstanceOf(memory_provider_1.MemoryCacheProvider);
    });
    (0, vitest_1.test)('should use environment uration', () => {
      process.env = {
        ...originalEnv,
        CACHE_KEY_PREFIX: 'myapp',
        CACHE_DEFAULT_TTL: '120000',
        CACHE_MAX_SIZE: '500',
      };
      const cache = (0, cache_factory_1.createCacheFromEnv)();
      (0, vitest_1.expect)(cache).toBeInstanceOf(memory_provider_1.MemoryCacheProvider);
    });
  });
});
//# sourceMappingURL=cache-factory.test.js.map
