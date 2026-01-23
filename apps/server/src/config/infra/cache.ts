// apps/server/src/config/infra/cache.ts
import { getBool, getInt } from '@abe-stack/core/config/utils';
import type { CacheConfig } from '@abe-stack/core/contracts/config';

/**
 * Loads Caching configuration.
 * Supports local memory caching with placeholders for external providers (Redis).
 */
export function loadCacheConfig(env: Record<string, string | undefined>): CacheConfig {
  return {
    // Infrastructure Layer
    ttl: getInt(env.CACHE_TTL_MS, 300000), // Default 5 minutes
    maxSize: getInt(env.CACHE_MAX_SIZE, 1000),

    // Placeholder for scaling to Pro/Enterprise tiers
    useExternalProvider: getBool(env.CACHE_USE_REDIS),
    externalConfig: env.CACHE_USE_REDIS
      ? {
          host: env.REDIS_HOST || 'localhost',
          port: getInt(env.REDIS_PORT, 6379),
        }
      : undefined,
  };
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300000,
  maxSize: 1000,
  useExternalProvider: false,
};
