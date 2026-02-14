// main/server/engine/src/cache/factory.ts
import { loadCacheConfig } from './config';
import { MemoryCacheProvider } from './providers/memory';
import { createRedisProvider } from './providers/redis';

import type { RedisCacheProvider } from './providers/redis';
import type { CacheConfig, CacheProvider, CreateCacheOptions, RedisCacheConfig } from './types';

/**
 * App-level cache config (from infra config, not the provider config).
 * Matches the shape passed from infrastructure.ts.
 */
interface AppCacheConfig {
  ttl?: number;
  maxSize?: number;
  useExternalProvider?: boolean;
  externalConfig?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    tls?: boolean;
  };
}

/**
 * Create a cache instance based on configuration.
 *
 * Accepts either:
 * - Provider-level config (MemoryCacheConfig | RedisCacheConfig)
 * - App-level config (from infra config with useExternalProvider flag)
 */
export function createCache(
  config: Partial<CacheConfig> | AppCacheConfig = {},
  options: CreateCacheOptions = {},
): CacheProvider {
  // Check if it's a provider-level config with explicit provider field
  if ('provider' in config && config.provider === 'redis') {
    return createRedisCache(config as RedisCacheConfig, options);
  }

  // Check app-level config for Redis
  const appConfig = config as AppCacheConfig;
  if (appConfig.useExternalProvider === true && appConfig.externalConfig !== undefined) {
    const ext = appConfig.externalConfig;
    const redisConfig: RedisCacheConfig = {
      provider: 'redis',
      host: ext.host,
      port: ext.port,
    };
    if (ext.password !== undefined) redisConfig.password = ext.password;
    if (ext.db !== undefined) redisConfig.db = ext.db;
    if (ext.tls !== undefined) redisConfig.tls = ext.tls;
    if (appConfig.maxSize !== undefined) redisConfig.maxSize = appConfig.maxSize;
    if (appConfig.ttl !== undefined) redisConfig.defaultTtl = appConfig.ttl;
    return createRedisCache(redisConfig, options);
  }

  // Default to memory
  return createMemoryCache(config as Partial<CacheConfig>, options);
}

/**
 * Create a cache instance from environment variables.
 */
export function createCacheFromEnv(options: CreateCacheOptions = {}): CacheProvider {
  const config = loadCacheConfig();
  return createCache(config, options);
}

/**
 * Create a memory cache provider.
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
    },
    options,
  );
}

/**
 * Create a Redis cache provider.
 */
export function createRedisCache(
  config: RedisCacheConfig,
  options: CreateCacheOptions = {},
): RedisCacheProvider {
  return createRedisProvider(config, options);
}
