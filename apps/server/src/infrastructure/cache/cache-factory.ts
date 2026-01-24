// apps/server/src/infrastructure/cache/cache-factory.ts
/**
 * Cache Factory
 *
 * Factory function to create cache providers based on configuration.
 */

import { MemoryCacheProvider } from './memory-provider';

import type { CreateCacheOptions } from './types';
import type { CacheProvider, MemoryCacheConfig } from '@abe-stack/core';

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
 * @param options - Additional options
 * @returns A memory cache provider configured from environment
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
