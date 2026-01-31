// modules/auth/src/handlers/verify.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleResendVerification, handleVerifyEmail } from './verify';

// Use vi.hoisted to create mock functions before vi.mock hoisting
const { mockVerifyEmail, mockResendVerificationEmail, mockSetRefreshTokenCookie } = vi.hoisted(
  () => ({
    mockVerifyEmail: vi.fn(),
    mockResendVerificationEmail: vi.fn(),
    mockSetRefreshTokenCookie: vi.fn(),
  }),
);

// Mock mapErrorToResponse with implementation
const mockMapErrorToResponse = vi.hoisted(() =>
  vi.fn((error: unknown, _ctx: unknown) => {
    if (error instanceof Error && error.name === 'InvalidTokenError') {
      return { status: 400, body: { message: error.message } };
    }
    if (error instanceof Error && error.name === 'EmailSendError') {
      return { status: 503, body: { message: 'Email service unavailable' } };
    }
    if (error instanceof Error && error.name === 'UserNotFoundError') {
      return { status: 404, body: { message: 'User not found' } };
    }
    return { status: 500, body: { message: 'Internal server error' } };
  }),
);

// Mock auth service
vi.mock('../service', () => ({
  verifyEmail: mockVerifyEmail,
  resendVerificationEmail: mockResendVerificationEmail,
}));

// Mock the auth utils module
vi.mock('../utils', () => ({
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
}));

// Mock @abe-stack/core to intercept mapErrorToHttpResponse
vi.mock('@abe-stack/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToResponse,
  };
});

describe('Email Verification Handlers', () => {
  const mockCtx = {
    db: {},
    repos: {
      users: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
      },
    },
    email: {},
    emailTemplates: {
      emailVerification: vi.fn(() => ({ subject: 'Verify your email', text: 'verify', html: '<p>verify</p>' })),
      existingAccountRegistrationAttempt: vi.fn(() => ({ subject: 'Registration attempt', text: 'reg', html: '<p>reg</p>' })),
      passwordReset: vi.fn(() => ({ subject: 'Reset your password', text: 'reset', html: '<p>reset</p>' })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({ subject: 'Account locked', text: 'locked', html: '<p>locked</p>' })),
    },
    config: {
      auth: {
        jwt: { secret: 'test-secret', accessTokenExpiry: '15m' },
        refreshToken: { expiryDays: 7 },
      },
      server: {
        appBaseUrl: 'http://localhost:3000',
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };

  const mockReply = {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleVerifyEmail', () => {
    const validToken = 'valid-verification-token-abc123';

    describe('success cases', () => {
      test('should return 200 with user data and token on successful verification', async () => {
        const mockResult = {
          accessToken: 'access-token-xyz',
          refreshToken: 'refresh-token-xyz',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user' as const,
          },
        };
        mockVerifyEmail.mockResolvedValue(mockResult);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: validToken },
          mockReply as never,
        );

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          verified: true,
          token: mockResult.accessToken,
          user: mockResult.user,
        });
        expect(mockVerifyEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.config.auth,
          validToken,
        );
        expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
          mockReply,
          mockResult.refreshToken,
          mockCtx.config.auth,
        );
      });

      test('should set refresh token cookie for auto-login', async () => {
        const mockResult = {
          accessToken: 'access-token-xyz',
          refreshToken: 'new-refresh-token',
          user: {
            id: 'user-456',
            email: 'another@example.com',
            name: null,
            role: 'user' as const,
          },
        };
        mockVerifyEmail.mockResolvedValue(mockResult);

        await handleVerifyEmail(mockCtx as never, { token: validToken }, mockReply as never);

        expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
          mockReply,
          'new-refresh-token',
          mockCtx.config.auth,
        );
      });

      test('should handle user with null name', async () => {
        const mockResult = {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: {
            id: 'user-789',
            email: 'user@example.com',
            name: null,
            role: 'user' as const,
          },
        };
        mockVerifyEmail.mockResolvedValue(mockResult);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: validToken },
          mockReply as never,
        );

        expect(result.status).toBe(200);
        expect(result.body).toHaveProperty('user');
        const body = result.body as { user: { name: string | null } };
        expect(body.user.name).toBeNull();
      });

      test('should handle admin role user verification', async () => {
        const mockResult = {
          accessToken: 'admin-token',
          refreshToken: 'admin-refresh',
          user: {
            id: 'admin-001',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin' as const,
          },
        };
        mockVerifyEmail.mockResolvedValue(mockResult);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: validToken },
          mockReply as never,
        );

        expect(result.status).toBe(200);
        const body = result.body as { user: { role: string } };
        expect(body.user.role).toBe('admin');
      });
    });

    describe('error cases', () => {
      test('should return error response for invalid token', async () => {
        const error = new Error('Invalid or expired verification token');
        error.name = 'InvalidTokenError';
        mockVerifyEmail.mockRejectedValue(error);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: 'invalid-token' },
          mockReply as never,
        );

        expect(result.status).toBe(400);
        expect(result.body).toHaveProperty('message');
      });

      test('should return error response for expired token', async () => {
        const error = new Error('Token has expired');
        error.name = 'InvalidTokenError';
        mockVerifyEmail.mockRejectedValue(error);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: 'expired-token' },
          mockReply as never,
        );

        expect(result.status).toBe(400);
      });

      test('should return 500 for unexpected errors', async () => {
        mockVerifyEmail.mockRejectedValue(new Error('Database connection lost'));

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: validToken },
          mockReply as never,
        );

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Internal server error' });
      });

      test('should use mapErrorToResponse for all errors', async () => {
        const error = new Error('Unknown error');
        mockVerifyEmail.mockRejectedValue(error);

        await handleVerifyEmail(mockCtx as never, { token: validToken }, mockReply as never);

        expect(mockMapErrorToResponse).toHaveBeenCalledWith(error, expect.anything());
      });

      test('should not set cookie when verification fails', async () => {
        const error = new Error('Invalid token');
        error.name = 'InvalidTokenError';
        mockVerifyEmail.mockRejectedValue(error);

        await handleVerifyEmail(mockCtx as never, { token: 'bad-token' }, mockReply as never);

        expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      test('should handle empty token string', async () => {
        const error = new Error('Token is required');
        error.name = 'InvalidTokenError';
        mockVerifyEmail.mockRejectedValue(error);

        const result = await handleVerifyEmail(mockCtx as never, { token: '' }, mockReply as never);

        expect(result.status).toBe(400);
      });

      test('should handle very long token', async () => {
        const error = new Error('Invalid token format');
        error.name = 'InvalidTokenError';
        const longToken = 'a'.repeat(1000);
        mockVerifyEmail.mockRejectedValue(error);

        const result = await handleVerifyEmail(
          mockCtx as never,
          { token: longToken },
          mockReply as never,
        );

        expect(result.status).toBe(400);
      });

      test('should handle token with special characters', async () => {
        const mockResult = {
          accessToken: 'access',
          refreshToken: 'refresh',
          user: { id: 'u1', email: 'test@example.com', name: 'Test', role: 'user' as const },
        };
        mockVerifyEmail.mockResolvedValue(mockResult);

        const tokenWithSpecialChars = 'abc123-def456_ghi789';
        await handleVerifyEmail(
          mockCtx as never,
          { token: tokenWithSpecialChars },
          mockReply as never,
        );

        expect(mockVerifyEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.config.auth,
          tokenWithSpecialChars,
        );
      });
    });
  });

  describe('handleResendVerification', () => {
    const validEmail = 'user@example.com';

    describe('success cases', () => {
      test('should return 200 with success message on successful resend', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const result = await handleResendVerification(mockCtx as never, { email: validEmail });

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          message: 'Verification email sent. Please check your inbox and click the confirmation link.',
        });
        expect(mockResendVerificationEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.email,
          mockCtx.emailTemplates,
          validEmail,
          mockCtx.config.server.appBaseUrl,
        );
      });

      test('should return same success message regardless of whether user exists (prevents enumeration)', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const result = await handleResendVerification(mockCtx as never, {
          email: 'nonexistent@example.com',
        });

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          message: 'Verification email sent. Please check your inbox and click the confirmation link.',
        });
      });

      test('should return same success message when user is already verified (prevents enumeration)', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const result = await handleResendVerification(mockCtx as never, {
          email: 'verified@example.com',
        });

        expect(result.status).toBe(200);
        expect(result.body.message).toContain('Verification email sent');
      });

      test('should pass correct baseUrl from config', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const customCtx = {
          ...mockCtx,
          config: {
            ...mockCtx.config,
            server: { appBaseUrl: 'https://production.example.com' },
          },
        };

        await handleResendVerification(customCtx as never, { email: validEmail });

        expect(mockResendVerificationEmail).toHaveBeenCalledWith(
          customCtx.db,
          customCtx.repos,
          customCtx.email,
          customCtx.emailTemplates,
          validEmail,
          'https://production.example.com',
        );
      });
    });

    describe('error cases', () => {
      test('should return 503 when email service fails', async () => {
        const error = new Error('SMTP connection refused');
        error.name = 'EmailSendError';
        mockResendVerificationEmail.mockRejectedValue(error);

        const result = await handleResendVerification(mockCtx as never, { email: validEmail });

        expect(result.status).toBe(503);
        expect(result.body).toHaveProperty('message');
      });

      test('should return 500 for unexpected errors', async () => {
        mockResendVerificationEmail.mockRejectedValue(new Error('Database error'));

        const result = await handleResendVerification(mockCtx as never, { email: validEmail });

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Internal server error' });
      });

      test('should use mapErrorToResponse for all errors', async () => {
        const error = new Error('Unknown error');
        mockResendVerificationEmail.mockRejectedValue(error);

        await handleResendVerification(mockCtx as never, { email: validEmail });

        expect(mockMapErrorToResponse).toHaveBeenCalledWith(error, expect.anything());
      });
    });

    describe('edge cases', () => {
      test('should handle email with uppercase letters', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        await handleResendVerification(mockCtx as never, { email: 'USER@EXAMPLE.COM' });

        expect(mockResendVerificationEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.email,
          mockCtx.emailTemplates,
          'USER@EXAMPLE.COM',
          expect.anything(),
        );
      });

      test('should handle email with plus sign (gmail style)', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const emailWithPlus = 'user+tag@example.com';
        await handleResendVerification(mockCtx as never, { email: emailWithPlus });

        expect(mockResendVerificationEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.email,
          mockCtx.emailTemplates,
          emailWithPlus,
          expect.anything(),
        );
      });

      test('should handle international domain email', async () => {
        mockResendVerificationEmail.mockResolvedValue(undefined);

        const intlEmail = 'user@example.co.uk';
        const result = await handleResendVerification(mockCtx as never, { email: intlEmail });

        expect(result.status).toBe(200);
        expect(mockResendVerificationEmail).toHaveBeenCalledWith(
          mockCtx.db,
          mockCtx.repos,
          mockCtx.email,
          mockCtx.emailTemplates,
          intlEmail,
          expect.anything(),
        );
      });
    });
  });
});
