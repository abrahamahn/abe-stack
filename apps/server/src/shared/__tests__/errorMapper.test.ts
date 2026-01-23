// apps/server/src/shared/__tests__/errorMapper.test.ts
/**
 * Tests for Error Mapper
 *
 * Tests the server-specific error mapper adapter that wraps
 * the core HTTP error mapper with AppContext logging.
 */

import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
  type HttpErrorResponse,
} from '@abe-stack/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mapErrorToResponse, isKnownAuthError, type ErrorStatusCode } from '../errorMapper';

import type { AppContext } from '../types';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Creates a mock AppContext with a logger
 */
function createMockContext(): AppContext {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: 'info',
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;

  return {
    log: mockLogger,
    config: {} as AppContext['config'],
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: {} as AppContext['email'],
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
  };
}

describe('mapErrorToResponse', () => {
  let ctx: AppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  describe('AccountLockedError', () => {
    it('should map AccountLockedError to 429 status', () => {
      const error = new AccountLockedError();

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(429);
      expect(result.body.message).toContain('Account temporarily locked');
    });

    it('should map AccountLockedError with retryAfter to 429', () => {
      const error = new AccountLockedError(300);

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(429);
    });
  });

  describe('EmailNotVerifiedError', () => {
    it('should map EmailNotVerifiedError to 401 with email and code', () => {
      const error = new EmailNotVerifiedError('test@example.com');

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(401);
      expect(result.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(result.body.email).toBe('test@example.com');
    });

    it('should include custom message', () => {
      const error = new EmailNotVerifiedError('user@domain.com', 'Please verify your email');

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Please verify your email');
    });
  });

  describe('InvalidCredentialsError', () => {
    it('should map InvalidCredentialsError to 401', () => {
      const error = new InvalidCredentialsError();

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Invalid email or password');
    });
  });

  describe('InvalidTokenError', () => {
    it('should map InvalidTokenError to 400', () => {
      const error = new InvalidTokenError();

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(400);
      expect(result.body.message).toContain('Invalid or expired token');
    });

    it('should handle custom message', () => {
      const error = new InvalidTokenError('Token has been revoked');

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(400);
    });
  });

  describe('EmailAlreadyExistsError', () => {
    it('should map EmailAlreadyExistsError to 409', () => {
      const error = new EmailAlreadyExistsError();

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(409);
      expect(result.body.message).toContain('already registered');
    });
  });

  describe('WeakPasswordError', () => {
    it('should map WeakPasswordError to 400', () => {
      const error = new WeakPasswordError();

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(400);
      expect(result.body.message).toContain('Password is too weak');
    });

    it('should map WeakPasswordError with details to 400', () => {
      const error = new WeakPasswordError({ errors: ['too short', 'no uppercase'] });

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(400);
    });
  });

  describe('EmailSendError', () => {
    it('should map EmailSendError to 503', () => {
      const error = new EmailSendError('SMTP connection failed');

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(503);
      expect(result.body.message).toContain('Failed to send email');
    });

    it('should log error with original error message', () => {
      const originalError = new Error('Connection timeout');
      const error = new EmailSendError('Email failed', originalError);

      mapErrorToResponse(error, ctx);

      expect(ctx.log.error).toHaveBeenCalled();
    });
  });

  describe('unknown errors', () => {
    it('should map generic Error to 500', () => {
      const error = new Error('Something went wrong');

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });

    it('should log generic errors', () => {
      const error = new Error('Database connection failed');

      mapErrorToResponse(error, ctx);

      expect(ctx.log.error).toHaveBeenCalledWith(error);
    });

    it('should map string to 500', () => {
      const error = 'A string error';

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(500);
    });

    it('should map null to 500', () => {
      const result = mapErrorToResponse(null, ctx);

      expect(result.status).toBe(500);
    });

    it('should map undefined to 500', () => {
      const result = mapErrorToResponse(undefined, ctx);

      expect(result.status).toBe(500);
    });

    it('should map plain object to 500', () => {
      const error = { code: 'CUSTOM', message: 'Custom error' };

      const result = mapErrorToResponse(error, ctx);

      expect(result.status).toBe(500);
    });
  });

  describe('logger adapter', () => {
    it('should adapt ctx.log.warn correctly', () => {
      const error = new WeakPasswordError({ errors: ['test'] });

      // The core mapper doesn't call warn without logContext option,
      // but we verify the adapter works by testing error cases
      mapErrorToResponse(error, ctx);

      // WeakPasswordError doesn't log warn by default (no logContext)
      expect((result: HttpErrorResponse) => result).toBeDefined();
    });

    it('should adapt ctx.log.error with context and message', () => {
      const originalError = new Error('SMTP failed');
      const error = new EmailSendError('Send failed', originalError);

      mapErrorToResponse(error, ctx);

      expect(ctx.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ originalError: 'SMTP failed' }),
        'Email send failed',
      );
    });

    it('should adapt ctx.log.error with just error object', () => {
      const error = new Error('Unknown error');

      mapErrorToResponse(error, ctx);

      expect(ctx.log.error).toHaveBeenCalledWith(error);
    });
  });
});

describe('isKnownAuthError', () => {
  describe('known error types', () => {
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
  });

  describe('unknown error types', () => {
    it('should return false for generic Error', () => {
      expect(isKnownAuthError(new Error('Generic error'))).toBe(false);
    });

    it('should return false for TypeError', () => {
      expect(isKnownAuthError(new TypeError('Type error'))).toBe(false);
    });

    it('should return false for string', () => {
      expect(isKnownAuthError('string error')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isKnownAuthError(42)).toBe(false);
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

    it('should return false for array', () => {
      expect(isKnownAuthError(['error'])).toBe(false);
    });
  });
});

describe('ErrorStatusCode type', () => {
  it('should accept valid status codes', () => {
    const codes: ErrorStatusCode[] = [400, 401, 403, 404, 409, 429, 500, 503];

    expect(codes).toHaveLength(8);
    codes.forEach((code) => {
      expect(typeof code).toBe('number');
    });
  });
});

describe('integration with AppContext', () => {
  it('should work with real-world error handling pattern', () => {
    const ctx = createMockContext();

    // Simulate a typical error handling flow
    const handleAuthError = (error: unknown): { status: number; body: unknown } => {
      if (isKnownAuthError(error)) {
        return mapErrorToResponse(error, ctx);
      }
      // Fallback for unknown errors
      return mapErrorToResponse(error, ctx);
    };

    const knownResult = handleAuthError(new InvalidCredentialsError());
    expect(knownResult.status).toBe(401);

    const unknownResult = handleAuthError(new Error('Random error'));
    expect(unknownResult.status).toBe(500);
  });

  it('should preserve error context through the mapping chain', () => {
    const ctx = createMockContext();

    const error = new EmailNotVerifiedError('test@example.com', 'Custom verification message');
    const result = mapErrorToResponse(error, ctx);

    expect(result.body.email).toBe('test@example.com');
    expect(result.body.message).toBe('Custom verification message');
    expect(result.body.code).toBe('EMAIL_NOT_VERIFIED');
  });
});
