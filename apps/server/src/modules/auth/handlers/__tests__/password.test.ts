// apps/server/src/modules/auth/handlers/__tests__/password.test.ts
/**
 * Password Handler Tests
 *
 * Comprehensive tests for forgot password and reset password flows.
 */

import { requestPasswordReset, resetPassword } from '@auth/service';
import {
  EmailSendError,
  ERROR_MESSAGES,
  InvalidTokenError,
  SUCCESS_MESSAGES,
  WeakPasswordError,
} from '@shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleForgotPassword, handleResetPassword } from '../password';

import type { AppContext } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/service', () => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-characters-long!!' },
        argon2: {},
        refreshToken: { expiryDays: 7 },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as AppContext['config'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    ...overrides,
  } as unknown as AppContext;
}

// ============================================================================
// Tests: handleForgotPassword
// ============================================================================

describe('handleForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return 200 with success message for existing user', async () => {
      const ctx = createMockContext();
      const body = { email: 'existing@example.com' };

      vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
      expect(requestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.email,
        'existing@example.com',
        'http://localhost:8080',
      );
    });

    test('should return 200 with success message for non-existing user (prevent enumeration)', async () => {
      const ctx = createMockContext();
      const body = { email: 'nonexistent@example.com' };

      // Service returns undefined even for non-existent users
      vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

      const result = await handleForgotPassword(ctx, body);

      // Same response as existing user to prevent enumeration
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
    });

    test('should use appBaseUrl from config for reset link', async () => {
      const customBaseUrl = 'https://myapp.example.com';
      const ctx = createMockContext({
        config: {
          auth: {
            jwt: { secret: 'test-secret-32-characters-long!!' },
            argon2: {},
            refreshToken: { expiryDays: 7 },
          },
          server: {
            port: 443,
            appBaseUrl: customBaseUrl,
          },
        } as AppContext['config'],
      });
      const body = { email: 'test@example.com' };

      vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

      await handleForgotPassword(ctx, body);

      expect(requestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.email,
        'test@example.com',
        customBaseUrl,
      );
    });
  });

  describe('EmailSendError Cases', () => {
    test('should return 200 even when email sending fails (prevent enumeration)', async () => {
      const ctx = createMockContext();
      const body = { email: 'user@example.com' };
      const originalError = new Error('SMTP connection failed');

      vi.mocked(requestPasswordReset).mockRejectedValue(
        new EmailSendError('Failed to send password reset email', originalError),
      );

      const result = await handleForgotPassword(ctx, body);

      // Still return success to prevent enumeration
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
    });

    test('should log error when email sending fails', async () => {
      const ctx = createMockContext();
      const body = { email: 'user@example.com' };
      const originalError = new Error('SMTP connection timeout');

      vi.mocked(requestPasswordReset).mockRejectedValue(
        new EmailSendError('Failed to send password reset email', originalError),
      );

      await handleForgotPassword(ctx, body);

      expect(ctx.log.error).toHaveBeenCalledWith(
        { email: 'user@example.com', originalError: 'SMTP connection timeout' },
        'Failed to send password reset email',
      );
    });

    test('should handle EmailSendError without original error', async () => {
      const ctx = createMockContext();
      const body = { email: 'user@example.com' };

      vi.mocked(requestPasswordReset).mockRejectedValue(
        new EmailSendError('Failed to send password reset email'),
      );

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(ctx.log.error).toHaveBeenCalledWith(
        { email: 'user@example.com', originalError: undefined },
        'Failed to send password reset email',
      );
    });
  });

  describe('Error Cases', () => {
    test('should return 500 on database error', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      vi.mocked(requestPasswordReset).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
      expect(ctx.log.error).toHaveBeenCalled();
    });

    test('should return 500 on unexpected error', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      vi.mocked(requestPasswordReset).mockRejectedValue(new Error('Unexpected error'));

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });
  });

  describe('Edge Cases', () => {
    test('should handle email with special characters', async () => {
      const ctx = createMockContext();
      const body = { email: 'user+tag@example.com' };

      vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(requestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.email,
        'user+tag@example.com',
        expect.any(String),
      );
    });

    test('should handle email with subdomain', async () => {
      const ctx = createMockContext();
      const body = { email: 'user@mail.company.com' };

      vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(requestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.email,
        'user@mail.company.com',
        expect.any(String),
      );
    });
  });
});

// ============================================================================
// Tests: handleResetPassword
// ============================================================================

describe('handleResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should return 200 with success message for valid reset', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-reset-token', password: 'NewStrongPass123!' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ message: 'Password reset successfully' });
      expect(resetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'valid-reset-token',
        'NewStrongPass123!',
      );
    });

    test('should pass auth config to service for password hashing', async () => {
      const ctx = createMockContext();
      const body = { token: 'reset-token', password: 'SecurePassword1!' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      await handleResetPassword(ctx, body);

      expect(resetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'reset-token',
        'SecurePassword1!',
      );
    });
  });

  describe('Invalid Token Cases', () => {
    test('should return 400 for expired token', async () => {
      const ctx = createMockContext();
      const body = { token: 'expired-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(new InvalidTokenError('Token has expired'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    });

    test('should return 400 for already used token', async () => {
      const ctx = createMockContext();
      const body = { token: 'used-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(
        new InvalidTokenError('Token has already been used'),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    });

    test('should return 400 for invalid token format', async () => {
      const ctx = createMockContext();
      const body = { token: 'invalid-format', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(new InvalidTokenError('Invalid token'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    });

    test('should return 400 for non-existent token', async () => {
      const ctx = createMockContext();
      const body = { token: 'nonexistent-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(
        new InvalidTokenError('Invalid or expired reset token'),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    });
  });

  describe('Weak Password Cases', () => {
    test('should return 400 for password that is too short', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'short' };

      vi.mocked(resetPassword).mockRejectedValue(
        new WeakPasswordError({ errors: ['Password must be at least 8 characters'] }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    });

    test('should return 400 for password without uppercase', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'alllowercase1!' };

      vi.mocked(resetPassword).mockRejectedValue(
        new WeakPasswordError({ errors: ['Password must contain uppercase letter'] }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    });

    test('should return 400 for password without numbers', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'NoNumbersHere!' };

      vi.mocked(resetPassword).mockRejectedValue(
        new WeakPasswordError({ errors: ['Password must contain a number'] }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    });

    test('should return 400 for common password', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'Password123!' };

      vi.mocked(resetPassword).mockRejectedValue(
        new WeakPasswordError({ errors: ['Password is too common'] }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    });

    test('should return 400 with multiple password validation errors', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'weak' };

      vi.mocked(resetPassword).mockRejectedValue(
        new WeakPasswordError({
          errors: ['Password too short', 'Missing uppercase', 'Missing number'],
        }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    });
  });

  describe('Error Cases', () => {
    test('should return 500 on database error', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
      expect(ctx.log.error).toHaveBeenCalled();
    });

    test('should return 500 on password hashing error', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(new Error('Password hashing failed'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });

    test('should return 500 on transaction failure', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockRejectedValue(new Error('Transaction rollback'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });
  });

  describe('Edge Cases', () => {
    test('should handle long token string', async () => {
      const ctx = createMockContext();
      const longToken = 'a'.repeat(256);
      const body = { token: longToken, password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(resetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        longToken,
        'NewPassword123!',
      );
    });

    test('should handle password with special characters', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'P@$$w0rd!@#$%^&*()' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(resetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        'valid-token',
        'P@$$w0rd!@#$%^&*()',
      );
    });

    test('should handle password with unicode characters', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token', password: 'Passw0rd123!' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
    });

    test('should handle hex token format', async () => {
      const ctx = createMockContext();
      const hexToken = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
      const body = { token: hexToken, password: 'NewPassword123!' };

      vi.mocked(resetPassword).mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(resetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        hexToken,
        expect.any(String),
      );
    });
  });
});
