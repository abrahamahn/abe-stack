// src/server/engine/src/cache/factory.ts
import { loadCacheConfig } from './config';
import { MemoryCacheProvider } from './providers/memory';

import type { CacheConfig, CreateCacheOptions } from './types';

/**
 * Create a cache instance based on configuration
 */
export function createCache(
  config: Partial<CacheConfig> = {},
  options: CreateCacheOptions = {},
): MemoryCacheProvider {
  // Currently only memory provider is supported
  return createMemoryCache(config, options);
}

/**
 * Create a cache instance from environment variables
 */
export function createCacheFromEnv(options: CreateCacheOptions = {}): MemoryCacheProvider {
  const config = loadCacheConfig();
  return createCache(config, options);
}

/**
 * Create a simple memory cache
 */
export function createMemoryCache(
  config: Partial<CacheConfig> = {},
  options: CreateCacheOptions = {},
): MemoryCacheProvider {
  return new MemoryCacheProvider(
    {
      provider: 'memory',
      maxSize: config.maxSize ?? 1000,
      defaultTtl: config.defaultTtl ?? 300000,
      ...config,
    },
    options,
  );
}
