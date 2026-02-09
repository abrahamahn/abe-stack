// src/server/engine/src/cache/config.ts
import type { CacheConfig } from './types';

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  provider: 'memory',
  maxSize: 1000,
  defaultTtl: 300000, // 5 minutes
};

/**
 * Load cache configuration from environment variables
 */
export function loadCacheConfig(): CacheConfig {
  const providerEnv = process.env['CACHE_PROVIDER'];
  const provider: CacheConfig['provider'] = providerEnv === 'memory' ? 'memory' : 'memory';

  const maxSizeEnv = process.env['CACHE_MAX_SIZE'];
  const maxSize = maxSizeEnv !== undefined && maxSizeEnv !== '' ? parseInt(maxSizeEnv, 10) : 1000;

  const ttlEnv = process.env['CACHE_TTL_MS'];
  const defaultTtl = ttlEnv !== undefined && ttlEnv !== '' ? parseInt(ttlEnv, 10) : 300000;

  return {
    provider,
    maxSize,
    defaultTtl,
  };
}
