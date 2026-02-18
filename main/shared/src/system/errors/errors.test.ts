// main/shared/src/system/errors/errors.test.ts
import { describe, expect, it } from 'vitest';

import { ERROR_CODES, HTTP_STATUS } from '../constants/platform';

import {
    AccountLockedError,
    AppError,
    BadRequestError,
    BaseError,
    ConfigurationError,
    ConflictError,
    EmailAlreadyExistsError,
    EmailNotVerifiedError,
    EmailSendError,
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
    UnprocessableError,
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

  // ==========================================================================
  // Adversarial: All subclass instantiation with edge cases
  // ==========================================================================
  describe('adversarial: subclass instantiation edge cases', () => {
    it('AccountLockedError has statusCode 429 and stores retryAfter', () => {
      const withRetry = new AccountLockedError(60);
      expect(withRetry.statusCode).toBe(429);
      expect(withRetry.retryAfter).toBe(60);
      expect(withRetry.code).toBe(ERROR_CODES.ACCOUNT_LOCKED);

      const noRetry = new AccountLockedError();
      expect(noRetry.retryAfter).toBeUndefined();
    });

    it('AccountLockedError extends TooManyRequestsError and AppError', () => {
      const err = new AccountLockedError();
      expect(err).toBeInstanceOf(TooManyRequestsError);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });

    it('UnprocessableError has statusCode 422', () => {
      const err = new UnprocessableError();
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('Unprocessable entity');
      expect(err.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('UnprocessableError accepts custom message, code, and details', () => {
      const details = { reason: 'circular reference' };
      const err = new UnprocessableError('Cannot process', 'CUSTOM_UNPROCESSABLE', details);
      expect(err.message).toBe('Cannot process');
      expect(err.code).toBe('CUSTOM_UNPROCESSABLE');
      expect(err.details).toEqual(details);
    });

    it('EmailSendError has statusCode 500 and stores originalError', () => {
      const original = new Error('SMTP failure');
      const err = new EmailSendError('Failed to send', original);
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe(ERROR_CODES.EMAIL_SEND_FAILED);
      expect(err.originalError).toBe(original);
      expect(err.expose).toBe(false);
    });

    it('EmailSendError uses default message when none provided', () => {
      const err = new EmailSendError();
      expect(err.message).toBe('Failed to send email');
    });

    it('TokenReuseError stores all optional security fields', () => {
      const err = new TokenReuseError('user-1', 'user@example.com', 'family-x', '1.2.3.4', 'Chrome');
      expect(err.userId).toBe('user-1');
      expect(err.email).toBe('user@example.com');
      expect(err.familyId).toBe('family-x');
      expect(err.ipAddress).toBe('1.2.3.4');
      expect(err.userAgent).toBe('Chrome');
    });

    it('TokenReuseError with all-undefined optional fields', () => {
      const err = new TokenReuseError(undefined, undefined, undefined, undefined, undefined);
      expect(err.userId).toBeUndefined();
      expect(err.email).toBeUndefined();
    });

    it('ConfigurationError with empty string message falls back to variable name message', () => {
      // Empty string is falsy — triggers the fallback
      const err = new ConfigurationError('MY_VAR', '');
      expect(err.message).toBe('Missing required environment variable: MY_VAR');
    });
  });

  // ==========================================================================
  // Adversarial: statusCode correctness across all classes
  // ==========================================================================
  describe('adversarial: statusCode correctness', () => {
    const statusCodeMatrix: Array<[string, AppError, number]> = [
      ['BadRequestError', new BadRequestError(), 400],
      ['UnauthorizedError', new UnauthorizedError(), 401],
      ['ForbiddenError', new ForbiddenError(), 403],
      ['NotFoundError', new NotFoundError(), 404],
      ['ConflictError', new ConflictError(), 409],
      ['ValidationError', new ValidationError('v', {}), 422],
      ['UnprocessableError', new UnprocessableError(), 422],
      ['TooManyRequestsError', new TooManyRequestsError(), 429],
      ['InternalServerError', new InternalServerError(), 500],
      ['ConfigurationError', new ConfigurationError('X'), 500],
      ['InvalidCredentialsError', new InvalidCredentialsError(), 401],
      ['WeakPasswordError', new WeakPasswordError(), 400],
      ['AccountLockedError', new AccountLockedError(), 429],
      ['EmailAlreadyExistsError', new EmailAlreadyExistsError(), 409],
      ['EmailNotVerifiedError', new EmailNotVerifiedError('e@x.com'), 401],
      ['UserNotFoundError', new UserNotFoundError(), 404],
      ['InvalidTokenError', new InvalidTokenError(), 401],
      ['TokenReuseError', new TokenReuseError(), 401],
      ['OAuthError', new OAuthError('msg', 'github'), 400],
      ['OAuthStateMismatchError', new OAuthStateMismatchError('github'), 400],
      ['TotpRequiredError', new TotpRequiredError(), 401],
      ['TotpInvalidError', new TotpInvalidError(), 400],
      ['EmailSendError', new EmailSendError(), 500],
      ['ResourceNotFoundError', new ResourceNotFoundError('Item'), 404],
    ];

    for (const [name, err, expectedStatus] of statusCodeMatrix) {
      it(`${name} has statusCode ${String(expectedStatus)}`, () => {
        expect(err.statusCode).toBe(expectedStatus);
      });
    }
  });

  // ==========================================================================
  // Adversarial: toJSON serialization
  // ==========================================================================
  describe('adversarial: toJSON serialization', () => {
    it('toJSON always has ok: false', () => {
      const errors: AppError[] = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new InternalServerError(),
      ];
      for (const err of errors) {
        expect(err.toJSON().ok).toBe(false);
      }
    });

    it('toJSON round-trips through JSON.parse without loss', () => {
      const err = new ValidationError('bad input', { email: ['required'] });
      const serialized = JSON.stringify(err.toJSON());
      const parsed = JSON.parse(serialized) as ReturnType<typeof err.toJSON>;
      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(parsed.error.message).toBe('bad input');
    });

    it('toJSON includes details when present', () => {
      const err = new BadRequestError('bad', ERROR_CODES.BAD_REQUEST, { field: 'x' });
      const json = err.toJSON();
      expect(json.error.details).toEqual({ field: 'x' });
    });

    it('toJSON omits details when undefined', () => {
      const err = new ConflictError('conflict');
      const json = err.toJSON();
      expect(json.error.details).toBeUndefined();
    });

    it('ValidationError toJSON includes fields in details', () => {
      const fields = { name: ['too short'], email: ['invalid'] };
      const err = new ValidationError('failed', fields);
      const json = err.toJSON();
      expect(json.error.details).toEqual({ fields });
    });
  });

  // ==========================================================================
  // Adversarial: instanceof checks across class hierarchy
  // ==========================================================================
  describe('adversarial: instanceof hierarchy checks', () => {
    it('OAuthStateMismatchError is instanceof OAuthError, AppError, Error', () => {
      const err = new OAuthStateMismatchError('google');
      expect(err).toBeInstanceOf(OAuthError);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });

    it('TotpInvalidError is instanceof BadRequestError, AppError, Error', () => {
      const err = new TotpInvalidError();
      expect(err).toBeInstanceOf(BadRequestError);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });

    it('ResourceNotFoundError is instanceof NotFoundError, AppError, Error', () => {
      const err = new ResourceNotFoundError('Doc');
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });

    it('sibling classes are not instances of each other', () => {
      expect(new BadRequestError()).not.toBeInstanceOf(UnauthorizedError);
      expect(new ForbiddenError()).not.toBeInstanceOf(NotFoundError);
      expect(new ConflictError()).not.toBeInstanceOf(ValidationError);
    });

    it('isAppError returns true for deeply nested subclasses', () => {
      expect(isAppError(new OAuthStateMismatchError('github'))).toBe(true);
      expect(isAppError(new InvalidCredentialsError())).toBe(true);
      expect(isAppError(new TotpInvalidError())).toBe(true);
      expect(isAppError(new AccountLockedError())).toBe(true);
      expect(isAppError(new ResourceNotFoundError('X'))).toBe(true);
    });
  });

  // ==========================================================================
  // Adversarial: error.name reflects constructor class name
  // ==========================================================================
  describe('adversarial: error.name class identity', () => {
    it('each error class sets name to its own constructor name', () => {
      expect(new BadRequestError().name).toBe('BadRequestError');
      expect(new UnauthorizedError().name).toBe('UnauthorizedError');
      expect(new ForbiddenError().name).toBe('ForbiddenError');
      expect(new NotFoundError().name).toBe('NotFoundError');
      expect(new ConflictError().name).toBe('ConflictError');
      expect(new ValidationError('v', {}).name).toBe('ValidationError');
      expect(new TooManyRequestsError().name).toBe('TooManyRequestsError');
      expect(new InternalServerError().name).toBe('InternalServerError');
      expect(new ConfigurationError('V').name).toBe('ConfigurationError');
      expect(new OAuthError('m', 'g').name).toBe('OAuthError');
      expect(new OAuthStateMismatchError('g').name).toBe('OAuthStateMismatchError');
      expect(new TotpRequiredError().name).toBe('TotpRequiredError');
      expect(new TotpInvalidError().name).toBe('TotpInvalidError');
      expect(new InvalidCredentialsError().name).toBe('InvalidCredentialsError');
      expect(new AccountLockedError().name).toBe('AccountLockedError');
      expect(new EmailSendError().name).toBe('EmailSendError');
      expect(new TokenReuseError().name).toBe('TokenReuseError');
    });
  });

  // ==========================================================================
  // Adversarial: error.stack trace
  // ==========================================================================
  describe('adversarial: stack trace', () => {
    it('AppError has a non-empty stack', () => {
      const err = new AppError('trace');
      expect(err.stack).toBeDefined();
      expect(typeof err.stack).toBe('string');
      expect((err.stack ?? '').length).toBeGreaterThan(0);
    });

    it('all subclasses have stack traces', () => {
      const errors: Error[] = [
        new BadRequestError(),
        new UnauthorizedError(),
        new InternalServerError(),
        new OAuthError('m', 'github'),
        new TotpRequiredError(),
        new InvalidCredentialsError(),
      ];
      for (const err of errors) {
        expect(err.stack).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Adversarial: expose flag correctness
  // ==========================================================================
  describe('adversarial: expose flag', () => {
    it('all 4xx errors are exposed by default', () => {
      const clientErrors: AppError[] = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new ValidationError('v', {}),
        new UnprocessableError(),
        new TooManyRequestsError(),
        new InvalidCredentialsError(),
        new WeakPasswordError(),
        new AccountLockedError(),
        new EmailAlreadyExistsError(),
        new EmailNotVerifiedError('e@x.com'),
        new UserNotFoundError(),
        new InvalidTokenError(),
        new TokenReuseError(),
        new OAuthError('m', 'g'),
        new OAuthStateMismatchError('g'),
        new TotpRequiredError(),
        new TotpInvalidError(),
      ];
      for (const err of clientErrors) {
        expect(err.expose).toBe(true);
      }
    });

    it('all 5xx errors are not exposed by default', () => {
      const serverErrors: AppError[] = [
        new InternalServerError(),
        new ConfigurationError('X'),
        new EmailSendError(),
      ];
      for (const err of serverErrors) {
        expect(err.expose).toBe(false);
      }
    });
  });

  // ==========================================================================
  // Adversarial: formatValidationErrors edge cases
  // ==========================================================================
  describe('adversarial: formatValidationErrors edge cases', () => {
    it('empty issues array produces empty fields and issues', () => {
      const result = formatValidationErrors([]);
      expect(result.ok).toBe(false);
      expect(result.error.details.fields).toEqual({});
      expect(result.error.details.issues).toEqual([]);
    });

    it('path with numeric segments joins with dot notation', () => {
      const result = formatValidationErrors([
        { path: ['items', 0, 'name'], message: 'required', code: 'custom' },
      ]);
      expect(result.error.details.fields['items.0.name']).toEqual(['required']);
    });

    it('100 issues for the same field accumulate all messages', () => {
      const issues = Array.from({ length: 100 }, (_, i) => ({
        path: ['field'],
        message: `error ${String(i)}`,
        code: 'custom',
      }));
      const result = formatValidationErrors(issues);
      expect(result.error.details.fields['field']).toHaveLength(100);
      expect(result.error.details.issues).toHaveLength(100);
    });

    it('issue with only root path maps to _root', () => {
      const result = formatValidationErrors([{ path: [], message: 'Root error', code: 'custom' }]);
      expect(result.error.details.fields['_root']).toEqual(['Root error']);
      expect(result.error.details.issues[0]?.field).toBe('_root');
    });

    it('deeply nested path joins all segments', () => {
      const result = formatValidationErrors([
        { path: ['a', 'b', 'c', 'd', 'e'], message: 'deep', code: 'custom' },
      ]);
      expect(result.error.details.fields['a.b.c.d.e']).toEqual(['deep']);
    });
  });

  // ==========================================================================
  // Adversarial: toAppError edge cases
  // ==========================================================================
  describe('adversarial: toAppError edge cases', () => {
    it('wraps null in AppError with default message', () => {
      const result = toAppError(null);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it('wraps undefined in AppError with default message', () => {
      const result = toAppError(undefined);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it('wraps a thrown number in AppError', () => {
      const result = toAppError(42);
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it('wraps an object (non-Error) in AppError', () => {
      const result = toAppError({ code: 'CUSTOM', status: 503 });
      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(500);
    });

    it('returns the exact same AppError subclass instance', () => {
      const original = new ForbiddenError('no access');
      const result = toAppError(original);
      expect(result).toBe(original);
      expect(result).toBeInstanceOf(ForbiddenError);
    });

    it('wraps an Error with empty message', () => {
      const result = toAppError(new Error(''));
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('');
    });
  });

  // ==========================================================================
  // Adversarial: getSafeErrorMessage edge cases
  // ==========================================================================
  describe('adversarial: getSafeErrorMessage edge cases', () => {
    it('InternalServerError in development returns the real message', () => {
      const err = new InternalServerError('DB is down');
      expect(getSafeErrorMessage(err, false)).toBe('DB is down');
    });

    it('explicitly expose=true server error is shown in production', () => {
      const err = new AppError('visible', 500, 'CODE', undefined, true);
      expect(err.expose).toBe(true);
      expect(getSafeErrorMessage(err, true)).toBe('visible');
    });

    it('non-Error object returns default message in both modes', () => {
      expect(getSafeErrorMessage({ message: 'hidden' }, false)).toBe('An unexpected error occurred');
      expect(getSafeErrorMessage({ message: 'hidden' }, true)).toBe('An unexpected error occurred');
    });

    it('Error with empty message returns empty string in dev', () => {
      const err = new Error('');
      expect(getSafeErrorMessage(err, false)).toBe('');
    });

    it('Error with empty message returns default in production', () => {
      const err = new Error('');
      expect(getSafeErrorMessage(err, true)).toBe('An unexpected error occurred');
    });
  });
});
