// apps/server/src/config/__tests__/auth.config.test.ts
import { describe, expect, test } from 'vitest';

import { getRefreshCookieOptions, isStrategyEnabled, loadAuthConfig } from '@config/auth.config';

import type { AuthConfig } from '@config/auth.config';

describe('Auth Configuration', () => {
  describe('loadAuthConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadAuthConfig({});

      expect(config.strategies).toEqual(['local']);
      expect(config.jwt.secret).toBe('');
      expect(config.jwt.accessTokenExpiry).toBe('15m');
      expect(config.jwt.issuer).toBe('abe-stack');
      expect(config.jwt.audience).toBe('abe-stack-api');
    });

    test('should parse JWT settings from env', () => {
      const env = {
        JWT_SECRET: 'super-secret-key',
        ACCESS_TOKEN_EXPIRY: '30m',
        JWT_ISSUER: 'my-app',
        JWT_AUDIENCE: 'my-api',
      };

      const config = loadAuthConfig(env);

      expect(config.jwt.secret).toBe('super-secret-key');
      expect(config.jwt.accessTokenExpiry).toBe('30m');
      expect(config.jwt.issuer).toBe('my-app');
      expect(config.jwt.audience).toBe('my-api');
    });

    test('should parse refresh token settings', () => {
      const env = {
        REFRESH_TOKEN_EXPIRY_DAYS: '30',
        REFRESH_TOKEN_GRACE_PERIOD: '60',
      };

      const config = loadAuthConfig(env);

      expect(config.refreshToken.expiryDays).toBe(30);
      expect(config.refreshToken.gracePeriodSeconds).toBe(60);
    });

    test('should use default Argon2 settings', () => {
      const config = loadAuthConfig({});

      expect(config.argon2.type).toBe(2); // argon2id
      expect(config.argon2.memoryCost).toBe(19456); // 19 MiB
      expect(config.argon2.timeCost).toBe(2);
      expect(config.argon2.parallelism).toBe(1);
    });

    test('should parse password policy settings', () => {
      const env = {
        PASSWORD_MIN_LENGTH: '12',
        PASSWORD_MAX_LENGTH: '128',
        PASSWORD_MIN_SCORE: '4',
      };

      const config = loadAuthConfig(env);

      expect(config.password.minLength).toBe(12);
      expect(config.password.maxLength).toBe(128);
      expect(config.password.minZxcvbnScore).toBe(4);
    });

    test('should parse lockout settings', () => {
      const env = {
        LOCKOUT_MAX_ATTEMPTS: '5',
        LOCKOUT_DURATION_MS: '3600000',
      };

      const config = loadAuthConfig(env);

      expect(config.lockout.maxAttempts).toBe(5);
      expect(config.lockout.lockoutDurationMs).toBe(3600000);
      expect(config.lockout.progressiveDelay).toBe(true);
      expect(config.lockout.baseDelayMs).toBe(1000);
    });

    test('should parse BFF mode', () => {
      expect(loadAuthConfig({ AUTH_BFF_MODE: 'true' }).bffMode).toBe(true);
      expect(loadAuthConfig({ AUTH_BFF_MODE: 'false' }).bffMode).toBe(false);
      expect(loadAuthConfig({}).bffMode).toBe(false);
    });

    test('should parse proxy settings', () => {
      const env = {
        TRUST_PROXY: 'true',
        TRUSTED_PROXIES: '192.168.1.1, 10.0.0.1',
        MAX_PROXY_DEPTH: '2',
      };

      const config = loadAuthConfig(env);

      expect(config.proxy.trustProxy).toBe(true);
      expect(config.proxy.trustedProxies).toEqual(['192.168.1.1', '10.0.0.1']);
      expect(config.proxy.maxProxyDepth).toBe(2);
    });

    test('should have stricter rate limits in production', () => {
      const devConfig = loadAuthConfig({ NODE_ENV: 'development' });
      const prodConfig = loadAuthConfig({ NODE_ENV: 'production' });

      expect(devConfig.rateLimit.login.max).toBe(100);
      expect(prodConfig.rateLimit.login.max).toBe(5);

      expect(devConfig.rateLimit.register.max).toBe(100);
      expect(prodConfig.rateLimit.register.max).toBe(3);
    });

    test('should configure cookie settings based on environment', () => {
      const devConfig = loadAuthConfig({ NODE_ENV: 'development' });
      const prodConfig = loadAuthConfig({ NODE_ENV: 'production' });

      expect(devConfig.cookie.secure).toBe(false);
      expect(devConfig.cookie.sameSite).toBe('lax');

      expect(prodConfig.cookie.secure).toBe(true);
      expect(prodConfig.cookie.sameSite).toBe('strict');
    });

    test('should use COOKIE_SECRET if provided, fallback to JWT_SECRET', () => {
      const withCookieSecret = loadAuthConfig({
        JWT_SECRET: 'jwt-secret',
        COOKIE_SECRET: 'cookie-secret',
      });
      const withoutCookieSecret = loadAuthConfig({
        JWT_SECRET: 'jwt-secret',
      });

      expect(withCookieSecret.cookie.secret).toBe('cookie-secret');
      expect(withoutCookieSecret.cookie.secret).toBe('jwt-secret');
    });

    test('should configure Google OAuth when env vars present', () => {
      const env = {
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GOOGLE_CALLBACK_URL: '/custom/callback',
      };

      const config = loadAuthConfig(env);

      expect(config.oauth.google).toEqual({
        clientId: 'google-client-id',
        clientSecret: 'google-secret',
        callbackUrl: '/custom/callback',
      });
    });

    test('should not include OAuth provider without client ID', () => {
      const config = loadAuthConfig({});

      expect(config.oauth.google).toBeUndefined();
      expect(config.oauth.github).toBeUndefined();
    });

    test('should configure GitHub OAuth with defaults', () => {
      const env = {
        GITHUB_CLIENT_ID: 'github-client-id',
      };

      const config = loadAuthConfig(env);

      expect(config.oauth.github).toEqual({
        clientId: 'github-client-id',
        clientSecret: '',
        callbackUrl: '/api/auth/oauth/github/callback',
      });
    });

    test('should configure Microsoft OAuth with tenant ID', () => {
      const env = {
        MICROSOFT_CLIENT_ID: 'ms-client-id',
        MICROSOFT_CLIENT_SECRET: 'ms-secret',
        MICROSOFT_TENANT_ID: 'my-tenant',
      };

      const config = loadAuthConfig(env);

      expect(config.oauth.microsoft).toEqual({
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

      const config = loadAuthConfig(env);

      expect(config.magicLink.tokenExpiryMinutes).toBe(30);
      expect(config.magicLink.maxAttempts).toBe(5);
    });

    test('should parse TOTP settings', () => {
      const env = {
        TOTP_ISSUER: 'My App',
        TOTP_WINDOW: '2',
      };

      const config = loadAuthConfig(env);

      expect(config.totp.issuer).toBe('My App');
      expect(config.totp.window).toBe(2);
    });
  });

  describe('parseStrategies', () => {
    test('should parse comma-separated strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,magic,google' };
      const config = loadAuthConfig(env);

      expect(config.strategies).toEqual(['local', 'magic', 'google']);
    });

    test('should handle whitespace in strategies', () => {
      const env = { AUTH_STRATEGIES: ' local , magic , github ' };
      const config = loadAuthConfig(env);

      expect(config.strategies).toEqual(['local', 'magic', 'github']);
    });

    test('should filter out invalid strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,invalid,google,fake' };
      const config = loadAuthConfig(env);

      expect(config.strategies).toEqual(['local', 'google']);
    });

    test('should be case insensitive', () => {
      const env = { AUTH_STRATEGIES: 'LOCAL,Magic,GOOGLE' };
      const config = loadAuthConfig(env);

      expect(config.strategies).toEqual(['local', 'magic', 'google']);
    });

    test('should accept all valid strategies', () => {
      const env = { AUTH_STRATEGIES: 'local,magic,webauthn,google,github,facebook,microsoft' };
      const config = loadAuthConfig(env);

      expect(config.strategies).toHaveLength(7);
    });
  });

  describe('isStrategyEnabled', () => {
    test('should return true for enabled strategy', () => {
      const config: AuthConfig = loadAuthConfig({ AUTH_STRATEGIES: 'local,magic' });

      expect(isStrategyEnabled(config, 'local')).toBe(true);
      expect(isStrategyEnabled(config, 'magic')).toBe(true);
    });

    test('should return false for disabled strategy', () => {
      const config: AuthConfig = loadAuthConfig({ AUTH_STRATEGIES: 'local' });

      expect(isStrategyEnabled(config, 'google')).toBe(false);
      expect(isStrategyEnabled(config, 'github')).toBe(false);
    });
  });

  describe('getRefreshCookieOptions', () => {
    test('should return correct cookie options', () => {
      const config: AuthConfig = loadAuthConfig({
        REFRESH_TOKEN_EXPIRY_DAYS: '7',
      });

      const options = getRefreshCookieOptions(config);

      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    test('should calculate maxAge correctly for different expiry days', () => {
      const config14Days = loadAuthConfig({ REFRESH_TOKEN_EXPIRY_DAYS: '14' });
      const config30Days = loadAuthConfig({ REFRESH_TOKEN_EXPIRY_DAYS: '30' });

      expect(getRefreshCookieOptions(config14Days).maxAge).toBe(14 * 24 * 60 * 60);
      expect(getRefreshCookieOptions(config30Days).maxAge).toBe(30 * 24 * 60 * 60);
    });

    test('should use secure and sameSite from config', () => {
      const prodConfig = loadAuthConfig({ NODE_ENV: 'production' });
      const devConfig = loadAuthConfig({ NODE_ENV: 'development' });

      const prodOptions = getRefreshCookieOptions(prodConfig);
      const devOptions = getRefreshCookieOptions(devConfig);

      expect(prodOptions.secure).toBe(true);
      expect(prodOptions.sameSite).toBe('strict');

      expect(devOptions.secure).toBe(false);
      expect(devOptions.sameSite).toBe('lax');
    });
  });
});
