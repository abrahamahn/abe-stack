// apps/server/src/config/infra/cache.ts
import type { CacheConfig, FullEnv } from '@abe-stack/core/config';

/**
 * Loads Caching configuration.
 * Supports local memory caching with placeholders for external providers (Redis).
 */
/**
 * Load Cache Configuration.
 *
 * Determines if the application uses:
 * - **Memory Cache**: Simple LRU map (good for single-instance).
 * - **Redis**: specific external cache (required for horizontal scaling/clusters).
 */
export function loadCacheConfig(env: FullEnv): CacheConfig {
  const provider = env.CACHE_PROVIDER ?? (env.CACHE_USE_REDIS === 'true' ? 'redis' : 'local');
  const useExternal = provider === 'redis';

  return {
    ttl: env.CACHE_TTL_MS ?? 300000,
    maxSize: env.CACHE_MAX_SIZE ?? 1000,
    useExternalProvider: useExternal,
    externalConfig: useExternal
      ? {
          host: env.REDIS_HOST || 'localhost',
          port: env.REDIS_PORT ?? 6379,
        }
      : undefined,
  };
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300000,
  maxSize: 1000,
  useExternalProvider: false,
};
