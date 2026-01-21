// apps/server/src/infrastructure/cache/cache-factory.ts
/**
 * Cache Factory
 *
 * Factory function to create cache providers based on configuration.
 */

import { CacheProviderNotFoundError } from '@abe-stack/core';

import { MemoryCacheProvider } from './memory-provider';
import { RedisCacheProvider } from './redis-provider';

import type { CreateCacheOptions } from './types';
import type { CacheConfig, CacheProvider } from '@abe-stack/core';

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a cache provider based on configuration.
 *
 * @param config - Cache configuration
 * @param options - Additional options (logger, callbacks)
 * @returns A cache provider instance
 *
 * @example
 * ```ts
 * // Memory cache
 * const memoryCache = createCache({
 *   provider: 'memory',
 *   maxSize: 1000,
 *   defaultTtl: 60000
 * });
 *
 * // Redis cache
 * const redisCache = createCache({
 *   provider: 'redis',
 *   url: 'redis://localhost:6379'
 * });
 * await (redisCache as RedisCacheProvider).connect();
 * ```
 */
export function createCache(config: CacheConfig, options: CreateCacheOptions = {}): CacheProvider {
  switch (config.provider) {
    case 'memory':
      return new MemoryCacheProvider(config, options);

    case 'redis':
      return new RedisCacheProvider(config, options);

    default:
      // TypeScript exhaustiveness check
      return assertNever(config);
  }
}

/**
 * Helper for exhaustiveness checking.
 */
function assertNever(value: never): never {
  throw new CacheProviderNotFoundError(
    (value as { provider?: string }).provider ?? 'unknown',
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a memory cache with common defaults.
 *
 * @param overrides - Configuration overrides
 * @param options - Additional options
 */
export function createMemoryCache(
  overrides: Partial<Omit<CacheConfig & { provider: 'memory' }, 'provider'>> = {},
  options: CreateCacheOptions = {},
): MemoryCacheProvider {
  return new MemoryCacheProvider(
    {
      provider: 'memory',
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      ...overrides,
    },
    options,
  );
}

/**
 * Create a Redis cache with common defaults.
 * Note: You must call `.connect()` before using the cache.
 *
 * @param url - Redis connection URL
 * @param overrides - Configuration overrides
 * @param options - Additional options
 */
export function createRedisCache(
  url: string,
  overrides: Partial<Omit<CacheConfig & { provider: 'redis' }, 'provider' | 'url'>> = {},
  options: CreateCacheOptions = {},
): RedisCacheProvider {
  return new RedisCacheProvider(
    {
      provider: 'redis',
      url,
      connectTimeout: 5000,
      commandTimeout: 5000,
      retryStrategy: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 3000,
      },
      ...overrides,
    },
    options,
  );
}

/**
 * Create a cache from environment configuration.
 *
 * @param options - Additional options
 * @returns A cache provider based on CACHE_PROVIDER env var (defaults to memory)
 */
export function createCacheFromEnv(options: CreateCacheOptions = {}): CacheProvider {
  const provider = process.env['CACHE_PROVIDER'] ?? 'memory';
  const redisUrl = process.env['REDIS_URL'];
  const keyPrefix = process.env['CACHE_KEY_PREFIX'] ?? '';
  const defaultTtl = parseInt(process.env['CACHE_DEFAULT_TTL'] ?? '300000', 10);
  const maxSize = parseInt(process.env['CACHE_MAX_SIZE'] ?? '1000', 10);

  if (provider === 'redis' && redisUrl) {
    return createRedisCache(
      redisUrl,
      {
        keyPrefix,
        defaultTtl,
        db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
        tls: process.env['REDIS_TLS'] === 'true',
      },
      options,
    );
  }

  return createMemoryCache(
    {
      keyPrefix,
      defaultTtl,
      maxSize,
    },
    options,
  );
}
