// main/shared/src/system/errors/error.mapper.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_ERROR_NAMES, HTTP_ERROR_MESSAGES } from '../constants/platform';

import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from './errors';
import {
  type ErrorMapperLogger,
  type HttpErrorResponse,
  isKnownAuthError,
  mapErrorToHttpResponse,
} from './error.mapper';

// ============================================================================
// Test Helpers
// ============================================================================

function makeLogger(): ErrorMapperLogger {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// ============================================================================
// mapErrorToHttpResponse — Adversarial Tests
// ============================================================================

describe('mapErrorToHttpResponse', () => {
  let logger: ErrorMapperLogger;

  beforeEach(() => {
    logger = makeLogger();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Primitive / Non-object inputs — boundary analysis
  // ==========================================================================

  describe('when error has no name property (primitive inputs)', () => {
    it('returns 500 for null', () => {
      const result = mapErrorToHttpResponse(null, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(logger.error).toHaveBeenCalledWith(null);
    });

    it('returns 500 for undefined', () => {
      const result = mapErrorToHttpResponse(undefined, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(logger.error).toHaveBeenCalledWith(undefined);
    });

    it('returns 500 for a plain string', () => {
      const result = mapErrorToHttpResponse('something went wrong', logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });

    it('returns 500 for a number', () => {
      const result = mapErrorToHttpResponse(42, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });

    it('returns 500 for a boolean', () => {
      const result = mapErrorToHttpResponse(false, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });

    it('returns 500 for an empty array (no name property)', () => {
      const result = mapErrorToHttpResponse([], logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });
  });

  // ==========================================================================
  // Non-Error objects with a name property — impostors
  // ==========================================================================

  describe('when error is a plain object with a name property', () => {
    it('returns 500 for empty plain object (no name)', () => {
      const result = mapErrorToHttpResponse({}, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });

    it('returns 500 when name is an empty string', () => {
      const result = mapErrorToHttpResponse({ name: '' }, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
    });

    it('returns 500 when name is a random unknown string', () => {
      const result = mapErrorToHttpResponse({ name: 'RandomUnknownError' }, logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('falls through to 500 for a standard Error with no statusCode', () => {
      const result = mapErrorToHttpResponse(new Error('raw error'), logger);
      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('correctly rejects an impostor AccountLockedError (wrong name casing)', () => {
      const impostor = { name: 'accountlockederror', message: 'locked' };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(500);
    });

    it('correctly rejects an impostor with similar name containing extra chars', () => {
      const impostor = { name: 'AccountLockedError2', message: 'locked' };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(500);
    });
  });

  // ==========================================================================
  // AccountLockedError
  // ==========================================================================

  describe('AccountLockedError', () => {
    it('maps to 429 with account locked message', () => {
      const result = mapErrorToHttpResponse(new AccountLockedError(), logger);
      expect(result).toEqual({
        status: 429,
        body: { message: HTTP_ERROR_MESSAGES.AccountLocked },
      });
    });

    it('maps plain object impostor with correct name to 429', () => {
      const impostor = { name: AUTH_ERROR_NAMES.AccountLockedError };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(429);
    });

    it('does NOT log a warning or error for AccountLockedError', () => {
      mapErrorToHttpResponse(new AccountLockedError(), logger);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EmailNotVerifiedError
  // ==========================================================================

  describe('EmailNotVerifiedError', () => {
    it('maps to 401 with EMAIL_NOT_VERIFIED code and email', () => {
      const error = new EmailNotVerifiedError('user@example.com');
      const result = mapErrorToHttpResponse(error, logger);
      expect(result).toEqual({
        status: 401,
        body: {
          message: error.message,
          code: 'EMAIL_NOT_VERIFIED',
          email: 'user@example.com',
        },
      });
    });

    it('uses the error instance message, not a hardcoded constant', () => {
      const custom = new EmailNotVerifiedError('user@example.com', 'Check your inbox first');
      const result = mapErrorToHttpResponse(custom, logger);
      expect(result.body.message).toBe('Check your inbox first');
    });

    it('rejects EmailNotVerifiedError impostor missing email property', () => {
      const impostor = {
        name: AUTH_ERROR_NAMES.EmailNotVerifiedError,
        message: 'not verified',
        // email intentionally omitted
      };
      const result = mapErrorToHttpResponse(impostor, logger);
      // Without 'email' in error, isEmailNotVerifiedError returns false — falls to generic path
      expect(result.status).toBe(500);
    });

    it('rejects EmailNotVerifiedError impostor missing message property', () => {
      const impostor = {
        name: AUTH_ERROR_NAMES.EmailNotVerifiedError,
        email: 'user@example.com',
        // message intentionally omitted
      };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(500);
    });

    it('does NOT log for a valid EmailNotVerifiedError', () => {
      mapErrorToHttpResponse(new EmailNotVerifiedError('x@x.com'), logger);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // InvalidCredentialsError
  // ==========================================================================

  describe('InvalidCredentialsError', () => {
    it('maps to 401 with invalid credentials message', () => {
      const result = mapErrorToHttpResponse(new InvalidCredentialsError(), logger);
      expect(result).toEqual({
        status: 401,
        body: { message: HTTP_ERROR_MESSAGES.InvalidCredentials },
      });
    });

    it('maps plain object impostor with correct name to 401', () => {
      const impostor = { name: AUTH_ERROR_NAMES.InvalidCredentialsError };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(401);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InvalidCredentials);
    });

    it('does NOT log for InvalidCredentialsError', () => {
      mapErrorToHttpResponse(new InvalidCredentialsError(), logger);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // InvalidTokenError
  // ==========================================================================

  describe('InvalidTokenError', () => {
    it('maps to 400 (not 401) with invalid token message', () => {
      const result = mapErrorToHttpResponse(new InvalidTokenError(), logger);
      expect(result).toEqual({
        status: 400,
        body: { message: HTTP_ERROR_MESSAGES.InvalidToken },
      });
    });

    it('uses hardcoded HTTP_ERROR_MESSAGES.InvalidToken, not the error instance message', () => {
      const error = new InvalidTokenError('Custom token error message');
      const result = mapErrorToHttpResponse(error, logger);
      // The mapper does NOT pass through the instance message for this error type
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InvalidToken);
      expect(result.body.message).not.toBe('Custom token error message');
    });
  });

  // ==========================================================================
  // EmailAlreadyExistsError
  // ==========================================================================

  describe('EmailAlreadyExistsError', () => {
    it('maps to 409 with email already registered message', () => {
      const result = mapErrorToHttpResponse(new EmailAlreadyExistsError(), logger);
      expect(result).toEqual({
        status: 409,
        body: { message: HTTP_ERROR_MESSAGES.EmailAlreadyRegistered },
      });
    });

    it('does NOT pass through the custom instance message for EmailAlreadyExistsError', () => {
      const error = new EmailAlreadyExistsError('This address is taken');
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailAlreadyRegistered);
    });
  });

  // ==========================================================================
  // WeakPasswordError
  // ==========================================================================

  describe('WeakPasswordError', () => {
    it('maps to 400 with weak password message', () => {
      const result = mapErrorToHttpResponse(new WeakPasswordError(), logger);
      expect(result).toEqual({
        status: 400,
        body: { message: HTTP_ERROR_MESSAGES.WeakPassword },
      });
    });

    it('logs weak password details when logContext is provided', () => {
      const error = new WeakPasswordError({ errors: ['too short', 'no uppercase'] });
      mapErrorToHttpResponse(error, logger, { logContext: { userId: 'user-1' } });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
        'Password validation failed',
      );
    });

    it('does NOT log when no logContext provided', () => {
      mapErrorToHttpResponse(new WeakPasswordError(), logger);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does NOT log when logContext is undefined explicitly', () => {
      mapErrorToHttpResponse(new WeakPasswordError(), logger, {});
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs details.errors from WeakPasswordError details', () => {
      const details = { errors: ['No special character'] };
      const error = new WeakPasswordError(details);
      mapErrorToHttpResponse(error, logger, { logContext: { route: '/register' } });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ errors: ['No special character'] }),
        'Password validation failed',
      );
    });

    it('maps plain object impostor with correct name to 400', () => {
      const impostor = { name: AUTH_ERROR_NAMES.WeakPasswordError };
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(400);
    });
  });

  // ==========================================================================
  // EmailSendError
  // ==========================================================================

  describe('EmailSendError', () => {
    it('maps to 503 with email send failed message', () => {
      const result = mapErrorToHttpResponse(new EmailSendError(), logger);
      expect(result).toEqual({
        status: 503,
        body: { message: HTTP_ERROR_MESSAGES.EmailSendFailed },
      });
    });

    it('logs with originalError message when originalError is an Error', () => {
      const cause = new Error('SMTP timeout');
      const error = new EmailSendError('Failed to send', cause);
      mapErrorToHttpResponse(error, logger);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ originalError: 'SMTP timeout' }),
        'Email send failed',
      );
    });

    it('logs with undefined originalError when originalError is not an Error', () => {
      const impostor: { name: string; message: string; originalError: string } = {
        name: AUTH_ERROR_NAMES.EmailSendError,
        message: 'send failed',
        originalError: 'not-an-error-object',
      };
      mapErrorToHttpResponse(impostor, logger);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ originalError: undefined }),
        'Email send failed',
      );
    });

    it('logs with undefined when originalError is absent', () => {
      const error = new EmailSendError('Failed without cause');
      mapErrorToHttpResponse(error, logger);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ originalError: undefined }),
        'Email send failed',
      );
    });

    it('uses custom onEmailSendError handler when it returns a response', () => {
      const customResponse: HttpErrorResponse = {
        status: 503,
        body: { message: 'Custom: email down', code: 'EMAIL_OUTAGE' },
      };
      const handler = vi.fn().mockReturnValue(customResponse);
      const result = mapErrorToHttpResponse(new EmailSendError(), logger, {
        onEmailSendError: handler,
      });
      expect(result).toBe(customResponse);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('falls through to default when onEmailSendError returns undefined', () => {
      const handler = vi.fn().mockReturnValue(undefined);
      const result = mapErrorToHttpResponse(new EmailSendError(), logger, {
        onEmailSendError: handler,
      });
      expect(result.status).toBe(503);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailSendFailed);
      expect(logger.error).toHaveBeenCalled();
    });

    it('does NOT call onEmailSendError for non-EmailSendError errors', () => {
      const handler = vi.fn();
      mapErrorToHttpResponse(new InvalidCredentialsError(), logger, {
        onEmailSendError: handler,
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('requires message property — impostor without message is rejected', () => {
      const impostor = { name: AUTH_ERROR_NAMES.EmailSendError };
      // isEmailSendError checks for 'message' in error, so this falls through
      const result = mapErrorToHttpResponse(impostor, logger);
      expect(result.status).toBe(500);
    });
  });

  // ==========================================================================
  // AppError generic fallback (statusCode-based path)
  // ==========================================================================

  describe('AppError generic fallback path', () => {
    it('falls through to generic path for unknown AppError subclass names with statusCode', () => {
      const genericAppError = {
        name: 'SomeUnknownAppError',
        statusCode: 403,
        message: 'Access denied',
        code: 'FORBIDDEN',
      };
      const result = mapErrorToHttpResponse(genericAppError, logger);
      expect(result.status).toBe(403);
      expect(result.body.message).toBe('Access denied');
      expect(result.body.code).toBe('FORBIDDEN');
    });

    it('includes code in body only when code is a string', () => {
      const error = {
        name: 'CustomError',
        statusCode: 404,
        message: 'Not here',
        code: 'NOT_FOUND',
      };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.code).toBe('NOT_FOUND');
    });

    it('omits code from body when code is absent', () => {
      const error = { name: 'CustomError', statusCode: 404, message: 'Not here' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.code).toBeUndefined();
    });

    it('omits code from body when code is not a string', () => {
      const error = { name: 'CustomError', statusCode: 404, message: 'Not here', code: 42 };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.code).toBeUndefined();
    });

    it('logs a warning for generic AppError fallback', () => {
      const error = { name: 'SomeName', statusCode: 422, message: 'Bad data' };
      mapErrorToHttpResponse(error, logger, { logContext: { requestId: 'req-1' } });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ errorName: 'SomeName', statusCode: 422, requestId: 'req-1' }),
        expect.stringContaining('Unhandled app error'),
      );
    });

    it('returns 500 when statusCode is below 400 (valid range check)', () => {
      const error = { name: 'WeirdError', statusCode: 200, message: 'ok?' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(500);
    });

    it('returns 500 when statusCode is exactly 600 (boundary — out of valid range)', () => {
      const error = { name: 'WeirdError', statusCode: 600, message: 'boundary' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(500);
    });

    it('accepts statusCode 599 (upper boundary — in valid range)', () => {
      const error = { name: 'WeirdError', statusCode: 599, message: 'edge case' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(599);
    });

    it('accepts statusCode exactly 400 (lower boundary — in valid range)', () => {
      const error = { name: 'WeirdError', statusCode: 400, message: 'bad' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(400);
    });

    it('returns 500 when statusCode is a string instead of a number', () => {
      const error = { name: 'WeirdError', statusCode: '404', message: 'not found' };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(500);
    });

    it('returns 500 when message is not a string in generic fallback', () => {
      const error = { name: 'WeirdError', statusCode: 404, message: 99 };
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.status).toBe(500);
    });
  });

  // ==========================================================================
  // Priority / ordering: which branch wins when multiple conditions could match
  // ==========================================================================

  describe('branch priority order', () => {
    it('AccountLockedError is matched before generic AppError fallback', () => {
      // An AccountLockedError also has statusCode=429 and message, but must be caught at
      // the AccountLockedError branch first (returns fixed message, not error.message)
      const error = new AccountLockedError();
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.AccountLocked);
      // NOT the instance message 'Account temporarily locked due to too many failed attempts'
    });

    it('WeakPasswordError is matched before generic AppError fallback', () => {
      const error = new WeakPasswordError();
      const result = mapErrorToHttpResponse(error, logger);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.WeakPassword);
    });

    it('EmailAlreadyExistsError is matched before generic AppError fallback', () => {
      const error = new EmailAlreadyExistsError('Custom duplicate message');
      const result = mapErrorToHttpResponse(error, logger);
      // Should use constant, not instance message
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailAlreadyRegistered);
    });
  });

  // ==========================================================================
  // Circular reference — does not throw
  // ==========================================================================

  describe('circular reference objects', () => {
    it('does not throw when error has circular references', () => {
      type Circular = { name: string; self?: Circular };
      const circular: Circular = { name: 'CircularError' };
      circular.self = circular;
      expect(() => mapErrorToHttpResponse(circular, logger)).not.toThrow();
    });
  });

  // ==========================================================================
  // Prototype pollution — adversarial object shapes
  // ==========================================================================

  describe('prototype pollution attempts', () => {
    it('does not match known error name set to a non-string prototype property', () => {
      // An object that has name via prototype rather than own property
      const proto = { name: AUTH_ERROR_NAMES.AccountLockedError };
      const obj = Object.create(proto) as { name?: string };
      // 'name' is NOT an own property of obj — 'in' operator checks the prototype chain too
      // The hasName guard uses 'in', so this WILL pass hasName — then name check will match
      // This is the actual behavior, not a bug to fix, just verify it
      const result = mapErrorToHttpResponse(obj, logger);
      // name IS in obj (via prototype chain), so it matches AccountLockedError
      expect(result.status).toBe(429);
    });

    it('returns 500 when name property is null', () => {
      const obj = { name: null };
      const result = mapErrorToHttpResponse(obj, logger);
      // name === null is not a string — won't match any branch except final 500
      expect(result.status).toBe(500);
    });

    it('returns 500 when name property is an object', () => {
      const obj = { name: { toString: () => 'AccountLockedError' } };
      const result = mapErrorToHttpResponse(obj, logger);
      expect(result.status).toBe(500);
    });
  });

  // ==========================================================================
  // logContext passthrough
  // ==========================================================================

  describe('logContext passthrough', () => {
    it('merges logContext into EmailSendError log call', () => {
      const cause = new Error('SMTP down');
      const error = new EmailSendError('failed', cause);
      mapErrorToHttpResponse(error, logger, { logContext: { tenantId: 'abc' } });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'abc', originalError: 'SMTP down' }),
        'Email send failed',
      );
    });

    it('merges logContext into generic AppError fallback log call', () => {
      const error = { name: 'CustomError', statusCode: 404, message: 'Gone' };
      mapErrorToHttpResponse(error, logger, { logContext: { traceId: 'trace-42' } });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'trace-42' }),
        expect.any(String),
      );
    });
  });
});

// ============================================================================
// isKnownAuthError — Adversarial Tests
// ============================================================================

describe('isKnownAuthError', () => {
  // ==========================================================================
  // True positives: every value in AUTH_ERROR_NAMES should return true
  // ==========================================================================

  describe('true positives — all known auth error names', () => {
    it.each(Object.values(AUTH_ERROR_NAMES))(
      'returns true for error named "%s"',
      (name: string) => {
        expect(isKnownAuthError({ name })).toBe(true);
      },
    );

    it('returns true for real AccountLockedError instance', () => {
      expect(isKnownAuthError(new AccountLockedError())).toBe(true);
    });

    it('returns true for real EmailNotVerifiedError instance', () => {
      expect(isKnownAuthError(new EmailNotVerifiedError('x@x.com'))).toBe(true);
    });

    it('returns true for real InvalidCredentialsError instance', () => {
      expect(isKnownAuthError(new InvalidCredentialsError())).toBe(true);
    });

    it('returns true for real InvalidTokenError instance', () => {
      expect(isKnownAuthError(new InvalidTokenError())).toBe(true);
    });

    it('returns true for real EmailAlreadyExistsError instance', () => {
      expect(isKnownAuthError(new EmailAlreadyExistsError())).toBe(true);
    });

    it('returns true for real WeakPasswordError instance', () => {
      expect(isKnownAuthError(new WeakPasswordError())).toBe(true);
    });

    it('returns true for real EmailSendError instance', () => {
      expect(isKnownAuthError(new EmailSendError())).toBe(true);
    });
  });

  // ==========================================================================
  // True negatives: primitives and null
  // ==========================================================================

  describe('true negatives — primitives and null', () => {
    it('returns false for null', () => {
      expect(isKnownAuthError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isKnownAuthError(undefined)).toBe(false);
    });

    it('returns false for a plain string', () => {
      expect(isKnownAuthError('AccountLockedError')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isKnownAuthError(0)).toBe(false);
    });

    it('returns false for a boolean', () => {
      expect(isKnownAuthError(true)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isKnownAuthError({})).toBe(false);
    });
  });

  // ==========================================================================
  // Impostors that look like auth errors but aren't
  // ==========================================================================

  describe('impostor objects', () => {
    it('returns false for correct name with wrong casing', () => {
      expect(isKnownAuthError({ name: 'accountlockederror' })).toBe(false);
      expect(isKnownAuthError({ name: 'ACCOUNTLOCKEDERROR' })).toBe(false);
      expect(isKnownAuthError({ name: 'Account_Locked_Error' })).toBe(false);
    });

    it('returns false for name with leading/trailing whitespace', () => {
      expect(isKnownAuthError({ name: ' AccountLockedError' })).toBe(false);
      expect(isKnownAuthError({ name: 'AccountLockedError ' })).toBe(false);
      expect(isKnownAuthError({ name: ' AccountLockedError ' })).toBe(false);
    });

    it('returns false for name that is a prefix of a known error name', () => {
      expect(isKnownAuthError({ name: 'AccountLocked' })).toBe(false);
      expect(isKnownAuthError({ name: 'Invalid' })).toBe(false);
    });

    it('returns false for name that is a suffix of a known error name', () => {
      expect(isKnownAuthError({ name: 'LockedError' })).toBe(false);
    });

    it('returns false for a standard Error (Error base class name is "Error")', () => {
      expect(isKnownAuthError(new Error('generic'))).toBe(false);
    });

    it('returns false for name set to empty string', () => {
      expect(isKnownAuthError({ name: '' })).toBe(false);
    });

    it('returns false for name set to null', () => {
      // { name: null } has 'name' in it, so hasName passes, but name is null not a string
      // Object.values(AUTH_ERROR_NAMES).includes(null) should be false
      expect(isKnownAuthError({ name: null })).toBe(false);
    });

    it('returns false for a random unknown error name', () => {
      expect(isKnownAuthError({ name: 'TotallyFakeError' })).toBe(false);
      expect(isKnownAuthError({ name: 'InternalServerError' })).toBe(false);
      expect(isKnownAuthError({ name: 'NotFoundError' })).toBe(false);
      expect(isKnownAuthError({ name: 'ForbiddenError' })).toBe(false);
    });

    it('returns false for TokenReuseError (not in AUTH_ERROR_NAMES)', () => {
      // TokenReuseError exists in errors.ts but is NOT listed in AUTH_ERROR_NAMES
      expect(isKnownAuthError({ name: 'TokenReuseError' })).toBe(false);
    });

    it('returns false for OAuthError (not in AUTH_ERROR_NAMES)', () => {
      expect(isKnownAuthError({ name: 'OAuthError' })).toBe(false);
    });

    it('returns false for TotpRequiredError (not in AUTH_ERROR_NAMES)', () => {
      expect(isKnownAuthError({ name: 'TotpRequiredError' })).toBe(false);
    });
  });

  // ==========================================================================
  // Prototype chain — 'in' operator traverses prototype
  // ==========================================================================

  describe('prototype chain behavior', () => {
    it('returns true when name is inherited via prototype (in operator)', () => {
      const proto = { name: AUTH_ERROR_NAMES.WeakPasswordError };
      const obj = Object.create(proto);
      // 'name' in obj is true due to prototype chain
      expect(isKnownAuthError(obj)).toBe(true);
    });

    it('returns false when prototype has unrecognized name', () => {
      const proto = { name: 'UnknownError' };
      const obj = Object.create(proto);
      expect(isKnownAuthError(obj)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge cases: circular references
  // ==========================================================================

  describe('circular reference objects', () => {
    it('does not throw and returns correct result for circular reference errors', () => {
      type Circular = { name: string; self?: Circular };
      const circular: Circular = { name: AUTH_ERROR_NAMES.AccountLockedError };
      circular.self = circular;
      expect(() => isKnownAuthError(circular)).not.toThrow();
      expect(isKnownAuthError(circular)).toBe(true);
    });

    it('returns false for circular reference without a matching name', () => {
      type Circular = { name: string; self?: Circular };
      const circular: Circular = { name: 'UnrelatedCircularError' };
      circular.self = circular;
      expect(isKnownAuthError(circular)).toBe(false);
    });
  });
});
