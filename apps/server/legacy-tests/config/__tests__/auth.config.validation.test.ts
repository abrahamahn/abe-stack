// apps/server/src//__tests__/auth..validation.test.ts
import { describe, expect, test } from 'vitest';

import { AuthValidationError, loadAuth, validateAuth } from '@/auth.';

import type { Auth } from '@';

/**
 * Creates a valid auth  for testing
 * Uses realistic production values as defaults
 */
const apiBaseUrl = 'http://localhost:8080';

function createValid(overrides: Partial<Auth> = {}): Auth {
  const base = loadAuth(
    {
    JWT_SECRET: 'this-is-a-very-secure-secret-key-32chars',
    COOKIE_SECRET: 'this-is-another-secure-cookie-secret-32',
    LOCKOUT_MAX_ATTEMPTS: '5',
    LOCKOUT_DURATION_MS: '1800000', // 30 minutes
    REFRESH_TOKEN_EXPIRY_DAYS: '7',
    PASSWORD_MIN_LENGTH: '8',
    },
    apiBaseUrl,
  );

  return { ...base, ...overrides };
}

describe('validateAuth', () => {
  describe('JWT secret validation', () => {
    test('should pass with valid 32+ character secret', () => {
      const  = createValid();

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with 64 character secret', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'a'.repeat(32) + 'b'.repeat(32), // 64 chars, not repeating pattern
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for secret shorter than 32 characters', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'short-secret', // 12 chars
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/at least 32 characters/);
    });

    test('should throw for empty secret', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: '',
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/at least 32 characters/);
    });

    test('should throw for 31 character secret (boundary)', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'a'.repeat(31),
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
    });

    test('should allow secret padded from "secret"', () => {
      // This test verifies that padding weak words makes them acceptable
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'secret'.padEnd(32, 'x'), // Pad to meet length requirement
        },
      });

      // "secretxxxxxxxxxxxxxxxxxxxxxxxxx" is not in WEAK_SECRETS
      expect(() => validateAuth()).not.toThrow();
    });

    test('should allow secret padded from "changeme"', () => {
      // This test verifies that padding weak words makes them acceptable
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'CHANGEME'.padEnd(32, '!'),
        },
      });

      // "CHANGEME!!!!!!!!!!!!!!!!!!!!!!!!" is not in weak secrets list
      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for repeating character pattern', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'x'.repeat(32), // Repeating pattern (not in WEAK_SECRETS)
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/repeating character pattern/);
    });

    test('should throw for numeric repeating pattern', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: '1'.repeat(32),
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/repeating character pattern/);
    });

    test('should include field name in error', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'short',
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('jwt.secret');
      }
    });
  });

  describe('Cookie secret validation', () => {
    test('should pass with valid cookie secret', () => {
      const  = createValid();

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with empty cookie secret (not set)', () => {
      const  = createValid({
        cookie: {
          ...createValid().cookie,
          secret: '',
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for cookie secret shorter than 32 characters when set', () => {
      const  = createValid({
        cookie: {
          ...createValid().cookie,
          secret: 'too-short-cookie-secret', // 23 chars
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(
        /Cookie secret must be at least 32 characters/,
      );
    });

    test('should throw for 31 character cookie secret (boundary)', () => {
      const  = createValid({
        cookie: {
          ...createValid().cookie,
          secret: 'x'.repeat(31),
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
    });

    test('should include field name in error', () => {
      const  = createValid({
        cookie: {
          ...createValid().cookie,
          secret: 'short',
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('cookie.secret');
      }
    });
  });

  describe('Lockout max attempts validation', () => {
    test('should pass with valid max attempts (5)', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 5,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with min valid value (3)', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 3,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with max valid value (20)', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 20,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for max attempts below 3', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 2,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/between 3 and 20/);
    });

    test('should throw for max attempts above 20', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 21,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/between 3 and 20/);
    });

    test('should include field name in error', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          maxAttempts: 100,
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('lockout.maxAttempts');
      }
    });
  });

  describe('Lockout duration validation', () => {
    test('should pass with valid duration (30 minutes)', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          lockoutDurationMs: 1800000, // 30 minutes
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with minimum valid duration (60000ms)', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          lockoutDurationMs: 60000,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for duration below 60000ms', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          lockoutDurationMs: 59999,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/at least 60000ms/);
    });

    test('should throw for zero duration', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          lockoutDurationMs: 0,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
    });

    test('should include field name in error', () => {
      const  = createValid({
        lockout: {
          ...createValid().lockout,
          lockoutDurationMs: 1000,
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('lockout.lockoutDurationMs');
      }
    });
  });

  describe('Refresh token expiry validation', () => {
    test('should pass with valid expiry (7 days)', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 7,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with minimum valid expiry (1 day)', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 1,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with maximum valid expiry (30 days)', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 30,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for expiry below 1 day', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 0,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/between 1 and 30 days/);
    });

    test('should throw for expiry above 30 days', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 31,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/between 1 and 30 days/);
    });

    test('should include field name in error', () => {
      const  = createValid({
        refreshToken: {
          ...createValid().refreshToken,
          expiryDays: 365,
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('refreshToken.expiryDays');
      }
    });
  });

  describe('Password min length validation', () => {
    test('should pass with valid min length (8)', () => {
      const  = createValid({
        password: {
          ...createValid().password,
          minLength: 8,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should pass with higher min length (12)', () => {
      const  = createValid({
        password: {
          ...createValid().password,
          minLength: 12,
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should throw for min length below 8', () => {
      const  = createValid({
        password: {
          ...createValid().password,
          minLength: 7,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
      expect(() => validateAuth()).toThrow(/at least 8 characters/);
    });

    test('should throw for min length of 4', () => {
      const  = createValid({
        password: {
          ...createValid().password,
          minLength: 4,
        },
      });

      expect(() => validateAuth()).toThrow(AuthValidationError);
    });

    test('should include field name in error', () => {
      const  = createValid({
        password: {
          ...createValid().password,
          minLength: 6,
        },
      });

      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthValidationError);
        expect((error as AuthValidationError).field).toBe('password.minLength');
      }
    });
  });

  describe('AuthValidationError', () => {
    test('should have correct name', () => {
      const error = new AuthValidationError('Test message', 'test.field');

      expect(error.name).toBe('AuthValidationError');
    });

    test('should have correct message', () => {
      const error = new AuthValidationError('Test message', 'test.field');

      expect(error.message).toBe('Test message');
    });

    test('should have correct field', () => {
      const error = new AuthValidationError('Test message', 'test.field');

      expect(error.field).toBe('test.field');
    });

    test('should be instance of Error', () => {
      const error = new AuthValidationError('Test message', 'test.field');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Multiple validations', () => {
    test('should check JWT secret first', () => {
      //  with multiple invalid values
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'short', // Invalid
        },
        lockout: {
          ...createValid().lockout,
          maxAttempts: 1, // Also invalid
        },
      });

      // Should throw for JWT secret first
      try {
        validateAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as AuthValidationError).field).toBe('jwt.secret');
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
      const 1 = createValid({
        jwt: baseJwt,
        cookie: {
          ...createValid().cookie,
          secret: 'short',
        },
      });

      try {
        validateAuth(1);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as AuthValidationError).field).toBe('cookie.secret');
      }
    });
  });

  describe('Edge cases', () => {
    test('should handle exactly 32 character secret', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: 'abcdefghijklmnopqrstuvwxyz123456', // Exactly 32 chars
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should handle Unicode in secret', () => {
      // Unicode characters may have different byte lengths
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: '这是一个很长的密钥abcdefghijklmnopqrstuvwxyz', // Mixed unicode
        },
      });

      expect(() => validateAuth()).not.toThrow();
    });

    test('should handle whitespace in secret', () => {
      const  = createValid({
        jwt: {
          ...createValid().jwt,
          secret: '   this-secret-has-spaces-around   ',
        },
      });

      // Should pass if length is sufficient (35 chars including spaces)
      expect(() => validateAuth()).not.toThrow();
    });
  });
});
