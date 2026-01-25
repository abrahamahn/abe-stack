// packages/core/src/modules/auth/errors.test.ts
import { describe, expect, test } from 'vitest';

import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../infrastructure/errors';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from './errors';

// ============================================================================
// Auth Errors Tests
// ============================================================================

describe('auth errors', () => {
  describe('InvalidCredentialsError', () => {
    test('should have correct properties', () => {
      const error = new InvalidCredentialsError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid email or password');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should extend UnauthorizedError', () => {
      const error = new InvalidCredentialsError();

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('WeakPasswordError', () => {
    test('should have correct properties', () => {
      const error = new WeakPasswordError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Password is too weak');
      expect(error.code).toBe('WEAK_PASSWORD');
    });

    test('should accept details', () => {
      const error = new WeakPasswordError({ minLength: 8, requireNumber: true });

      expect(error.details).toEqual({ minLength: 8, requireNumber: true });
    });

    test('should extend BadRequestError', () => {
      const error = new WeakPasswordError();

      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('AccountLockedError', () => {
    test('should have correct properties', () => {
      const error = new AccountLockedError();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Account temporarily locked due to too many failed attempts');
    });

    test('should accept retryAfter', () => {
      const error = new AccountLockedError(300);

      expect(error.retryAfter).toBe(300);
    });

    test('should extend TooManyRequestsError', () => {
      const error = new AccountLockedError();

      expect(error).toBeInstanceOf(TooManyRequestsError);
    });

    test('should have undefined retryAfter when not provided', () => {
      const error = new AccountLockedError();

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('EmailAlreadyExistsError', () => {
    test('should have correct properties', () => {
      const error = new EmailAlreadyExistsError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already registered');
      expect(error.code).toBe('EMAIL_EXISTS');
    });

    test('should accept custom message', () => {
      const error = new EmailAlreadyExistsError('This email is taken');

      expect(error.message).toBe('This email is taken');
    });

    test('should extend ConflictError', () => {
      const error = new EmailAlreadyExistsError();

      expect(error).toBeInstanceOf(ConflictError);
    });
  });

  describe('UserNotFoundError', () => {
    test('should have correct properties', () => {
      const error = new UserNotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('USER_NOT_FOUND');
    });

    test('should accept custom message', () => {
      const error = new UserNotFoundError('No user with this ID');

      expect(error.message).toBe('No user with this ID');
    });

    test('should extend NotFoundError', () => {
      const error = new UserNotFoundError();

      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('InvalidTokenError', () => {
    test('should have correct properties', () => {
      const error = new InvalidTokenError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.code).toBe('INVALID_TOKEN');
    });

    test('should accept custom message', () => {
      const error = new InvalidTokenError('Token has expired');

      expect(error.message).toBe('Token has expired');
    });

    test('should extend UnauthorizedError', () => {
      const error = new InvalidTokenError();

      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('TokenReuseError', () => {
    test('should have correct properties', () => {
      const error = new TokenReuseError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token has already been used');
      expect(error.code).toBe('TOKEN_REUSED');
    });

    test('should extend UnauthorizedError', () => {
      const error = new TokenReuseError();

      expect(error).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('OAuthError', () => {
    test('should have correct properties', () => {
      const error = new OAuthError('OAuth failed', 'google');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('OAuth failed');
      expect(error.provider).toBe('google');
    });

    test('should accept code', () => {
      const error = new OAuthError('Failed', 'github', 'OAUTH_ERROR');

      expect(error.code).toBe('OAUTH_ERROR');
    });

    test('should extend AppError', () => {
      const error = new OAuthError('Failed', 'google');

      expect(error).toBeInstanceOf(AppError);
    });

    test('should handle different providers', () => {
      const googleError = new OAuthError('Failed', 'google');
      const githubError = new OAuthError('Failed', 'github');
      const facebookError = new OAuthError('Failed', 'facebook');

      expect(googleError.provider).toBe('google');
      expect(githubError.provider).toBe('github');
      expect(facebookError.provider).toBe('facebook');
    });
  });

  describe('OAuthStateMismatchError', () => {
    test('should have correct properties', () => {
      const error = new OAuthStateMismatchError('github');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('OAuth state mismatch - possible CSRF attack');
      expect(error.provider).toBe('github');
      expect(error.code).toBe('OAUTH_STATE_MISMATCH');
    });

    test('should extend OAuthError', () => {
      const error = new OAuthStateMismatchError('google');

      expect(error).toBeInstanceOf(OAuthError);
    });
  });

  describe('TotpRequiredError', () => {
    test('should have correct properties', () => {
      const error = new TotpRequiredError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Two-factor authentication required');
      expect(error.code).toBe('TOTP_REQUIRED');
    });

    test('should extend AppError', () => {
      const error = new TotpRequiredError();

      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('TotpInvalidError', () => {
    test('should have correct properties', () => {
      const error = new TotpInvalidError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid verification code');
      expect(error.code).toBe('TOTP_INVALID');
    });

    test('should extend BadRequestError', () => {
      const error = new TotpInvalidError();

      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('error serialization', () => {
    test('all auth errors should serialize to JSON', () => {
      const errors = [
        new InvalidCredentialsError(),
        new WeakPasswordError({ min: 8 }),
        new AccountLockedError(300),
        new EmailAlreadyExistsError(),
        new UserNotFoundError(),
        new InvalidTokenError(),
        new TokenReuseError(),
        new OAuthError('Failed', 'google'),
        new OAuthStateMismatchError('github'),
        new TotpRequiredError(),
        new TotpInvalidError(),
      ];

      for (const error of errors) {
        const json = error.toJSON();
        expect(json).toHaveProperty('error');
        expect(json).toHaveProperty('message');
      }
    });

    test('should preserve error code in serialization', () => {
      const error = new InvalidCredentialsError();
      const json = error.toJSON();

      expect(json.code).toBe('INVALID_CREDENTIALS');
      expect(json.error).toBe('InvalidCredentialsError');
      expect(json.message).toBe('Invalid email or password');
    });

    test('should preserve details in serialization', () => {
      const details = { minLength: 8, requireNumber: true, requireSymbol: true };
      const error = new WeakPasswordError(details);
      const json = error.toJSON();

      expect(json.details).toEqual(details);
      expect(json.code).toBe('WEAK_PASSWORD');
    });

    test('should handle undefined code gracefully', () => {
      // OAuthError without explicit code
      const error = new OAuthError('Provider timeout', 'google');
      const json = error.toJSON();

      // code should be undefined, not throw
      expect(json.code).toBeUndefined();
      expect(json.error).toBe('OAuthError');
    });

    test('should handle undefined details gracefully', () => {
      const error = new InvalidCredentialsError();
      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });

    test('should serialize complex details correctly', () => {
      const complexDetails = {
        suggestions: ['Use uppercase', 'Add numbers'],
        currentScore: 2,
        minScore: 3,
        issues: { lowercase: true, uppercase: false },
      };
      const error = new WeakPasswordError(complexDetails);
      const json = error.toJSON();

      expect(json.details).toEqual(complexDetails);
    });

    test('should preserve error name as constructor name', () => {
      const errors = [
        { error: new InvalidCredentialsError(), name: 'InvalidCredentialsError' },
        { error: new WeakPasswordError(), name: 'WeakPasswordError' },
        { error: new AccountLockedError(), name: 'AccountLockedError' },
        { error: new EmailAlreadyExistsError(), name: 'EmailAlreadyExistsError' },
        { error: new UserNotFoundError(), name: 'UserNotFoundError' },
        { error: new InvalidTokenError(), name: 'InvalidTokenError' },
        { error: new TokenReuseError(), name: 'TokenReuseError' },
        { error: new OAuthError('Failed', 'google'), name: 'OAuthError' },
        { error: new OAuthStateMismatchError('github'), name: 'OAuthStateMismatchError' },
        { error: new TotpRequiredError(), name: 'TotpRequiredError' },
        { error: new TotpInvalidError(), name: 'TotpInvalidError' },
      ];

      for (const { error, name } of errors) {
        expect(error.name).toBe(name);
        expect(error.toJSON().error).toBe(name);
      }
    });

    test('should be JSON.stringify compatible', () => {
      const error = new WeakPasswordError({ min: 8 });
      const stringified = JSON.stringify(error);
      const parsed = JSON.parse(stringified);

      expect(parsed.error).toBe('WeakPasswordError');
      expect(parsed.message).toBe('Password is too weak');
      expect(parsed.code).toBe('WEAK_PASSWORD');
      expect(parsed.details).toEqual({ min: 8 });
    });
  });
});
