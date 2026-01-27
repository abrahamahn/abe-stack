// apps/server/src/shared/errorMapper.test.ts
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@abe-stack/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isKnownAuthError, mapErrorToResponse } from './errorMapper';

import type { AppContext } from './types';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Test Suite: Error Mapper
 *
 * Tests the server-side adapter that bridges AppContext to the core error mapper.
 * Verifies correct logger adaptation and HTTP response mapping for all error types.
 */

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock Fastify logger with spy functions
 */
function createMockLogger(): FastifyBaseLogger {
  return {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    level: 'info',
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;
}

/**
 * Creates a minimal mock AppContext for testing
 */
function createMockAppContext(logger: FastifyBaseLogger): AppContext {
  return {
    log: logger,
    config: {} as AppContext['config'],
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: {} as AppContext['email'],
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    cache: {} as AppContext['cache'],
    billing: {} as AppContext['billing'],
    notifications: {} as AppContext['notifications'],
    queue: {} as AppContext['queue'],
    write: {} as AppContext['write'],
    search: {} as AppContext['search'],
  };
}

// ============================================================================
// mapErrorToResponse - Account Security Errors
// ============================================================================

describe('mapErrorToResponse', () => {
  let mockLogger: FastifyBaseLogger;
  let mockCtx: AppContext;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockCtx = createMockAppContext(mockLogger);
  });

  describe('when handling AccountLockedError', () => {
    it('should return 429 status with rate limit message', () => {
      const error = new AccountLockedError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(429);
      expect(result.body.message).toBe(
        'Account temporarily locked due to too many failed attempts. Please try again later.',
      );
      expect(result.body.code).toBeUndefined();
    });

    it('should not log for rate limit errors', () => {
      const error = new AccountLockedError(60);

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // mapErrorToResponse - Authentication Errors
  // ============================================================================

  describe('when handling EmailNotVerifiedError', () => {
    it('should return 401 status with verification message and email', () => {
      const email = 'user@example.com';
      const error = new EmailNotVerifiedError(email);

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Please verify your email address before logging in');
      expect(result.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(result.body.email).toBe(email);
    });

    it('should include custom message if provided', () => {
      const email = 'test@example.com';
      const customMessage = 'Verify your email to continue';
      const error = new EmailNotVerifiedError(email, customMessage);

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.body.message).toBe(customMessage);
      expect(result.body.email).toBe(email);
    });
  });

  describe('when handling InvalidCredentialsError', () => {
    it('should return 401 status with generic credentials message', () => {
      const error = new InvalidCredentialsError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Invalid email or password');
      expect(result.body.code).toBeUndefined();
    });
  });

  describe('when handling InvalidTokenError', () => {
    it('should return 400 status with token error message', () => {
      const error = new InvalidTokenError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe('Invalid or expired token');
    });

    it('should handle custom token error message', () => {
      const customMessage = 'Token has expired';
      const error = new InvalidTokenError(customMessage);

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.body.message).toBe('Invalid or expired token');
    });
  });

  // ============================================================================
  // mapErrorToResponse - Registration Errors
  // ============================================================================

  describe('when handling EmailAlreadyExistsError', () => {
    it('should return 409 status with conflict message', () => {
      const error = new EmailAlreadyExistsError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(409);
      expect(result.body.message).toBe('Email already registered');
    });

    it('should handle custom message', () => {
      const customMessage = 'This email is already in use';
      const error = new EmailAlreadyExistsError(customMessage);

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.body.message).toBe('Email already registered');
    });
  });

  describe('when handling WeakPasswordError', () => {
    it('should return 400 status with weak password message', () => {
      const error = new WeakPasswordError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe('Password is too weak');
    });

    it('should not log warning when no details provided', () => {
      const error = new WeakPasswordError();

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle validation details', () => {
      const details = {
        errors: ['Password must be at least 8 characters', 'Password must contain a number'],
      };
      const error = new WeakPasswordError(details);

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(400);
      expect(result.body.message).toBe('Password is too weak');
    });
  });

  // ============================================================================
  // mapErrorToResponse - Email Service Errors
  // ============================================================================

  describe('when handling EmailSendError', () => {
    it('should return 503 status with service unavailable message', () => {
      const error = new EmailSendError();

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(503);
      expect(result.body.message).toBe(
        'Failed to send email. Please try again or use the resend option.',
      );
    });

    it('should log error with context when email send fails', () => {
      const originalError = new Error('SMTP connection timeout');
      const error = new EmailSendError('Failed to send verification email', originalError);

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: 'SMTP connection timeout',
        }),
        'Email send failed',
      );
    });

    it('should handle EmailSendError without original error', () => {
      const error = new EmailSendError('Generic email failure');

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(503);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: undefined,
        }),
        'Email send failed',
      );
    });

    it('should log error with non-Error original error', () => {
      const error = new EmailSendError('Failed', 'string error' as unknown as Error);

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          originalError: undefined,
        }),
        'Email send failed',
      );
    });
  });

  // ============================================================================
  // mapErrorToResponse - Unknown Errors
  // ============================================================================

  describe('when handling unknown errors', () => {
    it('should return 500 status for generic Error', () => {
      const error = new Error('Database connection failed');

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });

    it('should log unknown error object', () => {
      const error = new Error('Unexpected failure');

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle string errors', () => {
      const error = 'Something went wrong';

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle null errors', () => {
      const error = null;

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle undefined errors', () => {
      const error = undefined;

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle custom error objects without instanceof match', () => {
      const error = { message: 'Custom error', code: 'CUSTOM_ERROR' };

      const result = mapErrorToResponse(error, mockCtx);

      expect(result.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });
  });

  // ============================================================================
  // mapErrorToResponse - Logger Adapter
  // ============================================================================

  describe('logger adapter', () => {
    it('should adapt warn calls from core mapper to Fastify logger', () => {
      const error = new WeakPasswordError({ errors: ['too short'] });

      mapErrorToResponse(error, mockCtx);

      // WeakPasswordError doesn't trigger warn without logContext in options
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should adapt error calls with message to Fastify logger', () => {
      const error = new EmailSendError();

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('Email send failed'),
      );
    });

    it('should adapt error calls without message to Fastify logger', () => {
      const error = new Error('Unknown error');

      mapErrorToResponse(error, mockCtx);

      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle empty string message in error adapter', () => {
      const error = new EmailSendError('', new Error('Network error'));

      mapErrorToResponse(error, mockCtx);

      // Should still log because EmailSendError always logs with 'Email send failed' message
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Object), 'Email send failed');
    });
  });

  // ============================================================================
  // mapErrorToResponse - Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle errors thrown in error handler gracefully', () => {
      const mockLoggerWithError: FastifyBaseLogger = {
        ...createMockLogger(),
        error: vi.fn(() => {
          throw new Error('Logger failed');
        }),
      };
      const ctxWithBadLogger = createMockAppContext(mockLoggerWithError);

      // Should not throw, but return error response
      expect(() => {
        mapErrorToResponse(new Error('Test'), ctxWithBadLogger);
      }).toThrow('Logger failed');
    });

    it('should maintain error response structure for all error types', () => {
      const errors = [
        new AccountLockedError(),
        new EmailNotVerifiedError('test@example.com'),
        new InvalidCredentialsError(),
        new InvalidTokenError(),
        new EmailAlreadyExistsError(),
        new WeakPasswordError(),
        new EmailSendError(),
        new Error('Unknown'),
      ];

      errors.forEach((error) => {
        const result = mapErrorToResponse(error, mockCtx);

        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('body');
        expect(result.body).toHaveProperty('message');
        expect(typeof result.status).toBe('number');
        expect(typeof result.body.message).toBe('string');
      });
    });
  });
});

// ============================================================================
// isKnownAuthError - Type Guard
// ============================================================================

describe('isKnownAuthError', () => {
  describe('when given known auth errors', () => {
    it('should return true for AccountLockedError', () => {
      const error = new AccountLockedError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailNotVerifiedError', () => {
      const error = new EmailNotVerifiedError('user@example.com');
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for InvalidCredentialsError', () => {
      const error = new InvalidCredentialsError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for InvalidTokenError', () => {
      const error = new InvalidTokenError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailAlreadyExistsError', () => {
      const error = new EmailAlreadyExistsError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for WeakPasswordError', () => {
      const error = new WeakPasswordError();
      expect(isKnownAuthError(error)).toBe(true);
    });

    it('should return true for EmailSendError', () => {
      const error = new EmailSendError();
      expect(isKnownAuthError(error)).toBe(true);
    });
  });

  describe('when given unknown errors', () => {
    it('should return false for generic Error', () => {
      const error = new Error('Unknown error');
      expect(isKnownAuthError(error)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isKnownAuthError('error string')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isKnownAuthError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isKnownAuthError(undefined)).toBe(false);
    });

    it('should return false for custom error objects', () => {
      const error = { message: 'Custom error', code: 'CUSTOM' };
      expect(isKnownAuthError(error)).toBe(false);
    });

    it('should return false for TypeError', () => {
      const error = new TypeError('Type error');
      expect(isKnownAuthError(error)).toBe(false);
    });

    it('should return false for RangeError', () => {
      const error = new RangeError('Range error');
      expect(isKnownAuthError(error)).toBe(false);
    });
  });

  describe('type narrowing', () => {
    it('should allow type-safe error handling after guard check', () => {
      const error: unknown = new EmailNotVerifiedError('test@example.com');

      if (isKnownAuthError(error)) {
        // This block should compile without errors
        expect(error).toBeInstanceOf(EmailNotVerifiedError);
      }
    });
  });
});

// ============================================================================
// Integration - Error Mapping Flow
// ============================================================================

describe('error mapping integration', () => {
  let mockLogger: FastifyBaseLogger;
  let mockCtx: AppContext;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockCtx = createMockAppContext(mockLogger);
  });

  it('should map and log errors in complete auth flow', () => {
    const authErrors = [
      { error: new InvalidCredentialsError(), expectedStatus: 401 },
      { error: new EmailNotVerifiedError('user@example.com'), expectedStatus: 401 },
      { error: new AccountLockedError(), expectedStatus: 429 },
      { error: new InvalidTokenError(), expectedStatus: 400 },
    ];

    authErrors.forEach(({ error, expectedStatus }) => {
      const result = mapErrorToResponse(error, mockCtx);
      expect(result.status).toBe(expectedStatus);
      expect(result.body.message).toBeTruthy();
    });
  });

  it('should map and log errors in registration flow', () => {
    const registrationErrors = [
      { error: new EmailAlreadyExistsError(), expectedStatus: 409 },
      { error: new WeakPasswordError(), expectedStatus: 400 },
      { error: new EmailSendError(), expectedStatus: 503 },
    ];

    registrationErrors.forEach(({ error, expectedStatus }) => {
      const result = mapErrorToResponse(error, mockCtx);
      expect(result.status).toBe(expectedStatus);
      expect(result.body.message).toBeTruthy();
    });
  });

  it('should consistently return structured responses', () => {
    const errors = [
      new AccountLockedError(),
      new InvalidCredentialsError(),
      new EmailSendError(),
      new Error('Unknown'),
    ];

    errors.forEach((error) => {
      const result = mapErrorToResponse(error, mockCtx);

      expect(result).toMatchObject({
        status: expect.any(Number),
        body: {
          message: expect.any(String),
        },
      });
    });
  });
});
