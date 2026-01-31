// infra/cache/src/config.ts
import type { CacheConfig, FullEnv } from '@abe-stack/core/config';

/**
 * Load Cache Configuration.
 *
 * Determines if the application uses:
 * - **Memory Cache**: Simple LRU map (good for single-instance).
 * - **Redis**: Specific external cache (required for horizontal scaling/clusters).
 *
 * @param env - Environment variable map
 * @returns Complete cache configuration
 * @complexity O(1)
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
    config.externalConfig = {
      host: env.REDIS_HOST !== '' ? env.REDIS_HOST : 'localhost',
      port: env.REDIS_PORT,
    };
  }

  return config;
}

/** Default cache configuration for development */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300000,
  maxSize: 1000,
  useExternalProvider: false,
};
