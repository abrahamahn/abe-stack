// core/src/modules/auth/http-mapper.test.ts
import { describe, expect, it, vi } from 'vitest';

import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from './errors';
import { HTTP_ERROR_MESSAGES, isKnownAuthError, mapErrorToHttpResponse } from './http-mapper';

/**
 * Creates a mock logger for testing
 */
function createMockLogger(): any {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('mapErrorToHttpResponse', () => {
  describe('AccountLockedError', () => {
    it('should map AccountLockedError to 429 with account locked message', () => {
      const logger = createMockLogger();
      const error = new AccountLockedError();

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(429);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.AccountLocked);
    });

    it('should map AccountLockedError with retryAfter to 429', () => {
      const logger = createMockLogger();
      const error = new AccountLockedError(300);

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(429);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.AccountLocked);
    });
  });

  describe('EmailNotVerifiedError', () => {
    it('should map EmailNotVerifiedError to 401 with email and code', () => {
      const logger = createMockLogger();
      const error = new EmailNotVerifiedError('test@example.com');

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Please verify your email address before logging in');
      expect(result.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(result.body.email).toBe('test@example.com');
    });

    it('should use custom message when provided', () => {
      const logger = createMockLogger();
      const error = new EmailNotVerifiedError('user@domain.com', 'Custom verification message');

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Custom verification message');
      expect(result.body.email).toBe('user@domain.com');
    });
  });

  describe('InvalidCredentialsError', () => {
    it('should map InvalidCredentialsError to 401', () => {
      const logger = createMockLogger();
      const error = new InvalidCredentialsError();

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InvalidCredentials);
    });
  });

  describe('InvalidTokenError', () => {
    it('should map InvalidTokenError to 400', () => {
      const logger = createMockLogger();
      const error = new InvalidTokenError();

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InvalidToken);
    });

    it('should handle InvalidTokenError with custom message', () => {
      const logger = createMockLogger();
      const error = new InvalidTokenError('Token has been revoked');

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InvalidToken);
    });
  });

  describe('EmailAlreadyExistsError', () => {
    it('should map EmailAlreadyExistsError to 409', () => {
      const logger = createMockLogger();
      const error = new EmailAlreadyExistsError();

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(409);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailAlreadyRegistered);
    });
  });

  describe('WeakPasswordError', () => {
    it('should map WeakPasswordError to 400', () => {
      const logger = createMockLogger();
      const error = new WeakPasswordError();

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.WeakPassword);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log warning when logContext is provided', () => {
      const logger = createMockLogger();
      const errorDetails = { errors: ['too short', 'no uppercase'] };
      const error = new WeakPasswordError(errorDetails);

      const result = mapErrorToHttpResponse(error, logger, {
        logContext: { userId: '123', endpoint: '/register' },
      });

      expect(result.status).toBe(400);
      expect(logger.warn).toHaveBeenCalledWith(
        { userId: '123', endpoint: '/register', errors: ['too short', 'no uppercase'] },
        'Password validation failed',
      );
    });
  });

  describe('EmailSendError', () => {
    it('should map EmailSendError to 503 by default', () => {
      const logger = createMockLogger();
      const error = new EmailSendError('SMTP connection failed');

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(503);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailSendFailed);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include original error message in log context', () => {
      const logger = createMockLogger();
      const originalError = new Error('Connection timeout');
      const error = new EmailSendError('Email failed', originalError);

      mapErrorToHttpResponse(error, logger, { logContext: { email: 'test@test.com' } });

      expect(logger.error).toHaveBeenCalledWith(
        { originalError: 'Connection timeout', email: 'test@test.com' },
        'Email send failed',
      );
    });

    it('should use custom handler when provided', () => {
      const logger = createMockLogger();
      const error = new EmailSendError();
      const customHandler = vi.fn().mockReturnValue({
        status: 200 as const,
        body: { message: 'Request accepted' },
      });

      const result = mapErrorToHttpResponse(error, logger, {
        onEmailSendError: customHandler,
      });

      expect(customHandler).toHaveBeenCalledWith(error);
      expect(result.status).toBe(200);
      expect(result.body.message).toBe('Request accepted');
    });

    it('should fall back to default when custom handler returns undefined', () => {
      const logger = createMockLogger();
      const error = new EmailSendError();
      const customHandler = vi.fn().mockReturnValue(undefined);

      const result = mapErrorToHttpResponse(error, logger, {
        onEmailSendError: customHandler,
      });

      expect(customHandler).toHaveBeenCalledWith(error);
      expect(result.status).toBe(503);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.EmailSendFailed);
    });
  });

  describe('unknown errors', () => {
    it('should map unknown Error to 500', () => {
      const logger = createMockLogger();
      const error = new Error('Something went wrong');

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InternalError);
      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('should map string to 500', () => {
      const logger = createMockLogger();
      const error = 'A string error';

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InternalError);
      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('should map null to 500', () => {
      const logger = createMockLogger();

      const result = mapErrorToHttpResponse(null, logger);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InternalError);
    });

    it('should map undefined to 500', () => {
      const logger = createMockLogger();

      const result = mapErrorToHttpResponse(undefined, logger);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InternalError);
    });

    it('should map object without Error prototype to 500', () => {
      const logger = createMockLogger();
      const error = { code: 'CUSTOM', message: 'Custom error object' };

      const result = mapErrorToHttpResponse(error, logger);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe(HTTP_ERROR_MESSAGES.InternalError);
    });
  });
});

describe('isKnownAuthError', () => {
  it('should return true for AccountLockedError', () => {
    expect(isKnownAuthError(new AccountLockedError())).toBe(true);
  });

  it('should return true for EmailNotVerifiedError', () => {
    expect(isKnownAuthError(new EmailNotVerifiedError('test@test.com'))).toBe(true);
  });

  it('should return true for InvalidCredentialsError', () => {
    expect(isKnownAuthError(new InvalidCredentialsError())).toBe(true);
  });

  it('should return true for InvalidTokenError', () => {
    expect(isKnownAuthError(new InvalidTokenError())).toBe(true);
  });

  it('should return true for EmailAlreadyExistsError', () => {
    expect(isKnownAuthError(new EmailAlreadyExistsError())).toBe(true);
  });

  it('should return true for WeakPasswordError', () => {
    expect(isKnownAuthError(new WeakPasswordError())).toBe(true);
  });

  it('should return true for EmailSendError', () => {
    expect(isKnownAuthError(new EmailSendError())).toBe(true);
  });

  it('should return false for generic Error', () => {
    expect(isKnownAuthError(new Error('Generic error'))).toBe(false);
  });

  it('should return false for string', () => {
    expect(isKnownAuthError('string error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isKnownAuthError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isKnownAuthError(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isKnownAuthError({ message: 'error' })).toBe(false);
  });
});

describe('HTTP_ERROR_MESSAGES', () => {
  it('should have all required error messages defined', () => {
    expect(HTTP_ERROR_MESSAGES.AccountLocked).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.InvalidCredentials).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.EmailAlreadyRegistered).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.InvalidToken).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.WeakPassword).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.EmailSendFailed).toBeDefined();
    expect(HTTP_ERROR_MESSAGES.InternalError).toBeDefined();
  });

  it('should have user-friendly messages', () => {
    // Messages should not expose internal details
    expect(HTTP_ERROR_MESSAGES.InternalError).toBe('Internal server error');
    expect(HTTP_ERROR_MESSAGES.InvalidCredentials).toBe('Invalid email or password');
  });
});
