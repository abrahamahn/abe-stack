// main/server/engine/src/cache/config.ts
import { MS_PER_MINUTE } from '@abe-stack/shared';

import type { CacheConfig, RedisCacheConfig } from './types';

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  provider: 'memory',
  maxSize: 1000,
  defaultTtl: 5 * MS_PER_MINUTE, // 5 minutes
};

/** Read an env var, returning undefined for empty strings */
function envString(key: string): string | undefined {
  const val = process.env[key];
  return val !== undefined && val !== '' ? val : undefined;
}

function envInt(key: string): number | undefined {
  const val = envString(key);
  return val !== undefined ? parseInt(val, 10) : undefined;
}

/**
 * Load cache configuration from environment variables.
 * Selects provider based on CACHE_PROVIDER env var.
 */
export function loadCacheConfig(): CacheConfig {
  if (process.env['CACHE_PROVIDER'] === 'redis') {
    const config: RedisCacheConfig = {
      provider: 'redis',
      host: envString('REDIS_HOST') ?? 'localhost',
      port: envInt('REDIS_PORT') ?? 6379,
      maxSize: envInt('CACHE_MAX_SIZE') ?? 1000,
      defaultTtl: envInt('CACHE_TTL_MS') ?? 5 * MS_PER_MINUTE,
    };

    const password = envString('REDIS_PASSWORD');
    if (password !== undefined) config.password = password;

    const db = envInt('REDIS_DB');
    if (db !== undefined) config.db = db;

    return config;
  }

  return {
    provider: 'memory',
    maxSize: envInt('CACHE_MAX_SIZE') ?? 1000,
    defaultTtl: envInt('CACHE_TTL_MS') ?? 5 * MS_PER_MINUTE,
  };
}
