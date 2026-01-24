// apps/server/src/config/infra/cache.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CACHE_CONFIG, loadCacheConfig } from './cache';

describe('Cache Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {} as unknown as FullEnv;
    const config = loadCacheConfig(env);

    expect(config).toEqual({
      ttl: 300000,
      maxSize: 1000,
      useExternalProvider: false,
    });
  });

  it('loads custom configuration from environment variables', () => {
    const env = {
      CACHE_TTL_MS: 600000,
      CACHE_MAX_SIZE: 2000,
      CACHE_USE_REDIS: 'true',
      REDIS_HOST: 'my-redis-host',
      REDIS_PORT: 6380,
    } as unknown as FullEnv;

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

  it('loads custom configuration with redis disabled', () => {
    const env = {
      CACHE_TTL_MS: 120000,
      CACHE_MAX_SIZE: 500,
      // Not setting CACHE_USE_REDIS means it's undefined, so externalConfig won't be set
    } as unknown as FullEnv;

    const config = loadCacheConfig(env);

    expect(config).toEqual({
      ttl: 120000,
      maxSize: 500,
      useExternalProvider: false,
    });
  });

  it('uses default redis config when redis is enabled but host/port not specified', () => {
    const env = {
      CACHE_USE_REDIS: 'true',
    } as unknown as FullEnv;

    const config = loadCacheConfig(env);

    expect(config.useExternalProvider).toBe(true);
    expect(config.externalConfig).toEqual({
      host: 'localhost',
      port: 6379,
    });
  });

  it('defaults to false for useExternalProvider when not specified', () => {
    const env = {} as unknown as FullEnv;
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
