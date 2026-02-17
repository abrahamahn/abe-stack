// main/shared/src/engine/errors/errors.test.ts
import { describe, expect, it } from 'vitest';

import { ERROR_CODES, HTTP_STATUS } from '../constants/platform';

import {
    AppError,
    BadRequestError,
    BaseError,
    ConfigurationError,
    ConflictError,
    EmailAlreadyExistsError,
    EmailNotVerifiedError,
    ForbiddenError,
    formatValidationErrors,
    getErrorStatusCode,
    getSafeErrorMessage,
    InternalServerError,
    InvalidCredentialsError,
    InvalidTokenError,
    isAppError,
    NotFoundError,
    OAuthError,
    OAuthStateMismatchError,
    ResourceNotFoundError,
    toAppError,
    TokenReuseError,
    TooManyRequestsError,
    TotpInvalidError,
    TotpRequiredError,
    UnauthorizedError,
    UserNotFoundError,
    ValidationError,
    WeakPasswordError,
} from './errors';

describe('errors', () => {
  // ==========================================================================
  // BaseError / AppError
  // ==========================================================================
  describe('AppError', () => {
    it('sets correct default properties', () => {
      const error = new AppError('test error');
      expect(error.message).toBe('test error');
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.details).toBeUndefined();
      expect(error.name).toBe('AppError');
    });

    it('sets custom properties', () => {
      const details = { field: 'email' };
      const error = new AppError(
        'custom error',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST,
        details,
      );
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.details).toEqual(details);
    });

    it('exposes client errors (< 500) by default', () => {
      const clientError = new AppError('client', HTTP_STATUS.BAD_REQUEST);
      expect(clientError.expose).toBe(true);

      const serverError = new AppError('server', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(serverError.expose).toBe(false);
    });

    it('allows explicit expose override', () => {
      const error = new AppError(
        'server',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR,
        undefined,
        true,
      );
      expect(error.expose).toBe(true);
    });

    it('is an instance of Error and BaseError', () => {
      const error = new AppError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(AppError);
    });

    it('serializes to JSON correctly', () => {
      const error = new AppError('test error', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST, {
        field: 'email',
      });
      const json = error.toJSON();
      expect(json).toEqual({
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'test error',
          details: { field: 'email' },
        },
      });
    });

    it('serializes to JSON without details when undefined', () => {
      const error = new AppError('test error');
      const json = error.toJSON();
      expect(json.error.details).toBeUndefined();
    });
  });

  // ==========================================================================
  // HTTP Error Classes
  // ==========================================================================
  describe('BadRequestError', () => {
    it('sets correct defaults', () => {
      const error = new BadRequestError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ERROR_CODES.BAD_REQUEST);
      expect(error.message).toBe('Bad request');
    });

    it('accepts custom message, code, and details', () => {
      const error = new BadRequestError('Invalid input', ERROR_CODES.VALIDATION_ERROR, {
        field: 'name',
      });
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'name' });
    });
  });

  describe('UnauthorizedError', () => {
    it('sets correct defaults', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(error.message).toBe('Unauthorized');
    });

    it('accepts custom message and code', () => {
      const error = new UnauthorizedError('Token expired', ERROR_CODES.TOKEN_EXPIRED);
      expect(error.message).toBe('Token expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('ForbiddenError', () => {
    it('sets correct defaults', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('NotFoundError', () => {
    it('sets correct defaults', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('Not found');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('formats message with resource name', () => {
      const error = new ResourceNotFoundError('User');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('formats message with resource name and identifier', () => {
      const error = new ResourceNotFoundError('User', 'user-123');
      expect(error.message).toBe('User (user-123) not found');
    });

    it('handles empty identifier gracefully', () => {
      const error = new ResourceNotFoundError('User', '');
      expect(error.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('sets correct defaults', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ERROR_CODES.CONFLICT);
      expect(error.message).toBe('Conflict');
    });
  });

  describe('ValidationError', () => {
    it('sets correct properties', () => {
      const fields = { email: ['Invalid email format'] };
      const error = new ValidationError('Validation failed', fields);
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.fields).toEqual(fields);
      expect(error.details).toEqual({ fields });
    });
  });

  describe('TooManyRequestsError', () => {
    it('sets correct defaults', () => {
      const error = new TooManyRequestsError();
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe(ERROR_CODES.RATE_LIMITED);
      expect(error.message).toBe('Too many requests');
    });
  });

  describe('InternalServerError', () => {
    it('sets correct defaults', () => {
      const error = new InternalServerError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.expose).toBe(false);
    });
  });

  describe('ConfigurationError', () => {
    it('generates message from variable name', () => {
      const error = new ConfigurationError('DATABASE_URL');
      expect(error.message).toBe('Missing required environment variable: DATABASE_URL');
      expect(error.variable).toBe('DATABASE_URL');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ERROR_CODES.CONFIGURATION_ERROR);
    });

    it('accepts custom message', () => {
      const error = new ConfigurationError('PORT', 'PORT must be a number');
      expect(error.message).toBe('PORT must be a number');
      expect(error.variable).toBe('PORT');
    });
  });

  // ==========================================================================
  // Auth & Account Errors
  // ==========================================================================
  describe('InvalidCredentialsError', () => {
    it('sets correct message and code', () => {
      const error = new InvalidCredentialsError();
      expect(error.message).toBe('Invalid email or password');
      expect(error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
      expect(error.statusCode).toBe(401);
    });

    it('extends UnauthorizedError and AppError', () => {
      const error = new InvalidCredentialsError();
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('WeakPasswordError', () => {
    it('sets correct message and code', () => {
      const error = new WeakPasswordError();
      expect(error.message).toBe('Password is too weak');
      expect(error.code).toBe(ERROR_CODES.WEAK_PASSWORD);
      expect(error.statusCode).toBe(400);
    });

    it('accepts optional details', () => {
      const details = { minLength: 8, feedback: ['Add uppercase letter'] };
      const error = new WeakPasswordError(details);
      expect(error.details).toEqual(details);
    });

    it('extends BadRequestError', () => {
      expect(new WeakPasswordError()).toBeInstanceOf(BadRequestError);
    });
  });

  describe('EmailAlreadyExistsError', () => {
    it('sets correct defaults', () => {
      const error = new EmailAlreadyExistsError();
      expect(error.message).toBe('Email already registered');
      expect(error.code).toBe(ERROR_CODES.EMAIL_ALREADY_EXISTS);
      expect(error.statusCode).toBe(409);
    });

    it('accepts custom message', () => {
      const error = new EmailAlreadyExistsError('This email is taken');
      expect(error.message).toBe('This email is taken');
    });

    it('extends ConflictError', () => {
      expect(new EmailAlreadyExistsError()).toBeInstanceOf(ConflictError);
    });
  });

  describe('EmailNotVerifiedError', () => {
    it('sets correct defaults with email', () => {
      const error = new EmailNotVerifiedError('user@example.com');
      expect(error.message).toBe('Please verify your email address before logging in');
      expect(error.email).toBe('user@example.com');
      expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
      expect(error.statusCode).toBe(401);
    });

    it('accepts custom message', () => {
      const error = new EmailNotVerifiedError('user@example.com', 'Check your inbox');
      expect(error.message).toBe('Check your inbox');
    });

    it('extends UnauthorizedError', () => {
      expect(new EmailNotVerifiedError('user@example.com')).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('UserNotFoundError', () => {
    it('sets correct defaults', () => {
      const error = new UserNotFoundError();
      expect(error.message).toBe('User not found');
      expect(error.code).toBe(ERROR_CODES.USER_NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });

    it('accepts custom message', () => {
      const error = new UserNotFoundError('No user with that ID');
      expect(error.message).toBe('No user with that ID');
    });

    it('extends NotFoundError', () => {
      expect(new UserNotFoundError()).toBeInstanceOf(NotFoundError);
    });
  });

  describe('InvalidTokenError', () => {
    it('sets correct defaults', () => {
      const error = new InvalidTokenError();
      expect(error.message).toBe('Invalid or expired token');
      expect(error.code).toBe(ERROR_CODES.INVALID_TOKEN);
      expect(error.statusCode).toBe(401);
    });

    it('accepts custom message', () => {
      const error = new InvalidTokenError('Token has expired');
      expect(error.message).toBe('Token has expired');
    });

    it('extends UnauthorizedError', () => {
      expect(new InvalidTokenError()).toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('TokenReuseError', () => {
    it('sets correct message and code', () => {
      const error = new TokenReuseError();
      expect(error.message).toBe('Token has already been used');
      expect(error.code).toBe(ERROR_CODES.TOKEN_REUSED);
      expect(error.statusCode).toBe(401);
    });

    it('extends UnauthorizedError', () => {
      expect(new TokenReuseError()).toBeInstanceOf(UnauthorizedError);
    });
  });

  // ==========================================================================
  // OAuth Errors
  // ==========================================================================
  describe('OAuthError', () => {
    it('sets correct properties', () => {
      const error = new OAuthError('Provider error', 'google');
      expect(error.message).toBe('Provider error');
      expect(error.provider).toBe('google');
      expect(error.code).toBe(ERROR_CODES.OAUTH_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('accepts custom error code', () => {
      const error = new OAuthError('State mismatch', 'github', ERROR_CODES.OAUTH_STATE_MISMATCH);
      expect(error.code).toBe(ERROR_CODES.OAUTH_STATE_MISMATCH);
    });

    it('extends AppError', () => {
      expect(new OAuthError('err', 'google')).toBeInstanceOf(AppError);
    });
  });

  describe('OAuthStateMismatchError', () => {
    it('sets correct message with provider', () => {
      const error = new OAuthStateMismatchError('google');
      expect(error.message).toBe('OAuth state mismatch - possible CSRF attack');
      expect(error.provider).toBe('google');
      expect(error.code).toBe(ERROR_CODES.OAUTH_STATE_MISMATCH);
      expect(error.statusCode).toBe(400);
    });

    it('extends OAuthError', () => {
      expect(new OAuthStateMismatchError('github')).toBeInstanceOf(OAuthError);
    });
  });

  // ==========================================================================
  // 2FA Errors
  // ==========================================================================
  describe('TotpRequiredError', () => {
    it('sets correct message and code', () => {
      const error = new TotpRequiredError();
      expect(error.message).toBe('Two-factor authentication required');
      expect(error.code).toBe(ERROR_CODES.TOTP_REQUIRED);
      expect(error.statusCode).toBe(401);
    });

    it('extends AppError', () => {
      expect(new TotpRequiredError()).toBeInstanceOf(AppError);
    });
  });

  describe('TotpInvalidError', () => {
    it('sets correct message and code', () => {
      const error = new TotpInvalidError();
      expect(error.message).toBe('Invalid verification code');
      expect(error.code).toBe(ERROR_CODES.TOTP_INVALID);
      expect(error.statusCode).toBe(400);
    });

    it('extends BadRequestError', () => {
      expect(new TotpInvalidError()).toBeInstanceOf(BadRequestError);
    });
  });

  // ==========================================================================
  // Error Utilities
  // ==========================================================================
  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      expect(isAppError(new AppError('test'))).toBe(true);
      expect(isAppError(new BadRequestError())).toBe(true);
      expect(isAppError(new ValidationError('fail', {}))).toBe(true);
    });

    it('returns false for non-AppError values', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError(42)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('returns AppError as-is', () => {
      const original = new BadRequestError('bad');
      const result = toAppError(original);
      expect(result).toBe(original);
    });

    it('wraps standard Error in AppError', () => {
      const result = toAppError(new Error('standard error'));
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('standard error');
      expect(result.statusCode).toBe(500);
    });

    it('wraps unknown values in AppError', () => {
      const result = toAppError('string error');
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('getSafeErrorMessage', () => {
    it('returns full message in development for AppError', () => {
      const error = new BadRequestError('Invalid email');
      expect(getSafeErrorMessage(error, false)).toBe('Invalid email');
    });

    it('returns full message in production for exposed AppError', () => {
      const error = new BadRequestError('Invalid email');
      expect(error.expose).toBe(true);
      expect(getSafeErrorMessage(error, true)).toBe('Invalid email');
    });

    it('obfuscates unexposed AppError in production', () => {
      const error = new InternalServerError('DB connection failed');
      expect(error.expose).toBe(false);
      expect(getSafeErrorMessage(error, true)).toBe('An unexpected error occurred');
    });

    it('returns full message in development for standard Error', () => {
      const error = new Error('detailed error');
      expect(getSafeErrorMessage(error, false)).toBe('detailed error');
    });

    it('obfuscates standard Error in production', () => {
      const error = new Error('detailed error');
      expect(getSafeErrorMessage(error, true)).toBe('An unexpected error occurred');
    });

    it('returns generic message for unknown error types', () => {
      expect(getSafeErrorMessage('string', false)).toBe('An unexpected error occurred');
      expect(getSafeErrorMessage(42, true)).toBe('An unexpected error occurred');
    });
  });

  describe('getErrorStatusCode', () => {
    it('returns status code from AppError', () => {
      expect(getErrorStatusCode(new BadRequestError())).toBe(400);
      expect(getErrorStatusCode(new NotFoundError())).toBe(404);
      expect(getErrorStatusCode(new InternalServerError())).toBe(500);
    });

    it('returns 500 for non-AppError', () => {
      expect(getErrorStatusCode(new Error('test'))).toBe(500);
      expect(getErrorStatusCode('string')).toBe(500);
      expect(getErrorStatusCode(null)).toBe(500);
    });
  });

  // ==========================================================================
  // Validation Error Formatting
  // ==========================================================================
  describe('formatValidationErrors', () => {
    it('formats Zod issues into standardized response', () => {
      const issues = [
        {
          code: 'invalid_type' as const,
          expected: 'string' as const,
          received: 'number' as const,
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small' as const,
          minimum: 8,
          type: 'string' as const,
          inclusive: true,
          exact: false,
          path: ['password'],
          message: 'Must be at least 8 characters',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toBe('Request validation failed');
      expect(result.error.details.fields).toEqual({
        email: ['Expected string, received number'],
        password: ['Must be at least 8 characters'],
      });
      expect(result.error.details.issues).toHaveLength(2);
      expect(result.error.details.issues[0]).toEqual({
        field: 'email',
        message: 'Expected string, received number',
        code: 'invalid_type',
      });
    });

    it('groups multiple errors for the same field', () => {
      const issues = [
        {
          code: 'too_small' as const,
          minimum: 8,
          type: 'string' as const,
          inclusive: true,
          exact: false,
          path: ['password'],
          message: 'Must be at least 8 characters',
        },
        {
          code: 'custom' as const,
          path: ['password'],
          message: 'Must contain uppercase letter',
        },
      ];

      const result = formatValidationErrors(issues);
      expect(result.error.details.fields['password']).toEqual([
        'Must be at least 8 characters',
        'Must contain uppercase letter',
      ]);
    });

    it('handles nested paths', () => {
      const issues = [
        {
          code: 'invalid_type' as const,
          expected: 'string' as const,
          received: 'undefined' as const,
          path: ['address', 'city'],
          message: 'Required',
        },
      ];

      const result = formatValidationErrors(issues);
      expect(result.error.details.fields['address.city']).toEqual(['Required']);
    });

    it('handles root-level issues with empty path', () => {
      const issues = [
        {
          code: 'custom' as const,
          path: [],
          message: 'Invalid input',
        },
      ];

      const result = formatValidationErrors(issues);
      expect(result.error.details.fields['_root']).toEqual(['Invalid input']);
      expect(result.error.details.issues[0]?.field).toBe('_root');
    });
  });
});
