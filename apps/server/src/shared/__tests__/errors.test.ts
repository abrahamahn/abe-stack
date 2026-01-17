// apps/server/src/shared/__tests__/errors.test.ts
import {
  AccountLockedError,
  AppError,
  BadRequestError,
  ConflictError,
  EmailAlreadyExistsError,
  ForbiddenError,
  InternalError,
  InvalidCredentialsError,
  InvalidTokenError,
  isAppError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  toAppError,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
  WeakPasswordError,
} from '@shared/errors';
import { describe, expect, test } from 'vitest';

describe('Shared Errors', () => {
  describe('AppError', () => {
    test('should create error with default status code', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    test('should create error with custom status code', () => {
      const error = new AppError('Test error', 400);

      expect(error.statusCode).toBe(400);
    });

    test('should create error with code and details', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE', { field: 'value' });

      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ field: 'value' });
    });

    test('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE', { foo: 'bar' });
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'AppError',
        message: 'Test error',
        code: 'TEST_CODE',
        details: { foo: 'bar' },
      });
    });
  });

  describe('HTTP Errors', () => {
    test('BadRequestError should have 400 status', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    test('UnauthorizedError should have 401 status', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    test('ForbiddenError should have 403 status', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    test('NotFoundError should have 404 status', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    test('ConflictError should have 409 status', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });

    test('TooManyRequestsError should have 429 status', () => {
      const error = new TooManyRequestsError('Rate limited', 60);

      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.code).toBe('RATE_LIMITED');
    });

    test('InternalError should have 500 status', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('Authentication Errors', () => {
    test('InvalidCredentialsError should have correct properties', () => {
      const error = new InvalidCredentialsError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid email or password');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    test('AccountLockedError should extend TooManyRequestsError', () => {
      const error = new AccountLockedError(300);

      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(300);
    });

    test('InvalidTokenError should have correct properties', () => {
      const error = new InvalidTokenError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    test('TokenReuseError should have correct properties', () => {
      const error = new TokenReuseError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_REUSED');
      expect(error.message).toBe('Token has already been used');
    });

    test('WeakPasswordError should have details', () => {
      const error = new WeakPasswordError({ minLength: 8 });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('WEAK_PASSWORD');
      expect(error.details).toEqual({ minLength: 8 });
    });

    test('EmailAlreadyExistsError should have correct properties', () => {
      const error = new EmailAlreadyExistsError();

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_EXISTS');
    });

    test('UserNotFoundError should have correct properties', () => {
      const error = new UserNotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('OAuth Errors', () => {
    test('OAuthError should include provider', () => {
      const error = new OAuthError('OAuth failed', 'google', 'OAUTH_ERROR');

      expect(error.provider).toBe('google');
      expect(error.statusCode).toBe(400);
    });

    test('OAuthStateMismatchError should have correct properties', () => {
      const error = new OAuthStateMismatchError('github');

      expect(error.provider).toBe('github');
      expect(error.code).toBe('OAUTH_STATE_MISMATCH');
    });
  });

  describe('2FA Errors', () => {
    test('TotpRequiredError should have correct properties', () => {
      const error = new TotpRequiredError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOTP_REQUIRED');
    });

    test('TotpInvalidError should have correct properties', () => {
      const error = new TotpInvalidError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TOTP_INVALID');
    });
  });

  describe('Validation Errors', () => {
    test('ValidationError should include fields', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email format'],
        password: ['Too short', 'Must contain number'],
      });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields).toEqual({
        email: ['Invalid email format'],
        password: ['Too short', 'Must contain number'],
      });
    });
  });

  describe('Helper Functions', () => {
    describe('isAppError', () => {
      test('should return true for AppError instances', () => {
        expect(isAppError(new AppError('test'))).toBe(true);
        expect(isAppError(new BadRequestError())).toBe(true);
        expect(isAppError(new UnauthorizedError())).toBe(true);
      });

      test('should return false for non-AppError', () => {
        expect(isAppError(new Error('test'))).toBe(false);
        expect(isAppError('string')).toBe(false);
        expect(isAppError(null)).toBe(false);
        expect(isAppError(undefined)).toBe(false);
      });
    });

    describe('toAppError', () => {
      test('should return same error if already AppError', () => {
        const original = new BadRequestError('Original');
        const result = toAppError(original);

        expect(result).toBe(original);
      });

      test('should convert Error to InternalError', () => {
        const original = new Error('Some error');
        const result = toAppError(original);

        expect(result).toBeInstanceOf(InternalError);
        expect(result.message).toBe('Some error');
      });

      test('should convert unknown to InternalError', () => {
        const result = toAppError('string error');

        expect(result).toBeInstanceOf(InternalError);
        expect(result.message).toBe('An unexpected error occurred');
      });

      test('should handle null/undefined', () => {
        expect(toAppError(null).message).toBe('An unexpected error occurred');
        expect(toAppError(undefined).message).toBe('An unexpected error occurred');
      });
    });
  });
});
