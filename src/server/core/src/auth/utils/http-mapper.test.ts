// src/server/core/src/auth/utils/http-mapper.test.ts
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HTTP_ERROR_MESSAGES,
  isKnownAuthError,
  mapErrorToHttpResponse,
  type ErrorMapperLogger,
} from './http-mapper';

describe('HTTP_ERROR_MESSAGES', () => {
  it('should export all expected error messages', () => {
    expect(HTTP_ERROR_MESSAGES).toEqual({
      InvalidCredentials: 'Invalid email or password',
      WeakPassword: 'Password is too weak',
      AccountLocked: 'Account temporarily locked due to too many failed attempts',
      EmailAlreadyRegistered: 'Email already registered',
      EmailNotVerified: 'Please verify your email address before logging in',
      InvalidToken: 'Invalid or expired token',
      EmailSendFailed: 'Failed to send email. Please try again or use the resend option.',
      InternalError: 'An unexpected error occurred',
    });
  });
});

describe('isKnownAuthError', () => {
  describe('when given known auth error types', () => {
    it('should return true for InvalidCredentialsError', () => {
      const error = new InvalidCredentialsError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for WeakPasswordError', () => {
      const error = new WeakPasswordError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for AccountLockedError', () => {
      const error = new AccountLockedError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailAlreadyExistsError', () => {
      const error = new EmailAlreadyExistsError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailNotVerifiedError', () => {
      const error = new EmailNotVerifiedError('test@example.com');
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for InvalidTokenError', () => {
      const error = new InvalidTokenError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailSendError', () => {
      const error = new EmailSendError();
      expect(isKnownAuthError(error)).toBe(true);
    });
  });

  describe('when given unknown error types', () => {
    it('should return false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isKnownAuthError(error)).toBe(false);
    });

    it('should return false for plain object', () => {
      const error = { message: 'Not an error' };
      expect(isKnownAuthError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isKnownAuthError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isKnownAuthError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isKnownAuthError('error string')).toBe(false);
    });
  });
});

describe('mapErrorToHttpResponse', () => {
  let mockLogger: ErrorMapperLogger;

  beforeEach(() => {
    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('InvalidCredentialsError', () => {
    it('should return 401 with correct message', () => {
      const error = new InvalidCredentialsError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 401,
        body: { message: HTTP_ERROR_MESSAGES.InvalidCredentials },
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('WeakPasswordError', () => {
    it('should return 400 with correct message', () => {
      const error = new WeakPasswordError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 400,
        body: { message: HTTP_ERROR_MESSAGES.WeakPassword },
      });
    });

    it('should log warning when logContext is provided', () => {
      const errors = ['Password too short', 'No uppercase letters'];
      const error = new WeakPasswordError({ errors });
      const logContext = { userId: '123', endpoint: '/auth/register' };

      mapErrorToHttpResponse(error, mockLogger, { logContext });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          userId: '123',
          endpoint: '/auth/register',
          errors,
        },
        'Password validation failed',
      );
    });

    it('should not log when logContext is undefined', () => {
      const error = new WeakPasswordError({ errors: ['Too weak'] });
      mapErrorToHttpResponse(error, mockLogger);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle WeakPasswordError without details', () => {
      const error = new WeakPasswordError();
      const logContext = { userId: '123' };

      mapErrorToHttpResponse(error, mockLogger, { logContext });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          userId: '123',
          errors: undefined,
        },
        'Password validation failed',
      );
    });
  });

  describe('AccountLockedError', () => {
    it('should return 429 with retryAfter when provided', () => {
      const error = new AccountLockedError(300);
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 429,
        body: {
          message: HTTP_ERROR_MESSAGES.AccountLocked,
          retryAfter: 300,
        },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return 429 without retryAfter when not provided', () => {
      const error = new AccountLockedError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 429,
        body: {
          message: HTTP_ERROR_MESSAGES.AccountLocked,
        },
      });
    });

    it('should return 429 without retryAfter when explicitly undefined', () => {
      const error = new AccountLockedError(undefined);
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 429,
        body: {
          message: HTTP_ERROR_MESSAGES.AccountLocked,
        },
      });
    });
  });

  describe('EmailAlreadyExistsError', () => {
    it('should return 409 with correct message', () => {
      const error = new EmailAlreadyExistsError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 409,
        body: { message: HTTP_ERROR_MESSAGES.EmailAlreadyRegistered },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('EmailNotVerifiedError', () => {
    it('should return 401 with code and email', () => {
      const error = new EmailNotVerifiedError('test@example.com');
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 401,
        body: {
          message: HTTP_ERROR_MESSAGES.EmailNotVerified,
          code: 'EMAIL_NOT_VERIFIED',
          email: 'test@example.com',
        },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle custom message', () => {
      const error = new EmailNotVerifiedError('user@test.com', 'Custom verification message');
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result.body).toEqual({
        message: HTTP_ERROR_MESSAGES.EmailNotVerified,
        code: 'EMAIL_NOT_VERIFIED',
        email: 'user@test.com',
      });
    });
  });

  describe('InvalidTokenError', () => {
    it('should return 400 with correct message', () => {
      const error = new InvalidTokenError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 400,
        body: { message: HTTP_ERROR_MESSAGES.InvalidToken },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('EmailSendError', () => {
    it('should return 503 with default message', () => {
      const error = new EmailSendError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 503,
        body: { message: HTTP_ERROR_MESSAGES.EmailSendFailed },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should call custom handler when onEmailSendError is provided', () => {
      const error = new EmailSendError('SMTP connection failed');
      const customResponse = {
        status: 502,
        body: { message: 'Custom email error handling' },
      };
      const onEmailSendError = vi.fn().mockReturnValue(customResponse);

      const result = mapErrorToHttpResponse(error, mockLogger, { onEmailSendError });

      expect(onEmailSendError).toHaveBeenCalledWith(error);
      expect(result).toEqual(customResponse);
    });

    it('should use default handler when onEmailSendError is undefined', () => {
      const error = new EmailSendError('SMTP error');
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 503,
        body: { message: HTTP_ERROR_MESSAGES.EmailSendFailed },
      });
    });
  });

  describe('generic Error', () => {
    it('should return 500 and call logger.error', () => {
      const error = new Error('Unexpected database error');
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle Error with no message', () => {
      const error = new Error();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });
  });

  describe('non-Error values', () => {
    it('should return 500 for string without calling logger.error', () => {
      const error = 'string error';
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return 500 for plain object without calling logger.error', () => {
      const error = { code: 'UNKNOWN', details: 'Something went wrong' };
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return 500 for null without calling logger.error', () => {
      const result = mapErrorToHttpResponse(null, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return 500 for undefined without calling logger.error', () => {
      const result = mapErrorToHttpResponse(undefined, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return 500 for number without calling logger.error', () => {
      const result = mapErrorToHttpResponse(42, mockLogger);

      expect(result).toEqual({
        status: 500,
        body: { message: HTTP_ERROR_MESSAGES.InternalError },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('options handling', () => {
    it('should work with empty options object', () => {
      const error = new InvalidCredentialsError();
      const result = mapErrorToHttpResponse(error, mockLogger, {});

      expect(result.status).toBe(401);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should work with no options provided', () => {
      const error = new InvalidCredentialsError();
      const result = mapErrorToHttpResponse(error, mockLogger);

      expect(result.status).toBe(401);
    });

    it('should handle both logContext and onEmailSendError together', () => {
      const error = new WeakPasswordError({ errors: ['Too weak'] });
      const customHandler = vi.fn();
      const logContext = { userId: '123' };

      mapErrorToHttpResponse(error, mockLogger, {
        logContext,
        onEmailSendError: customHandler,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { userId: '123', errors: ['Too weak'] },
        'Password validation failed',
      );
      expect(customHandler).not.toHaveBeenCalled();
    });
  });
});
