// apps/server/src/config/__tests__/auth.config.validation.test.ts
import { describe, expect, test } from 'vitest';

import { AuthConfigValidationError, loadAuthConfig, validateAuthConfig } from '@config/auth.config';

import type { AuthConfig } from '@config/auth.config';

/**
 * Creates a valid auth config for testing
 * Uses realistic production values as defaults
 */
function createValidConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  const baseConfig = loadAuthConfig({
    JWT_SECRET: 'this-is-a-very-secure-secret-key-32chars',
    COOKIE_SECRET: 'this-is-another-secure-cookie-secret-32',
    LOCKOUT_MAX_ATTEMPTS: '5',
    LOCKOUT_DURATION_MS: '1800000', // 30 minutes
    REFRESH_TOKEN_EXPIRY_DAYS: '7',
    PASSWORD_MIN_LENGTH: '8',
  });

  return { ...baseConfig, ...overrides };
}

describe('validateAuthConfig', () => {
  describe('JWT secret validation', () => {
    test('should pass with valid 32+ character secret', () => {
      const config = createValidConfig();

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with 64 character secret', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'a'.repeat(32) + 'b'.repeat(32), // 64 chars, not repeating pattern
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for secret shorter than 32 characters', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'short-secret', // 12 chars
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/at least 32 characters/);
    });

    test('should throw for empty secret', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: '',
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/at least 32 characters/);
    });

    test('should throw for 31 character secret (boundary)', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'a'.repeat(31),
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
    });

    test('should allow secret padded from "secret"', () => {
      // This test verifies that padding weak words makes them acceptable
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'secret'.padEnd(32, 'x'), // Pad to meet length requirement
        },
      });

      // "secretxxxxxxxxxxxxxxxxxxxxxxxxx" is not in WEAK_SECRETS
      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should allow secret padded from "changeme"', () => {
      // This test verifies that padding weak words makes them acceptable
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'CHANGEME'.padEnd(32, '!'),
        },
      });

      // "CHANGEME!!!!!!!!!!!!!!!!!!!!!!!!" is not in weak secrets list
      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for repeating character pattern', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'x'.repeat(32), // Repeating pattern (not in WEAK_SECRETS)
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/repeating character pattern/);
    });

    test('should throw for numeric repeating pattern', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: '1'.repeat(32),
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/repeating character pattern/);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'short',
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('jwt.secret');
      }
    });
  });

  describe('Cookie secret validation', () => {
    test('should pass with valid cookie secret', () => {
      const config = createValidConfig();

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with empty cookie secret (not set)', () => {
      const config = createValidConfig({
        cookie: {
          ...createValidConfig().cookie,
          secret: '',
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for cookie secret shorter than 32 characters when set', () => {
      const config = createValidConfig({
        cookie: {
          ...createValidConfig().cookie,
          secret: 'too-short-cookie-secret', // 23 chars
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(
        /Cookie secret must be at least 32 characters/,
      );
    });

    test('should throw for 31 character cookie secret (boundary)', () => {
      const config = createValidConfig({
        cookie: {
          ...createValidConfig().cookie,
          secret: 'x'.repeat(31),
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        cookie: {
          ...createValidConfig().cookie,
          secret: 'short',
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('cookie.secret');
      }
    });
  });

  describe('Lockout max attempts validation', () => {
    test('should pass with valid max attempts (5)', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 5,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with min valid value (3)', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 3,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with max valid value (20)', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 20,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for max attempts below 3', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 2,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/between 3 and 20/);
    });

    test('should throw for max attempts above 20', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 21,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/between 3 and 20/);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 100,
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('lockout.maxAttempts');
      }
    });
  });

  describe('Lockout duration validation', () => {
    test('should pass with valid duration (30 minutes)', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          lockoutDurationMs: 1800000, // 30 minutes
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with minimum valid duration (60000ms)', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          lockoutDurationMs: 60000,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for duration below 60000ms', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          lockoutDurationMs: 59999,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/at least 60000ms/);
    });

    test('should throw for zero duration', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          lockoutDurationMs: 0,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        lockout: {
          ...createValidConfig().lockout,
          lockoutDurationMs: 1000,
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('lockout.lockoutDurationMs');
      }
    });
  });

  describe('Refresh token expiry validation', () => {
    test('should pass with valid expiry (7 days)', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 7,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with minimum valid expiry (1 day)', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 1,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with maximum valid expiry (30 days)', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 30,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for expiry below 1 day', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 0,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/between 1 and 30 days/);
    });

    test('should throw for expiry above 30 days', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 31,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/between 1 and 30 days/);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        refreshToken: {
          ...createValidConfig().refreshToken,
          expiryDays: 365,
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('refreshToken.expiryDays');
      }
    });
  });

  describe('Password min length validation', () => {
    test('should pass with valid min length (8)', () => {
      const config = createValidConfig({
        password: {
          ...createValidConfig().password,
          minLength: 8,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should pass with higher min length (12)', () => {
      const config = createValidConfig({
        password: {
          ...createValidConfig().password,
          minLength: 12,
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should throw for min length below 8', () => {
      const config = createValidConfig({
        password: {
          ...createValidConfig().password,
          minLength: 7,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
      expect(() => validateAuthConfig(config)).toThrow(/at least 8 characters/);
    });

    test('should throw for min length of 4', () => {
      const config = createValidConfig({
        password: {
          ...createValidConfig().password,
          minLength: 4,
        },
      });

      expect(() => validateAuthConfig(config)).toThrow(AuthConfigValidationError);
    });

    test('should include field name in error', () => {
      const config = createValidConfig({
        password: {
          ...createValidConfig().password,
          minLength: 6,
        },
      });

      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigValidationError);
        expect((error as AuthConfigValidationError).field).toBe('password.minLength');
      }
    });
  });

  describe('AuthConfigValidationError', () => {
    test('should have correct name', () => {
      const error = new AuthConfigValidationError('Test message', 'test.field');

      expect(error.name).toBe('AuthConfigValidationError');
    });

    test('should have correct message', () => {
      const error = new AuthConfigValidationError('Test message', 'test.field');

      expect(error.message).toBe('Test message');
    });

    test('should have correct field', () => {
      const error = new AuthConfigValidationError('Test message', 'test.field');

      expect(error.field).toBe('test.field');
    });

    test('should be instance of Error', () => {
      const error = new AuthConfigValidationError('Test message', 'test.field');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Multiple validations', () => {
    test('should check JWT secret first', () => {
      // Config with multiple invalid values
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'short', // Invalid
        },
        lockout: {
          ...createValidConfig().lockout,
          maxAttempts: 1, // Also invalid
        },
      });

      // Should throw for JWT secret first
      try {
        validateAuthConfig(config);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as AuthConfigValidationError).field).toBe('jwt.secret');
      }
    });

    test('should validate all fields in order', () => {
      // Test validation order by fixing each field one by one
      const baseJwt = {
        secret: 'this-is-a-very-secure-secret-key-32chars',
        accessTokenExpiry: '15m',
        issuer: 'test',
        audience: 'test',
      };

      // Valid JWT, invalid cookie
      const config1 = createValidConfig({
        jwt: baseJwt,
        cookie: {
          ...createValidConfig().cookie,
          secret: 'short',
        },
      });

      try {
        validateAuthConfig(config1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as AuthConfigValidationError).field).toBe('cookie.secret');
      }
    });
  });

  describe('Edge cases', () => {
    test('should handle exactly 32 character secret', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: 'abcdefghijklmnopqrstuvwxyz123456', // Exactly 32 chars
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should handle Unicode in secret', () => {
      // Unicode characters may have different byte lengths
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: '这是一个很长的密钥abcdefghijklmnopqrstuvwxyz', // Mixed unicode
        },
      });

      expect(() => validateAuthConfig(config)).not.toThrow();
    });

    test('should handle whitespace in secret', () => {
      const config = createValidConfig({
        jwt: {
          ...createValidConfig().jwt,
          secret: '   this-secret-has-spaces-around   ',
        },
      });

      // Should pass if length is sufficient (35 chars including spaces)
      expect(() => validateAuthConfig(config)).not.toThrow();
    });
  });
});
