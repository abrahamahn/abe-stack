// apps/server/src/config/auth/auth.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getRefreshCookieOptions, loadAuth } from '../auth';

const apiBaseUrl = 'http://localhost:8080';
const load = (env: unknown) => loadAuth(env as FullEnv, apiBaseUrl);

describe('Auth Configuration', () => {
  beforeEach(() => {
    // Premium Move: Wipe the env before each test to ensure 100% isolation
    vi.unstubAllEnvs();
  });

  test('should load default values when no env vars set', () => {
    const config = load({ JWT_SECRET: 'a-very-secure-secret-key-at-least-32-chars!' });
    expect(config.strategies).toEqual(['local']);
    expect(config.jwt.secret).toBe('a-very-secure-secret-key-at-least-32-chars!');
    expect(config.jwt.issuer).toBe('abe-stack');
  });

  test('should parse proxy settings', () => {
    // Explicitly stubbing the env for this specific test
    vi.stubEnv('JWT_SECRET', 'a-very-secure-secret-key-at-least-32-chars!');
    vi.stubEnv('TRUST_PROXY', 'true');
    vi.stubEnv('TRUSTED_PROXIES', '192.168.1.1, 10.0.0.1');

    // cast process.env
    const config = load(process.env);
    expect(config.proxy.trustProxy).toBe(true);
  });

  test('should have stricter rate limits in production', () => {
    const dev = load({
      NODE_ENV: 'development',
      JWT_SECRET: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    const prod = load({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    expect(dev.rateLimit.login.max).toBe(100);
    expect(prod.rateLimit.login.max).toBe(5);
  });
});

describe('parseStrategies', () => {
  test('should handle whitespace and filter invalid strategies', () => {
    const env = {
      AUTH_STRATEGIES: ' local , magic , invalid_provider ',
      JWT_SECRET: 'a-very-secure-secret-key-at-least-32-chars!',
    };
    const config = load(env);
    expect(config.strategies).toEqual(['local', 'magic']);
  });
});

describe('getRefreshCookieOptions', () => {
  test('should return correct cookie options in milliseconds', () => {
    const config = load({
      REFRESH_TOKEN_EXPIRY_DAYS: 7,
      JWT_SECRET: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    const options = getRefreshCookieOptions(config);

    expect(options.httpOnly).toBe(true);
    // Fixed: 7 days * 24h * 60m * 60s * 1000ms
    expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
