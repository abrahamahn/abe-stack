// main/apps/server/src/config/infra/cache.ts
import { MS_PER_MINUTE } from '@bslt/shared';

import type { CacheConfig, FullEnv } from '@bslt/shared/config';

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

  const config: CacheConfig = {
    ttl: env.CACHE_TTL_MS,
    maxSize: env.CACHE_MAX_SIZE,
    useExternalProvider: useExternal,
  };

  if (useExternal) {
    const extConfig: { host: string; port: number; password?: string; db?: number } = {
      host: env.REDIS_HOST !== '' ? env.REDIS_HOST : 'localhost',
      port: env.REDIS_PORT,
    };
    if (env.REDIS_PASSWORD !== undefined) extConfig.password = env.REDIS_PASSWORD;
    if (env.REDIS_DB !== undefined) extConfig.db = env.REDIS_DB;
    config.externalConfig = extConfig;
  }

  return config;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * MS_PER_MINUTE,
  maxSize: 1000,
  useExternalProvider: false,
};
