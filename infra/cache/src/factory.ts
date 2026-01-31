// infra/cache/src/factory.ts
/**
 * Cache Factory
 *
 * Factory functions to create cache providers based on configuration.
 */

import { MemoryCacheProvider } from './providers/memory';

import type { CacheProvider, CreateCacheOptions, MemoryCacheConfig } from './types';

// ============================================================================
// Factory Functions
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
 * const cache = createCache({
 *   provider: 'memory',
 *   maxSize: 1000,
 *   defaultTtl: 60000
 * });
 * ```
 */
export function createCache(
  config: MemoryCacheConfig,
  options: CreateCacheOptions = {},
): CacheProvider {
  return new MemoryCacheProvider(config, options);
}

/**
 * Create a memory cache with common defaults.
 *
 * @param overrides - Configuration overrides
 * @param options - Additional options
 * @returns A memory cache provider instance
 *
 * @example
 * ```ts
 * const cache = createMemoryCache({ maxSize: 500 });
 * ```
 */
export function createMemoryCache(
  overrides: Partial<Omit<MemoryCacheConfig, 'provider'>> = {},
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
 * Create a cache from environment configuration.
 *
 * Reads configuration from environment variables:
 * - CACHE_KEY_PREFIX: Prefix for all cache keys
 * - CACHE_DEFAULT_TTL: Default TTL in milliseconds (default: 300000)
 * - CACHE_MAX_SIZE: Maximum number of entries (default: 1000)
 *
 * @param options - Additional options
 * @returns A memory cache provider configured from environment
 *
 * @example
 * ```ts
 * const cache = createCacheFromEnv();
 * ```
 */
export function createCacheFromEnv(options: CreateCacheOptions = {}): CacheProvider {
  const keyPrefix = process.env['CACHE_KEY_PREFIX'] ?? '';
  const defaultTtl = parseInt(process.env['CACHE_DEFAULT_TTL'] ?? '300000', 10);
  const maxSize = parseInt(process.env['CACHE_MAX_SIZE'] ?? '1000', 10);

  return createMemoryCache(
    {
      keyPrefix,
      defaultTtl,
      maxSize,
    },
    options,
  );
}
