// apps/server/src/config/auth/auth.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
    getRefreshCookieOptions,
    isStrategyEnabled,
    loadAuthConfig,
    validateAuthConfig,
} from './auth';

import type { FullEnv } from '@abe-stack/core/config';


const apiBaseUrl = 'http://localhost:8080';
const load = (env: unknown) => loadAuthConfig(env as FullEnv, apiBaseUrl);

describe('Auth Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test('should load default values when no env vars set', () => {
    const config = load({ ['JWT_SECRET']: 'a-very-secure-secret-key-at-least-32-chars!' });
    expect(config.strategies).toEqual(['local']);
    expect(config.jwt.secret).toBe('a-very-secure-secret-key-at-least-32-chars!');
    expect(config.jwt.issuer).toBe('abe-stack');
  });

  test('should parse proxy settings', () => {
    vi.stubEnv('JWT_SECRET', 'a-very-secure-secret-key-at-least-32-chars!');
    vi.stubEnv('TRUST_PROXY', 'true');
    vi.stubEnv('TRUSTED_PROXIES', '192.168.1.1, 10.0.0.1');

    const config = load(process.env);
    expect(config.proxy.trustProxy).toBe(true);
  });

  test('should have stricter rate limits in production', () => {
    const dev = load({
      ['NODE_ENV']: 'development',
      ['JWT_SECRET']: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    const prod = load({
      ['NODE_ENV']: 'production',
      ['JWT_SECRET']: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    expect(dev.rateLimit.login.max).toBe(100);
    expect(prod.rateLimit.login.max).toBe(5);
  });
});

describe('parseStrategies', () => {
  test('should handle whitespace and filter invalid strategies', () => {
    const env = {
      ['AUTH_STRATEGIES']: ' local , magic , invalid_provider ',
      ['JWT_SECRET']: 'a-very-secure-secret-key-at-least-32-chars!',
    };
    const config = load(env);
    expect(config.strategies).toEqual(['local', 'magic']);
  });
});

describe('getRefreshCookieOptions', () => {
  test('should return correct cookie options in milliseconds', () => {
    const config = load({
      ['REFRESH_TOKEN_EXPIRY_DAYS']: 7,
      ['JWT_SECRET']: 'a-very-secure-secret-key-at-least-32-chars!',
    });
    const options = getRefreshCookieOptions(config);

    expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('Security Validation', () => {
  const baseValidConfig = () =>
    load({
      ['JWT_SECRET']: 'long-enough-secret-key-32-characters-minimum',
      ['COOKIE_SECRET']: 'another-long-enough-secret-32-characters',
    });

  test('should throw if JWT secret is too short', () => {
    const config = baseValidConfig();
    (config.jwt as any).secret = 'short';

    expect(() => { validateAuthConfig(config); }).toThrow(/JWT secret must be at least 32 characters/);
  });

  test('should throw if JWT secret is a weak value', () => {
    const config = baseValidConfig();
    (config.jwt as any).secret = 'password' + ' '.repeat(24);

    expect(() => { validateAuthConfig(config); }).toThrow(/JWT secret is a weak value/);
  });

  test('should throw if password minLength is too small', () => {
    const config = baseValidConfig();
    (config.password as any).minLength = 6;

    expect(() => { validateAuthConfig(config); }).toThrow(
      /Min password length must be at least 8 characters/,
    );
  });

  test('should throw if lockout duration is too short', () => {
    const config = baseValidConfig();
    (config.lockout as any).lockoutDurationMs = 30000;

    expect(() => { validateAuthConfig(config); }).toThrow(/Lockout duration must be at least 60000ms/);
  });
});

describe('isStrategyEnabled', () => {
  test('should correctly identify enabled strategies', () => {
    const config = load({
      ['AUTH_STRATEGIES']: 'local,google',
      ['JWT_SECRET']: 'long-enough-secret-key-32-characters-minimum',
    });

    expect(isStrategyEnabled(config, 'local')).toBe(true);
    expect(isStrategyEnabled(config, 'google')).toBe(true);
    expect(isStrategyEnabled(config, 'magic')).toBe(false);
  });
});
