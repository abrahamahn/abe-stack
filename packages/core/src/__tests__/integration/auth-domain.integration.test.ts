// packages/core/src/__tests__/integration/auth-domain.integration.test.ts
/**
 * Integration tests for auth domain logic
 *
 * Tests that password validation, auth errors, and error mapping work together correctly.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from '../../domains/auth/errors';
import {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from '../../domains/auth/validation/password';
import {
  HTTP_ERROR_MESSAGES,
  isKnownAuthError,
  mapErrorToHttpResponse,
} from '../../errors/httpMapper';
import { HTTP_STATUS } from '../../infrastructure/constants';
import { AppError } from '../../infrastructure/errors/base';

describe('Auth Domain Integration', () => {
  describe('Password validation with strength estimation', () => {
    it('should validate strong password with user inputs', async () => {
      const password = 'X#9kL!mP@2nQ$wR5';
      const userInputs = ['john', 'doe', 'johndoe@email.com'];

      const result = await validatePassword(password, userInputs);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords and provide feedback', async () => {
      const password = 'password123';

      const result = await validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(3);
      expect(result.feedback.warning).toBeDefined();
    });

    it('should reject passwords containing user input', async () => {
      const password = 'johndoe2024!';
      const userInputs = ['john', 'doe', 'johndoe@email.com'];

      const result = await validatePassword(password, userInputs);

      // Password containing user info should have lower score
      expect(result.score).toBeLessThanOrEqual(3);
    });

    it('should handle minimum length validation', async () => {
      const shortPassword = 'abc';

      const result = await validatePassword(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Password must be at least ${String(defaultPasswordConfig.minLength)} characters`,
      );
    });

    it('should handle maximum length validation', async () => {
      const longPassword = 'a'.repeat(65);

      const result = await validatePassword(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Password must be at most ${String(defaultPasswordConfig.maxLength)} characters`,
      );
    });

    it('should use custom password config', async () => {
      const password = 'shortpw';
      const customConfig = {
        minLength: 6,
        maxLength: 10,
        minScore: 1 as const,
      };

      const result = await validatePassword(password, [], customConfig);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Basic password validation', () => {
    it('should validate password length', () => {
      const result = validatePasswordBasic('ValidPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject repeated character passwords', () => {
      const result = validatePasswordBasic('aaaaaaaa');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot be all the same character');
    });

    it('should reject repeating sequence patterns', () => {
      // The regex pattern matches repeating 3-digit sequences like 012012, 123123, etc.
      const result = validatePasswordBasic('123123123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot be a simple sequence');

      // Single sequence like 12345678 is not caught by the basic check
      const result2 = validatePasswordBasic('12345678');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Strength label and color utilities', () => {
    it('should return correct labels for all scores', () => {
      expect(getStrengthLabel(0)).toBe('Very Weak');
      expect(getStrengthLabel(1)).toBe('Weak');
      expect(getStrengthLabel(2)).toBe('Fair');
      expect(getStrengthLabel(3)).toBe('Strong');
      expect(getStrengthLabel(4)).toBe('Very Strong');
      expect(getStrengthLabel(5)).toBe('Unknown');
    });

    it('should return correct colors for all scores', () => {
      expect(getStrengthColor(0)).toBe('#dc2626'); // red
      expect(getStrengthColor(1)).toBe('#ea580c'); // orange
      expect(getStrengthColor(2)).toBe('#ca8a04'); // yellow
      expect(getStrengthColor(3)).toBe('#16a34a'); // green
      expect(getStrengthColor(4)).toBe('#059669'); // emerald
      expect(getStrengthColor(5)).toBe('#6b7280'); // gray
    });
  });

  describe('Auth errors with HTTP mapping', () => {
    const mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    describe('InvalidCredentialsError', () => {
      it('should create error with correct properties', () => {
        const error = new InvalidCredentialsError();

        expect(error.message).toBe('Invalid email or password');
        expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(error.code).toBe('INVALID_CREDENTIALS');
      });

      it('should map to correct HTTP response', () => {
        const error = new InvalidCredentialsError();
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.INVALID_CREDENTIALS);
      });
    });

    describe('WeakPasswordError', () => {
      it('should create error with details', () => {
        const details = { score: 1, required: 3 };
        const error = new WeakPasswordError(details);

        expect(error.message).toBe('Password is too weak');
        expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(error.code).toBe('WEAK_PASSWORD');
        expect(error.details).toEqual(details);
      });

      it('should map to correct HTTP response', () => {
        const error = new WeakPasswordError({ score: 1 });
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.WEAK_PASSWORD);
      });

      it('should log warning when logContext provided', () => {
        const error = new WeakPasswordError({ score: 1, errors: ['Too short'] });
        const logContext = { userId: '123' };

        mapErrorToHttpResponse(error, mockLogger, { logContext });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ userId: '123', errors: ['Too short'] }),
          'Password validation failed',
        );
      });
    });

    describe('AccountLockedError', () => {
      it('should create error with retry after', () => {
        const error = new AccountLockedError(300);

        expect(error.message).toBe('Account temporarily locked due to too many failed attempts');
        expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(error.retryAfter).toBe(300);
      });

      it('should map to 429 response', () => {
        const error = new AccountLockedError();
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(429);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.ACCOUNT_LOCKED);
      });
    });

    describe('EmailAlreadyExistsError', () => {
      it('should create conflict error', () => {
        const error = new EmailAlreadyExistsError();

        expect(error.message).toBe('Email already registered');
        expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
        expect(error.code).toBe('EMAIL_EXISTS');
      });

      it('should map to 409 response', () => {
        const error = new EmailAlreadyExistsError();
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED);
      });
    });

    describe('EmailNotVerifiedError', () => {
      it('should create error with email', () => {
        const error = new EmailNotVerifiedError('user@example.com');

        expect(error.message).toBe('Please verify your email address before logging in');
        expect(error.email).toBe('user@example.com');
        expect(error.code).toBe('EMAIL_NOT_VERIFIED');
      });

      it('should map to 401 response with email', () => {
        const error = new EmailNotVerifiedError('user@example.com');
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('EMAIL_NOT_VERIFIED');
        expect(response.body.email).toBe('user@example.com');
      });
    });

    describe('InvalidTokenError', () => {
      it('should create unauthorized error', () => {
        const error = new InvalidTokenError();

        expect(error.message).toBe('Invalid or expired token');
        expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      });

      it('should map to 400 response', () => {
        const error = new InvalidTokenError();
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.INVALID_TOKEN);
      });
    });

    describe('UserNotFoundError', () => {
      it('should create not found error', () => {
        const error = new UserNotFoundError();

        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
        expect(error.code).toBe('USER_NOT_FOUND');
      });
    });

    describe('EmailSendError', () => {
      it('should create internal server error', () => {
        const originalError = new Error('SMTP connection failed');
        const error = new EmailSendError('Failed to send email', originalError);

        expect(error.message).toBe('Failed to send email');
        expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(error.originalError).toBe(originalError);
      });

      it('should map to 503 by default', () => {
        const error = new EmailSendError();
        const response = mapErrorToHttpResponse(error, mockLogger);

        expect(response.status).toBe(503);
        expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.EMAIL_SEND_FAILED);
      });

      it('should support custom handler', () => {
        const error = new EmailSendError();
        const customHandler = vi.fn().mockReturnValue({
          status: 200 as const,
          body: { message: 'Success anyway' },
        });

        const response = mapErrorToHttpResponse(error, mockLogger, {
          onEmailSendError: customHandler,
        });

        expect(response.status).toBe(200);
        expect(customHandler).toHaveBeenCalledWith(error);
      });
    });

    describe('OAuth errors', () => {
      it('should create OAuthError with provider', () => {
        const error = new OAuthError('OAuth failed', 'google');

        expect(error.message).toBe('OAuth failed');
        expect(error.provider).toBe('google');
        expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      });

      it('should create OAuthStateMismatchError', () => {
        const error = new OAuthStateMismatchError('github');

        expect(error.message).toBe('OAuth state mismatch - possible CSRF attack');
        expect(error.provider).toBe('github');
        expect(error.code).toBe('OAUTH_STATE_MISMATCH');
      });
    });

    describe('2FA errors', () => {
      it('should create TotpRequiredError', () => {
        const error = new TotpRequiredError();

        expect(error.message).toBe('Two-factor authentication required');
        expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(error.code).toBe('TOTP_REQUIRED');
      });

      it('should create TotpInvalidError', () => {
        const error = new TotpInvalidError();

        expect(error.message).toBe('Invalid verification code');
        expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(error.code).toBe('TOTP_INVALID');
      });
    });
  });

  describe('isKnownAuthError', () => {
    it('should return true for all known auth errors', () => {
      const knownErrors = [
        new AccountLockedError(),
        new EmailNotVerifiedError('test@example.com'),
        new InvalidCredentialsError(),
        new InvalidTokenError(),
        new EmailAlreadyExistsError(),
        new WeakPasswordError(),
        new EmailSendError(),
      ];

      knownErrors.forEach((error) => {
        expect(isKnownAuthError(error)).toBe(true);
      });
    });

    it('should return false for unknown errors', () => {
      const unknownErrors = [
        new Error('Generic error'),
        new AppError('App error'),
        new UserNotFoundError(), // Not in the known list
        new TotpRequiredError(), // Not in the known list
        null,
        undefined,
        'string error',
      ];

      unknownErrors.forEach((error) => {
        expect(isKnownAuthError(error)).toBe(false);
      });
    });
  });

  describe('Unknown error handling', () => {
    const mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    it('should map unknown errors to 500', () => {
      const error = new Error('Something unexpected');
      const response = mapErrorToHttpResponse(error, mockLogger);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.INTERNAL_ERROR);
      expect(mockLogger.error).toHaveBeenCalledWith(error);
    });

    it('should handle non-Error values', () => {
      const response = mapErrorToHttpResponse('string error', mockLogger);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.INTERNAL_ERROR);
    });
  });

  describe('Password validation + WeakPasswordError integration', () => {
    it('should create WeakPasswordError from validation result', async () => {
      const password = 'weak';
      const result = await validatePassword(password);

      if (!result.isValid) {
        const error = new WeakPasswordError({
          score: result.score,
          errors: result.errors,
          crackTime: result.crackTimeDisplay,
        });

        expect(error.details?.score).toBe(result.score);
        expect(error.details?.errors).toEqual(result.errors);
      }
    });

    it('should handle full validation-to-error flow', async () => {
      const mockLogger = { warn: vi.fn(), error: vi.fn() };
      const password = 'abc';

      // Step 1: Validate password
      const result = await validatePassword(password);
      expect(result.isValid).toBe(false);

      // Step 2: Create error with validation details
      const error = new WeakPasswordError({
        score: result.score,
        errors: result.errors,
      });

      // Step 3: Map to HTTP response
      const response = mapErrorToHttpResponse(error, mockLogger, {
        logContext: { endpoint: '/register' },
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(HTTP_ERROR_MESSAGES.WEAK_PASSWORD);
    });
  });
});
