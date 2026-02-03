// apps/server/src/config/infra/cache.test.ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_CACHE_CONFIG, loadCacheConfig } from './cache';

import type { FullEnv } from '@abe-stack/shared/config';

/**
 * Creates a base environment with cache-related defaults (as applied by Zod schema).
 * Used to simulate properly parsed FullEnv in tests.
 */
function createBaseEnv(overrides: Partial<FullEnv> = {}): FullEnv {
  return {
    CACHE_TTL_MS: 300000,
    CACHE_MAX_SIZE: 1000,
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    ...overrides,
  } as unknown as FullEnv;
}

describe('Cache Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = createBaseEnv();
    const config = loadCacheConfig(env);

    expect(config).toEqual({
      ttl: 300000,
      maxSize: 1000,
      useExternalProvider: false,
    });
  });

  it('loads custom configuration from environment variables', () => {
    const env = createBaseEnv({
      CACHE_TTL_MS: 600000,
      CACHE_MAX_SIZE: 2000,
      CACHE_USE_REDIS: 'true',
      REDIS_HOST: 'my-redis-host',
      REDIS_PORT: 6380,
    });

    const config = loadCacheConfig(env);

    expect(config).toEqual({
      ttl: 600000,
      maxSize: 2000,
      useExternalProvider: true,
      externalConfig: {
        host: 'my-redis-host',
        port: 6380,
      },
    });
  });

  it('prioritizes CACHE_PROVIDER=redis over CACHE_USE_REDIS=false', () => {
    const env = createBaseEnv({
      CACHE_PROVIDER: 'redis',
      CACHE_USE_REDIS: 'false',
    });

    const config = loadCacheConfig(env);
    expect(config.useExternalProvider).toBe(true);
  });

  it('supports CACHE_PROVIDER=local explicitly', () => {
    const env = createBaseEnv({
      CACHE_PROVIDER: 'local',
      CACHE_USE_REDIS: 'true',
    });

    const config = loadCacheConfig(env);
    expect(config.useExternalProvider).toBe(false);
  });

  it('uses default redis config when redis is enabled but host/port not specified', () => {
    const env = createBaseEnv({
      CACHE_USE_REDIS: 'true',
    });

    const config = loadCacheConfig(env);

    expect(config.useExternalProvider).toBe(true);
    expect(config.externalConfig).toEqual({
      host: 'localhost',
      port: 6379,
    });
  });

  it('defaults to false for useExternalProvider when not specified', () => {
    const env = createBaseEnv();
    const config = loadCacheConfig(env);

    expect(config.useExternalProvider).toBe(false);
  });

  it('exports default configuration constants', () => {
    expect(DEFAULT_CACHE_CONFIG).toBeDefined();
    expect(DEFAULT_CACHE_CONFIG.ttl).toBe(300000);
    expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(1000);
    expect(DEFAULT_CACHE_CONFIG.useExternalProvider).toBe(false);
  });
});
