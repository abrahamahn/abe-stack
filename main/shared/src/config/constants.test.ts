// main/shared/src/config/constants.test.ts
import { describe, expect, it } from 'vitest';

import {
  ARGON2_DEFAULTS,
  AUTH_STRATEGIES,
  AUTH_VALIDATION,
  BILLING_PROVIDERS,
  CACHE_PROVIDERS,
  COURIER_DEFAULT_API_URL,
  DATABASE_PROVIDERS,
  DB_DEFAULTS,
  NOTIFICATION_PROVIDERS,
  PACKAGE_MANAGER_PROVIDERS,
  QUEUE_DEFAULTS,
  QUEUE_PROVIDERS,
  RATE_LIMIT_DEFAULTS,
  REPEATING_SECRET_PATTERN,
  S3_DEFAULTS,
  SEARCH_PROVIDERS,
  SERVER_PORT_FALLBACKS,
  SMTP_DEFAULTS,
  STORAGE_PROVIDERS,
  WEAK_SECRETS,
} from './constants';

describe('config constants', () => {
  // ============================================================================
  // Auth Strategies
  // ============================================================================
  describe('AUTH_STRATEGIES', () => {
    it('includes all expected strategies', () => {
      expect(AUTH_STRATEGIES).toContain('local');
      expect(AUTH_STRATEGIES).toContain('magic');
      expect(AUTH_STRATEGIES).toContain('webauthn');
      expect(AUTH_STRATEGIES).toContain('google');
      expect(AUTH_STRATEGIES).toContain('github');
      expect(AUTH_STRATEGIES).toContain('facebook');
      expect(AUTH_STRATEGIES).toContain('microsoft');
      expect(AUTH_STRATEGIES).toContain('apple');
      expect(AUTH_STRATEGIES).toHaveLength(8);
    });

    it('has no duplicate entries', () => {
      expect(new Set(AUTH_STRATEGIES).size).toBe(AUTH_STRATEGIES.length);
    });
  });

  // ============================================================================
  // Secret Validation
  // ============================================================================
  describe('WEAK_SECRETS', () => {
    it('rejects common weak values', () => {
      expect(WEAK_SECRETS.has('secret')).toBe(true);
      expect(WEAK_SECRETS.has('password')).toBe(true);
      expect(WEAK_SECRETS.has('changeme')).toBe(true);
      expect(WEAK_SECRETS.has('test')).toBe(true);
    });

    it('does not match strong secrets', () => {
      expect(WEAK_SECRETS.has('x9fK$mP2#wL7!qR4')).toBe(false);
    });
  });

  describe('REPEATING_SECRET_PATTERN', () => {
    it('matches repeating characters 32+ times', () => {
      expect(REPEATING_SECRET_PATTERN.test('a'.repeat(32))).toBe(true);
      expect(REPEATING_SECRET_PATTERN.test('a'.repeat(64))).toBe(true);
    });

    it('does not match short repeats', () => {
      expect(REPEATING_SECRET_PATTERN.test('a'.repeat(31))).toBe(false);
    });

    it('does not match varied strings', () => {
      expect(REPEATING_SECRET_PATTERN.test('abcdefghijklmnopqrstuvwxyz123456')).toBe(false);
    });
  });

  // ============================================================================
  // Argon2
  // ============================================================================
  describe('ARGON2_DEFAULTS', () => {
    it('uses argon2id (type 2)', () => {
      expect(ARGON2_DEFAULTS.TYPE).toBe(2);
    });

    it('follows OWASP memory cost recommendation', () => {
      expect(ARGON2_DEFAULTS.MEMORY_COST).toBe(19456);
    });

    it('has sane time cost and parallelism', () => {
      expect(ARGON2_DEFAULTS.TIME_COST).toBeGreaterThanOrEqual(1);
      expect(ARGON2_DEFAULTS.PARALLELISM).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Provider Enums
  // ============================================================================
  describe('provider enums', () => {
    it('DATABASE_PROVIDERS includes postgresql', () => {
      expect(DATABASE_PROVIDERS).toContain('postgresql');
    });

    it('STORAGE_PROVIDERS includes local and s3', () => {
      expect(STORAGE_PROVIDERS).toContain('local');
      expect(STORAGE_PROVIDERS).toContain('s3');
    });

    it('BILLING_PROVIDERS includes stripe', () => {
      expect(BILLING_PROVIDERS).toContain('stripe');
    });

    it('QUEUE_PROVIDERS includes local and redis', () => {
      expect(QUEUE_PROVIDERS).toContain('local');
      expect(QUEUE_PROVIDERS).toContain('redis');
    });

    it('CACHE_PROVIDERS includes local and redis', () => {
      expect(CACHE_PROVIDERS).toContain('local');
      expect(CACHE_PROVIDERS).toContain('redis');
    });

    it('SEARCH_PROVIDERS includes sql and elasticsearch', () => {
      expect(SEARCH_PROVIDERS).toContain('sql');
      expect(SEARCH_PROVIDERS).toContain('elasticsearch');
    });

    it('NOTIFICATION_PROVIDERS includes onesignal and fcm', () => {
      expect(NOTIFICATION_PROVIDERS).toContain('onesignal');
      expect(NOTIFICATION_PROVIDERS).toContain('fcm');
    });

    it('PACKAGE_MANAGER_PROVIDERS includes pnpm', () => {
      expect(PACKAGE_MANAGER_PROVIDERS).toContain('pnpm');
    });
  });

  // ============================================================================
  // Infrastructure Defaults
  // ============================================================================
  describe('DB_DEFAULTS', () => {
    it('uses standard PostgreSQL port', () => {
      expect(DB_DEFAULTS.POSTGRES_PORT).toBe(5432);
    });

    it('provides port fallbacks in ascending order', () => {
      const fallbacks = DB_DEFAULTS.POSTGRES_PORT_FALLBACKS;
      expect(fallbacks).toHaveLength(3);
      expect(fallbacks[0]).toBe(5432);
    });

    it('has reasonable connection limits', () => {
      expect(DB_DEFAULTS.POSTGRES_MAX_CONNECTIONS_DEV).toBeLessThan(
        DB_DEFAULTS.POSTGRES_MAX_CONNECTIONS_PROD,
      );
    });

    it('uses 30s MongoDB timeouts', () => {
      expect(DB_DEFAULTS.MONGODB_CONNECT_TIMEOUT_MS).toBe(30_000);
      expect(DB_DEFAULTS.MONGODB_SOCKET_TIMEOUT_MS).toBe(30_000);
    });
  });

  describe('SMTP_DEFAULTS', () => {
    it('uses standard submission port 587', () => {
      expect(SMTP_DEFAULTS.PORT).toBe(587);
    });

    it('has socket timeout greater than connection timeout', () => {
      expect(SMTP_DEFAULTS.SOCKET_TIMEOUT_MS).toBeGreaterThan(SMTP_DEFAULTS.CONNECTION_TIMEOUT_MS);
    });
  });

  describe('S3_DEFAULTS', () => {
    it('defaults to 1-hour presigned URLs', () => {
      expect(S3_DEFAULTS.PRESIGN_EXPIRES_SECONDS).toBe(3600);
    });
  });

  describe('QUEUE_DEFAULTS', () => {
    it('has 1s poll interval', () => {
      expect(QUEUE_DEFAULTS.POLL_INTERVAL_MS).toBe(1000);
    });

    it('has reasonable retry defaults', () => {
      expect(QUEUE_DEFAULTS.MAX_ATTEMPTS).toBeGreaterThanOrEqual(1);
      expect(QUEUE_DEFAULTS.BACKOFF_BASE_MS).toBeGreaterThan(0);
    });
  });

  describe('RATE_LIMIT_DEFAULTS', () => {
    it('has a 1-minute global window', () => {
      expect(RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS).toBe(60_000);
    });

    it('is more restrictive in production than dev', () => {
      expect(RATE_LIMIT_DEFAULTS.GLOBAL_MAX_PROD).toBeLessThan(
        RATE_LIMIT_DEFAULTS.GLOBAL_MAX_DEV,
      );
      expect(RATE_LIMIT_DEFAULTS.LOGIN_MAX_PROD).toBeLessThan(
        RATE_LIMIT_DEFAULTS.LOGIN_MAX_DEV,
      );
    });

    it('has exponential backoff with factor >= 2', () => {
      expect(RATE_LIMIT_DEFAULTS.PROGRESSIVE_BACKOFF_FACTOR).toBeGreaterThanOrEqual(2);
    });

    it('has max delay greater than base delay', () => {
      expect(RATE_LIMIT_DEFAULTS.PROGRESSIVE_MAX_DELAY_MS).toBeGreaterThan(
        RATE_LIMIT_DEFAULTS.PROGRESSIVE_BASE_DELAY_MS,
      );
    });
  });

  describe('SERVER_PORT_FALLBACKS', () => {
    it('starts with 8080', () => {
      expect(SERVER_PORT_FALLBACKS[0]).toBe(8080);
    });

    it('includes common development ports', () => {
      expect(SERVER_PORT_FALLBACKS).toContain(3000);
      expect(SERVER_PORT_FALLBACKS).toContain(5000);
    });
  });

  describe('COURIER_DEFAULT_API_URL', () => {
    it('points to courier.com', () => {
      expect(COURIER_DEFAULT_API_URL).toBe('https://api.courier.com');
    });
  });

  // ============================================================================
  // Auth Validation Thresholds
  // ============================================================================
  describe('AUTH_VALIDATION', () => {
    it('requires 32+ char secrets', () => {
      expect(AUTH_VALIDATION.MIN_SECRET_LENGTH).toBe(32);
    });

    it('has a sane lockout range', () => {
      expect(AUTH_VALIDATION.LOCKOUT_MIN_ATTEMPTS).toBeLessThan(
        AUTH_VALIDATION.LOCKOUT_MAX_ATTEMPTS,
      );
    });

    it('requires at least 8-char passwords', () => {
      expect(AUTH_VALIDATION.PASSWORD_MIN_LENGTH).toBe(8);
    });

    it('refresh token days are bounded', () => {
      expect(AUTH_VALIDATION.REFRESH_TOKEN_MIN_DAYS).toBeGreaterThanOrEqual(1);
      expect(AUTH_VALIDATION.REFRESH_TOKEN_MAX_DAYS).toBeLessThanOrEqual(90);
    });
  });
});
