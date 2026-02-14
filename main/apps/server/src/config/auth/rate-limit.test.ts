// main/apps/server/src/config/auth/rate-limit.test.ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_RATE_LIMIT_CONFIG, loadRateLimitConfig } from './rate-limit';

describe('Rate Limit Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {};
    const config = loadRateLimitConfig(env);

    expect(config).toEqual({
      windowMs: 60000,
      max: 1000,
      cleanupIntervalMs: 60000,
      progressiveDelay: {
        enabled: true,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
      },
    });
  });

  it('loads custom configuration from environment variables in production mode', () => {
    const env = {
      NODE_ENV: 'production',
      RATE_LIMIT_WINDOW_MS: '120000',
      RATE_LIMIT_MAX: '200',
      RATE_LIMIT_CLEANUP_INTERVAL_MS: '120000',
      RATE_LIMIT_PROGRESSIVE_DELAY_ENABLED: 'false',
      RATE_LIMIT_BASE_DELAY_MS: '2000',
      RATE_LIMIT_MAX_DELAY_MS: '20000',
    };

    const config = loadRateLimitConfig(env);

    expect(config).toEqual({
      windowMs: 120000,
      max: 200,
      cleanupIntervalMs: 120000,
      progressiveDelay: {
        enabled: false,
        baseDelay: 2000,
        maxDelay: 20000,
        backoffFactor: 2,
      },
    });
  });

  it('loads custom configuration from environment variables in development mode', () => {
    const env = {
      NODE_ENV: 'development',
      RATE_LIMIT_WINDOW_MS: '30000',
      RATE_LIMIT_MAX: '500',
      RATE_LIMIT_CLEANUP_INTERVAL_MS: '30000',
      RATE_LIMIT_PROGRESSIVE_DELAY_ENABLED: 'true',
      RATE_LIMIT_BASE_DELAY_MS: '500',
      RATE_LIMIT_MAX_DELAY_MS: '5000',
    };

    const config = loadRateLimitConfig(env);

    expect(config).toEqual({
      windowMs: 30000,
      max: 500,
      cleanupIntervalMs: 30000,
      progressiveDelay: {
        enabled: true,
        baseDelay: 500,
        maxDelay: 5000,
        backoffFactor: 2,
      },
    });
  });

  it('uses default max value based on environment', () => {
    // Production
    expect(loadRateLimitConfig({ NODE_ENV: 'production' }).max).toBe(100);

    // Development
    expect(loadRateLimitConfig({ NODE_ENV: 'development' }).max).toBe(1000);
  });

  it('converts string values to numbers correctly', () => {
    const env = {
      RATE_LIMIT_WINDOW_MS: '90000',
      RATE_LIMIT_MAX: '150',
      RATE_LIMIT_CLEANUP_INTERVAL_MS: '90000',
      RATE_LIMIT_BASE_DELAY_MS: '1500',
      RATE_LIMIT_MAX_DELAY_MS: '15000',
    };

    const config = loadRateLimitConfig(env);

    expect(config.windowMs).toBe(90000);
    expect(config.max).toBe(150);
    expect(config.cleanupIntervalMs).toBe(90000);
    expect(config.progressiveDelay!.baseDelay).toBe(1500);
    expect(config.progressiveDelay!.maxDelay).toBe(15000);
  });

  it('defaults to true for progressive delay when not specified', () => {
    const env = {
      RATE_LIMIT_PROGRESSIVE_DELAY_ENABLED: undefined,
    };

    const config = loadRateLimitConfig(env);
    expect(config.progressiveDelay!.enabled).toBe(true);
  });

  it('exports default configuration constants', () => {
    expect(DEFAULT_RATE_LIMIT_CONFIG).toBeDefined();
    expect(DEFAULT_RATE_LIMIT_CONFIG.windowMs).toBe(60000);
    expect(DEFAULT_RATE_LIMIT_CONFIG.max).toBe(100);
    expect(DEFAULT_RATE_LIMIT_CONFIG.cleanupIntervalMs).toBe(60000);
  });
});
