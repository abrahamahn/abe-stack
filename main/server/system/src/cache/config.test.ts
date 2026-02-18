// main/server/system/src/cache/config.test.ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_CACHE_CONFIG, loadCacheConfig } from './config';

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const prev = { ...process.env };
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) {
        Reflect.deleteProperty(process.env, k);
      } else {
        process.env[k] = v;
      }
    }
    fn();
  } finally {
    process.env = prev;
  }
}

describe('cache/config', () => {
  it('exports sane defaults', () => {
    expect(DEFAULT_CACHE_CONFIG.provider).toBe('memory');
    expect(DEFAULT_CACHE_CONFIG.maxSize).toBeGreaterThan(0);
    expect(DEFAULT_CACHE_CONFIG.defaultTtl).toBeGreaterThan(0);
  });

  it('loads defaults when env vars are missing/empty', () => {
    withEnv(
      {
        CACHE_PROVIDER: undefined,
        CACHE_MAX_SIZE: undefined,
        CACHE_TTL_MS: undefined,
      },
      () => {
        expect(loadCacheConfig()).toEqual(DEFAULT_CACHE_CONFIG);
      },
    );

    withEnv(
      {
        CACHE_PROVIDER: '',
        CACHE_MAX_SIZE: '',
        CACHE_TTL_MS: '',
      },
      () => {
        expect(loadCacheConfig()).toEqual(DEFAULT_CACHE_CONFIG);
      },
    );
  });

  it('parses numeric env vars and selects redis provider when configured', () => {
    withEnv(
      {
        CACHE_PROVIDER: 'redis',
        CACHE_MAX_SIZE: '123',
        CACHE_TTL_MS: '456',
      },
      () => {
        expect(loadCacheConfig()).toEqual({
          provider: 'redis',
          host: 'localhost',
          port: 6379,
          maxSize: 123,
          defaultTtl: 456,
        });
      },
    );
  });
});
