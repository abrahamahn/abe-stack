// apps/server/src//__tests__/auth..test.ts
import { describe, expect, test } from 'vitest';

import { getRefreshCookieOptions, isStrategyEnabled, loadAuth } from '@/auth.';

import type { Auth } from '@';

const apiBaseUrl = 'http://localhost:8080';
const load = (env: Record<string, string | undefined>) => loadAuth(env, apiBaseUrl);

describe('Auth uration', () => {
  describe('loadAuth', () => {
    test('should load default values when no env vars set', () => {
      const  = load({});

      expect(.strategies).toEqual(['local']);
      expect(.jwt.secret).toBe('');
      expect(.jwt.accessTokenExpiry).toBe('15m');
      expect(.jwt.issuer).toBe('abe-stack');
      expect(.jwt.audience).toBe('abe-stack-api');
    });

    test('should parse JWT settings from env', () => {
      const env = {
        JWT_SECRET: 'super-secret-key',
        ACCESS_TOKEN_EXPIRY: '30m',
        JWT_ISSUER: 'my-app',
        JWT_AUDIENCE: 'my-api',
      };

      const  = load(env);

      expect(.jwt.secret).toBe('super-secret-key');
      expect(.jwt.accessTokenExpiry).toBe('30m');
      expect(.jwt.issuer).toBe('my-app');
      expect(.jwt.audience).toBe('my-api');
    });

    test('should parse refresh token settings', () => {
      const env = {
        REFRESH_TOKEN_EXPIRY_DAYS: '30',
        REFRESH_TOKEN_GRACE_PERIOD: '60',
      };

      const  = load(env);

      expect(.refreshToken.expiryDays).toBe(30);
      expect(.refreshToken.gracePeriodSeconds).toBe(60);
    });

    test('should use default Argon2 settings', () => {
      const  = load({});

      expect(.argon2.type).toBe(2); // argon2id
      expect(.argon2.memoryCost).toBe(19456); // 19 MiB
      expect(.argon2.timeCost).toBe(2);
      expect(.argon2.parallelism).toBe(1);
    });

    test('should parse password policy settings', () => {
      const env = {
        PASSWORD_MIN_LENGTH: '12',
        PASSWORD_MAX_LENGTH: '128',
        PASSWORD_MIN_SCORE: '4',
      };

      const  = load(env);

      expect(.password.minLength).toBe(12);
      expect(.password.maxLength).toBe(128);
      expect(.password.minZxcvbnScore).toBe(4);
    });

    test('should parse lockout settings', () => {
      const env = {
        LOCKOUT_MAX_ATTEMPTS: '5',
        LOCKOUT_DURATION_MS: '3600000',
      };

      const  = load(env);

      expect(.lockout.maxAttempts).toBe(5);
      expect(.lockout.lockoutDurationMs).toBe(3600000);
      expect(.lockout.progressiveDelay).toBe(true);
      expect(.lockout.baseDelayMs).toBe(1000);
    });

    test('should parse BFF mode', () => {
      expect(load({ AUTH_BFF_MODE: 'true' }).bffMode).toBe(true);
      expect(load({ AUTH_BFF_MODE: 'false' }).bffMode).toBe(false);
      expect(load({}).bffMode).toBe(false);
    });

    test('should parse proxy settings', () => {
      const env = {
        TRUST_PROXY: 'true',
        TRUSTED_PROXIES: '192.168.1.1, 10.0.0.1',
        MAX_PROXY_DEPTH: '2',
      };

      const  = load(env);

      expect(.proxy.trustProxy).toBe(true);
      expect(.proxy.trustedProxies).toEqual(['192.168.1.1', '10.0.0.1']);
      expect(.proxy.maxProxyDepth).toBe(2);
    });

    test('should have stricter rate limits in production', () => {
      const dev = load({ NODE_ENV: 'development' });
      const prod = load({ NODE_ENV: 'production' });

      expect(dev.rateLimit.login.max).toBe(100);
      expect(prod.rateLimit.login.max).toBe(5);

      expect(dev.rateLimit.register.max).toBe(100);
      expect(prod.rateLimit.register.max).toBe(3);
    });

    test('should ure cookie settings based on environment', () => {
      const dev = load({ NODE_ENV: 'development' });
      const prod = load({ NODE_ENV: 'production' });

      expect(dev.cookie.secure).toBe(false);
      expect(dev.cookie.sameSite).toBe('lax');

      expect(prod.cookie.secure).toBe(true);
      expect(prod.cookie.sameSite).toBe('strict');
    });

    test('should use COOKIE_SECRET if provided, fallback to JWT_SECRET', () => {
      const withCookieSecret = load({
        JWT_SECRET: 'jwt-secret',
        COOKIE_SECRET: 'cookie-secret',
      });
      const withoutCookieSecret = load({
        JWT_SECRET: 'jwt-secret',
      });

      expect(withCookieSecret.cookie.secret).toBe('cookie-secret');
      expect(withoutCookieSecret.cookie.secret).toBe('jwt-secret');
    });

    test('should ure Google OAuth when env vars present', () => {
      const env = {
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GOOGLE_CALLBACK_URL: '/custom/callback',
      };

      const  = load(env);

      expect(.oauth.google).toEqual({
        clientId: 'google-client-id',
        clientSecret: 'google-secret',
        callbackUrl: '/custom/callback',
      });
    });

    test('should not include OAuth provider without client ID', () => {
      const  = load({});

      expect(.oauth.google).toBeUndefined();
      expect(.oauth.github).toBeUndefined();
    });

    test('should ure GitHub OAuth with defaults', () => {
      const env = {
        GITHUB_CLIENT_ID: 'github-client-id',
      };

      const  = load(env);

      expect(.oauth.github).toEqual({
        clientId: 'github-client-id',
        clientSecret: '',
        callbackUrl: '/api/auth/oauth/github/callback',
      });
    });

    test('should ure Microsoft OAuth with tenant ID', () => {
      const env = {
        MICROSOFT_CLIENT_ID: 'ms-client-id',
        MICROSOFT_CLIENT_SECRET: 'ms-secret',
        MICROSOFT_TENANT_ID: 'my-tenant',
      };

      const  = load(env);

      expect(.oauth.microsoft).toEqual({
        clientId: 'ms-client-id',
        clientSecret: 'ms-secret',
        callbackUrl: '/api/auth/oauth/microsoft/callback',
        tenantId: 'my-tenant',
      });
    });

    test('should parse magic link settings', () => {
      const env = {
        MAGIC_LINK_EXPIRY_MINUTES: '30',
        MAGIC_LINK_MAX_ATTEMPTS: '5',
      };

      const  = load(env);

      expect(.magicLink.tokenExpiryMinutes).toBe(30);
      expect(.magicLink.maxAttempts).toBe(5);
    });

    test('should parse TOTP settings', () => {
      const env = {
        TOTP_ISSUER: 'My App',
        TOTP_WINDOW: '2',
      };

      const  = load(env);

      expect(.totp.issuer).toBe('My App');
      expect(.totp.window).toBe(2);
    });
  });

  describe('parseStrategies', () => {
    test('should parse comma-separated strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,magic,google' };
      const  = load(env);

      expect(.strategies).toEqual(['local', 'magic', 'google']);
    });

    test('should handle whitespace in strategies', () => {
      const env = { AUTH_STRATEGIES: ' local , magic , github ' };
      const  = load(env);

      expect(.strategies).toEqual(['local', 'magic', 'github']);
    });

    test('should filter out invalid strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,invalid,google,fake' };
      const  = load(env);

      expect(.strategies).toEqual(['local', 'google']);
    });

    test('should be case insensitive', () => {
      const env = { AUTH_STRATEGIES: 'LOCAL,Magic,GOOGLE' };
      const  = load(env);

      expect(.strategies).toEqual(['local', 'magic', 'google']);
    });

    test('should accept all valid strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,magic,webauthn,google,github,facebook,microsoft' };
      const  = load(env);

      expect(.strategies).toHaveLength(7);
    });
  });

  describe('isStrategyEnabled', () => {
    test('should return true for enabled strategy', () => {
      const : Auth = load({ AUTH_STRATEGIES: 'local,magic' });

      expect(isStrategyEnabled(, 'local')).toBe(true);
      expect(isStrategyEnabled(, 'magic')).toBe(true);
    });

    test('should return false for disabled strategy', () => {
      const : Auth = load({ AUTH_STRATEGIES: 'local' });

      expect(isStrategyEnabled(, 'google')).toBe(false);
      expect(isStrategyEnabled(, 'github')).toBe(false);
    });
  });

  describe('getRefreshCookieOptions', () => {
    test('should return correct cookie options', () => {
      const : Auth = load({
        REFRESH_TOKEN_EXPIRY_DAYS: '7',
      });

      const options = getRefreshCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    test('should calculate maxAge correctly for different expiry days', () => {
      const 14Days = load({ REFRESH_TOKEN_EXPIRY_DAYS: '14' });
      const 30Days = load({ REFRESH_TOKEN_EXPIRY_DAYS: '30' });

      expect(getRefreshCookieOptions(14Days).maxAge).toBe(14 * 24 * 60 * 60);
      expect(getRefreshCookieOptions(30Days).maxAge).toBe(30 * 24 * 60 * 60);
    });

    test('should use secure and sameSite from ', () => {
      const prod = load({ NODE_ENV: 'production' });
      const dev = load({ NODE_ENV: 'development' });

      const prodOptions = getRefreshCookieOptions(prod);
      const devOptions = getRefreshCookieOptions(dev);

      expect(prodOptions.secure).toBe(true);
      expect(prodOptions.sameSite).toBe('strict');

      expect(devOptions.secure).toBe(false);
      expect(devOptions.sameSite).toBe('lax');
    });
  });
});
