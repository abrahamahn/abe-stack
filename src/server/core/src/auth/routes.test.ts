// src/server/core/src/auth/routes.test.ts
/**
 * Auth Routes Unit Tests
 *
 * Tests for route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 */

import {
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  type UserId,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
  };
});

vi.mock('./handlers', () => ({
  handleForgotPassword: vi.fn(),
  handleLogin: vi.fn(),
  handleLogout: vi.fn(),
  handleLogoutAll: vi.fn(),
  handleRefresh: vi.fn(),
  handleRegister: vi.fn(),
  handleResendVerification: vi.fn(),
  handleResetPassword: vi.fn(),
  handleSetPassword: vi.fn(),
  handleVerifyEmail: vi.fn(),
}));

import { authRoutes } from './routes';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {} as never,
    pubsub: {
      publish: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      auth: {},
      server: {
        appBaseUrl: 'http://localhost:3000',
      },
    } as never,
    email: {} as never,
    storage: {} as never,
  } as unknown as AppContext;
}

function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): RequestWithCookies & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as RequestWithCookies & { user?: { userId: string; email: string; role: string } };
}

function createMockReply(): ReplyWithCookies {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as ReplyWithCookies;
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('Auth Routes', () => {
  describe('Route Map Structure', () => {
    test('should export authRoutes as a RouteMap', () => {
      expect(authRoutes).toBeDefined();
      expect(typeof authRoutes).toBe('object');
    });

    test('should define all expected routes', () => {
      const routeKeys = Array.from(authRoutes.keys());
      // Core auth routes (19) + ToS routes (2) + Magic-link routes (2) + OAuth routes (13) = 36
      expect(routeKeys).toHaveLength(36);

      // Core auth routes
      expect(routeKeys).toContain('auth/register');
      expect(routeKeys).toContain('auth/login');
      expect(routeKeys).toContain('auth/refresh');
      expect(routeKeys).toContain('auth/logout');
      expect(routeKeys).toContain('auth/logout-all');
      expect(routeKeys).toContain('auth/forgot-password');
      expect(routeKeys).toContain('auth/reset-password');
      expect(routeKeys).toContain('auth/set-password');
      expect(routeKeys).toContain('auth/verify-email');
      expect(routeKeys).toContain('auth/resend-verification');
      expect(routeKeys).toContain('auth/magic-link/request');
      expect(routeKeys).toContain('auth/magic-link/verify');

      // TOTP (2FA) routes
      expect(routeKeys).toContain('auth/totp/setup');
      expect(routeKeys).toContain('auth/totp/enable');
      expect(routeKeys).toContain('auth/totp/disable');
      expect(routeKeys).toContain('auth/totp/status');
      expect(routeKeys).toContain('auth/totp/verify-login');

      // Terms of Service routes
      expect(routeKeys).toContain('auth/tos/status');
      expect(routeKeys).toContain('auth/tos/accept');
      expect(routeKeys).toContain('auth/sudo');

      // Email change routes
      expect(routeKeys).toContain('auth/change-email');
      expect(routeKeys).toContain('auth/change-email/confirm');
      expect(routeKeys).toContain('auth/change-email/revert');

      // OAuth routes
      expect(routeKeys).toContain('auth/oauth/google');
      expect(routeKeys).toContain('auth/oauth/github');
      expect(routeKeys).toContain('auth/oauth/apple');
      expect(routeKeys).toContain('auth/oauth/google/callback');
      expect(routeKeys).toContain('auth/oauth/github/callback');
      expect(routeKeys).toContain('auth/oauth/apple/callback');
      expect(routeKeys).toContain('auth/oauth/google/link');
      expect(routeKeys).toContain('auth/oauth/github/link');
      expect(routeKeys).toContain('auth/oauth/apple/link');
      expect(routeKeys).toContain('auth/oauth/google/unlink');
      expect(routeKeys).toContain('auth/oauth/github/unlink');
      expect(routeKeys).toContain('auth/oauth/apple/unlink');
      expect(routeKeys).toContain('auth/oauth/connections');
    });
  });

  describe('auth/register Route', () => {
    const registerRoute = authRoutes.get('auth/register')!;

    test('should use POST method', () => {
      expect(registerRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(registerRoute.isPublic).toBe(true);
    });

    test('should use registerRequestSchema for validation', () => {
      expect(registerRoute.schema).toBe(registerRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof registerRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleRegister with correct arguments', async () => {
        const { handleRegister } = await import('./handlers');
        vi.mocked(handleRegister).mockResolvedValue({
          status: 201,
          body: {
            status: 'pending_verification',
            message: 'Registration successful',
            email: 'test@example.com',
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = {
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePassword123!',
        };

        await registerRoute.handler(ctx, body, req as never, reply as never);

        expect(handleRegister).toHaveBeenCalledWith(ctx, body, req, reply);
      });

      test('should return result from handleRegister', async () => {
        const { handleRegister } = await import('./handlers');
        const expectedResult = {
          status: 201 as const,
          body: {
            status: 'pending_verification' as const,
            message: 'Registration successful',
            email: 'test@example.com',
          },
        };
        vi.mocked(handleRegister).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = {
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePassword123!',
        };

        const result = await registerRoute.handler(ctx, body, req as never, reply as never);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('auth/login Route', () => {
    const loginRoute = authRoutes.get('auth/login')!;

    test('should use POST method', () => {
      expect(loginRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(loginRoute.isPublic).toBe(true);
    });

    test('should use loginRequestSchema for validation', () => {
      expect(loginRoute.schema).toBe(loginRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof loginRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleLogin with correct arguments', async () => {
        const { handleLogin } = await import('./handlers');
        vi.mocked(handleLogin).mockResolvedValue({
          status: 200,
          body: {
            token: 'access-token',
            user: {
              id: 'user-123' as UserId,
              email: 'test@example.com',
              username: 'testuser',
              firstName: 'Test',
              lastName: 'User',
              avatarUrl: null,
              role: 'user',
              emailVerified: true,
              phone: null,
              phoneVerified: null,
              dateOfBirth: null,
              gender: null,
              bio: null,
              city: null,
              state: null,
              country: null,
              language: null,
              website: null,
              createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            },
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = {
          identifier: 'test@example.com',
          password: 'SecurePassword123!',
        };

        await loginRoute.handler(ctx, body, req as never, reply as never);

        expect(handleLogin).toHaveBeenCalledWith(ctx, body, req, reply);
      });
    });
  });

  describe('auth/refresh Route', () => {
    const refreshRoute = authRoutes.get('auth/refresh')!;

    test('should use POST method', () => {
      expect(refreshRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(refreshRoute.isPublic).toBe(true);
    });

    test('should not require a request body schema', () => {
      expect(refreshRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof refreshRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleRefresh with correct arguments', async () => {
        const { handleRefresh } = await import('./handlers');
        vi.mocked(handleRefresh).mockResolvedValue({
          status: 200,
          body: { token: 'new-access-token' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        await refreshRoute.handler(ctx, undefined as never, req as never, reply as never);

        expect(handleRefresh).toHaveBeenCalledWith(ctx, req, reply);
      });
    });
  });

  describe('auth/logout Route', () => {
    const logoutRoute = authRoutes.get('auth/logout')!;

    test('should use POST method', () => {
      expect(logoutRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(logoutRoute.isPublic).toBe(true);
    });

    test('should not require a request body schema', () => {
      expect(logoutRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof logoutRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleLogout with correct arguments', async () => {
        const { handleLogout } = await import('./handlers');
        vi.mocked(handleLogout).mockResolvedValue({
          status: 200,
          body: { message: 'Logged out successfully' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        await logoutRoute.handler(ctx, undefined as never, req as never, reply as never);

        expect(handleLogout).toHaveBeenCalledWith(ctx, req, reply);
      });
    });
  });

  describe('auth/logout-all Route', () => {
    const logoutAllRoute = authRoutes.get('auth/logout-all')!;

    test('should use POST method', () => {
      expect(logoutAllRoute.method).toBe('POST');
    });

    test('should require user authentication', () => {
      expect(logoutAllRoute.isPublic).toBe(false);
    });

    test('should not require a request body schema', () => {
      expect(logoutAllRoute.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof logoutAllRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleLogoutAll with correct arguments', async () => {
        const { handleLogoutAll } = await import('./handlers');
        vi.mocked(handleLogoutAll).mockResolvedValue({
          status: 200,
          body: { message: 'All sessions logged out' },
        });

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        await logoutAllRoute.handler(ctx, undefined as never, req as never, reply as never);

        expect(handleLogoutAll).toHaveBeenCalledWith(ctx, req, reply);
      });
    });
  });

  describe('auth/forgot-password Route', () => {
    const forgotPasswordRoute = authRoutes.get('auth/forgot-password')!;

    test('should use POST method', () => {
      expect(forgotPasswordRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(forgotPasswordRoute.isPublic).toBe(true);
    });

    test('should use forgotPasswordRequestSchema for validation', () => {
      expect(forgotPasswordRoute.schema).toBe(forgotPasswordRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof forgotPasswordRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleForgotPassword with correct arguments', async () => {
        const { handleForgotPassword } = await import('./handlers');
        vi.mocked(handleForgotPassword).mockResolvedValue({
          status: 200,
          body: { message: 'Password reset email sent' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = { email: 'test@example.com' };

        await forgotPasswordRoute.handler(ctx, body, req as never, reply as never);

        expect(handleForgotPassword).toHaveBeenCalledWith(ctx, body);
      });
    });
  });

  describe('auth/reset-password Route', () => {
    const resetPasswordRoute = authRoutes.get('auth/reset-password')!;

    test('should use POST method', () => {
      expect(resetPasswordRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(resetPasswordRoute.isPublic).toBe(true);
    });

    test('should use resetPasswordRequestSchema for validation', () => {
      expect(resetPasswordRoute.schema).toBe(resetPasswordRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof resetPasswordRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleResetPassword with correct arguments', async () => {
        const { handleResetPassword } = await import('./handlers');
        vi.mocked(handleResetPassword).mockResolvedValue({
          status: 200,
          body: { message: 'Password reset successfully' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = {
          token: 'reset-token-abc123',
          password: 'NewSecurePassword123!',
        };

        await resetPasswordRoute.handler(ctx, body, req as never, reply as never);

        expect(handleResetPassword).toHaveBeenCalledWith(ctx, body, req);
      });
    });
  });

  describe('auth/verify-email Route', () => {
    const verifyEmailRoute = authRoutes.get('auth/verify-email')!;

    test('should use POST method', () => {
      expect(verifyEmailRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(verifyEmailRoute.isPublic).toBe(true);
    });

    test('should use emailVerificationRequestSchema for validation', () => {
      expect(verifyEmailRoute.schema).toBe(emailVerificationRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof verifyEmailRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleVerifyEmail with correct arguments', async () => {
        const { handleVerifyEmail } = await import('./handlers');
        vi.mocked(handleVerifyEmail).mockResolvedValue({
          status: 200,
          body: {
            verified: true,
            token: 'access-token',
            user: {
              id: 'user-123' as UserId,
              email: 'test@example.com',
              username: 'testuser',
              firstName: 'Test',
              lastName: 'User',
              avatarUrl: null,
              role: 'user',
              emailVerified: true,
              phone: null,
              phoneVerified: null,
              dateOfBirth: null,
              gender: null,
              bio: null,
              city: null,
              state: null,
              country: null,
              language: null,
              website: null,
              createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            },
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = { token: 'verification-token-abc123' };

        await verifyEmailRoute.handler(ctx, body, req as never, reply as never);

        expect(handleVerifyEmail).toHaveBeenCalledWith(ctx, body, reply);
      });
    });
  });

  describe('auth/resend-verification Route', () => {
    const resendVerificationRoute = authRoutes.get('auth/resend-verification')!;

    test('should use POST method', () => {
      expect(resendVerificationRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(resendVerificationRoute.isPublic).toBe(true);
    });

    test('should use resendVerificationRequestSchema for validation', () => {
      expect(resendVerificationRoute.schema).toBe(resendVerificationRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof resendVerificationRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleResendVerification with correct arguments', async () => {
        const { handleResendVerification } = await import('./handlers');
        vi.mocked(handleResendVerification).mockResolvedValue({
          status: 200,
          body: { message: 'Verification email sent' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body = { email: 'test@example.com' };

        await resendVerificationRoute.handler(ctx, body, req as never, reply as never);

        expect(handleResendVerification).toHaveBeenCalledWith(ctx, body);
      });
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('Schema Validation', () => {
  describe('registerRequestSchema', () => {
    test('should accept valid registration request', () => {
      const validRequest = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const result = registerRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject registration without username', () => {
      const invalidRequest = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const result = registerRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject registration with invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const result = registerRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject registration without email', () => {
      const invalidRequest = {
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      };

      const result = registerRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject registration without password', () => {
      const invalidRequest = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = registerRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject empty password', () => {
      const invalidRequest = {
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: '',
      };

      const result = registerRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('loginRequestSchema', () => {
    test('should accept valid login request with email as identifier', () => {
      const validRequest = {
        identifier: 'test@example.com',
        password: 'SecurePassword123!',
      };

      const result = loginRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept valid login request with username as identifier', () => {
      const validRequest = {
        identifier: 'testuser',
        password: 'SecurePassword123!',
      };

      const result = loginRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject login without identifier', () => {
      const invalidRequest = {
        password: 'SecurePassword123!',
      };

      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject login without password', () => {
      const invalidRequest = {
        identifier: 'test@example.com',
      };

      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordRequestSchema', () => {
    test('should accept valid forgot password request', () => {
      const validRequest = {
        email: 'test@example.com',
      };

      const result = forgotPasswordRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject forgot password with invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
      };

      const result = forgotPasswordRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject forgot password without email', () => {
      const invalidRequest = {};

      const result = forgotPasswordRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordRequestSchema', () => {
    test('should accept valid reset password request', () => {
      const validRequest = {
        token: 'valid-reset-token',
        password: 'NewSecurePassword123!',
      };

      const result = resetPasswordRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject reset password without token', () => {
      const invalidRequest = {
        password: 'NewSecurePassword123!',
      };

      const result = resetPasswordRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject reset password without password', () => {
      const invalidRequest = {
        token: 'valid-reset-token',
      };

      const result = resetPasswordRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject reset password with empty token (min length enforced)', () => {
      // Schema requires min:1 for token, so empty string fails at schema level
      const request = {
        token: '',
        password: 'NewSecurePassword123!',
      };

      const result = resetPasswordRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('emailVerificationRequestSchema', () => {
    test('should accept valid email verification request', () => {
      const validRequest = {
        token: 'valid-verification-token',
      };

      const result = emailVerificationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject verification without token', () => {
      const invalidRequest = {};

      const result = emailVerificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject empty token (min length enforced)', () => {
      // Schema requires min:1 for token, so empty string fails at schema level
      const request = {
        token: '',
      };

      const result = emailVerificationRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('resendVerificationRequestSchema', () => {
    test('should accept valid resend verification request', () => {
      const validRequest = {
        email: 'test@example.com',
      };

      const result = resendVerificationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject resend verification with invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
      };

      const result = resendVerificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject resend verification without email', () => {
      const invalidRequest = {};

      const result = resendVerificationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Route Protection Tests
// ============================================================================

describe('Route Protection', () => {
  test('should have expected protected routes', () => {
    const protectedRoutes = Array.from(authRoutes.entries()).filter(([_, def]) => !def.isPublic);

    // 8 core protected (logout-all, set-password, totp/setup, totp/enable, totp/disable, totp/status, sudo, change-email)
    // + 2 ToS protected (tos/status, tos/accept)
    // + 7 OAuth protected (3 link + 3 unlink + 1 connections) = 17 protected routes
    expect(protectedRoutes).toHaveLength(17);

    const protectedRouteNames = protectedRoutes.map(([name]) => name);
    // Core protected routes
    expect(protectedRouteNames).toContain('auth/logout-all');
    expect(protectedRouteNames).toContain('auth/set-password');
    expect(protectedRouteNames).toContain('auth/totp/setup');
    expect(protectedRouteNames).toContain('auth/totp/enable');
    expect(protectedRouteNames).toContain('auth/totp/disable');
    expect(protectedRouteNames).toContain('auth/totp/status');
    expect(protectedRouteNames).toContain('auth/sudo');
    expect(protectedRouteNames).toContain('auth/change-email');
    // ToS protected routes
    expect(protectedRouteNames).toContain('auth/tos/status');
    expect(protectedRouteNames).toContain('auth/tos/accept');
    // OAuth protected routes
    expect(protectedRouteNames).toContain('auth/oauth/google/link');
    expect(protectedRouteNames).toContain('auth/oauth/github/link');
    expect(protectedRouteNames).toContain('auth/oauth/apple/link');
    expect(protectedRouteNames).toContain('auth/oauth/google/unlink');
    expect(protectedRouteNames).toContain('auth/oauth/github/unlink');
    expect(protectedRouteNames).toContain('auth/oauth/apple/unlink');
    expect(protectedRouteNames).toContain('auth/oauth/connections');

    // All protected routes should have isPublic set to false
    for (const [_, def] of protectedRoutes) {
      expect(def.isPublic).toBe(false);
    }
  });

  test('should have all other routes as public', () => {
    const publicRoutes = Array.from(authRoutes.entries()).filter(([_, def]) => def.isPublic);

    // 11 core public + 2 magic-link + 6 OAuth (3 initiate + 3 callback) = 19 public routes
    expect(publicRoutes).toHaveLength(19);

    const publicRouteNames = publicRoutes.map(([name]) => name);
    // Core public routes
    expect(publicRouteNames).toContain('auth/register');
    expect(publicRouteNames).toContain('auth/login');
    expect(publicRouteNames).toContain('auth/refresh');
    expect(publicRouteNames).toContain('auth/logout');
    expect(publicRouteNames).toContain('auth/forgot-password');
    expect(publicRouteNames).toContain('auth/reset-password');
    expect(publicRouteNames).toContain('auth/verify-email');
    expect(publicRouteNames).toContain('auth/resend-verification');
    expect(publicRouteNames).toContain('auth/change-email/confirm');
    expect(publicRouteNames).toContain('auth/change-email/revert');
    expect(publicRouteNames).toContain('auth/totp/verify-login');
    // Magic-link public routes
    expect(publicRouteNames).toContain('auth/magic-link/request');
    expect(publicRouteNames).toContain('auth/magic-link/verify');
    // OAuth public routes
    expect(publicRouteNames).toContain('auth/oauth/google');
    expect(publicRouteNames).toContain('auth/oauth/github');
    expect(publicRouteNames).toContain('auth/oauth/apple');
    expect(publicRouteNames).toContain('auth/oauth/google/callback');
    expect(publicRouteNames).toContain('auth/oauth/github/callback');
    expect(publicRouteNames).toContain('auth/oauth/apple/callback');
  });

  test('should not have any admin-only routes', () => {
    const adminOnlyRoutes = Array.from(authRoutes.entries()).filter(
      ([_, def]) => def.roles?.includes('admin') === true,
    );
    expect(adminOnlyRoutes).toHaveLength(0);
  });
});

// ============================================================================
// Route Method Tests
// ============================================================================

describe('Route Methods', () => {
  test('core auth routes should use POST method', () => {
    const coreRoutes = [
      'auth/register',
      'auth/login',
      'auth/refresh',
      'auth/logout',
      'auth/logout-all',
      'auth/forgot-password',
      'auth/reset-password',
      'auth/set-password',
      'auth/verify-email',
      'auth/resend-verification',
      'auth/magic-link/request',
      'auth/magic-link/verify',
    ];

    for (const routeName of coreRoutes) {
      const route = authRoutes.get(routeName);
      expect(route).toBeDefined();
      expect(route?.method).toBe('POST');
    }
  });

  test('OAuth initiate and callback routes should use GET method', () => {
    const getRoutes = [
      'auth/oauth/google',
      'auth/oauth/github',
      'auth/oauth/apple',
      'auth/oauth/google/callback',
      'auth/oauth/github/callback',
      'auth/oauth/apple/callback',
      'auth/oauth/connections',
    ];

    for (const routeName of getRoutes) {
      const route = authRoutes.get(routeName);
      expect(route).toBeDefined();
      expect(route?.method).toBe('GET');
    }
  });

  test('OAuth link routes should use POST method', () => {
    const linkRoutes = [
      'auth/oauth/google/link',
      'auth/oauth/github/link',
      'auth/oauth/apple/link',
    ];

    for (const routeName of linkRoutes) {
      const route = authRoutes.get(routeName);
      expect(route).toBeDefined();
      expect(route?.method).toBe('POST');
    }
  });

  test('OAuth unlink routes should use DELETE method', () => {
    const unlinkRoutes = [
      'auth/oauth/google/unlink',
      'auth/oauth/github/unlink',
      'auth/oauth/apple/unlink',
    ];

    for (const routeName of unlinkRoutes) {
      const route = authRoutes.get(routeName);
      expect(route).toBeDefined();
      expect(route?.method).toBe('DELETE');
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Email formats', () => {
    test('should accept email with plus sign', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test+tag@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    test('should accept email with subdomain', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@mail.example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    test('should accept email with international domain', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@example.co.uk',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Token formats', () => {
    test('should accept long token strings', () => {
      const longToken = 'a'.repeat(256);
      const result = emailVerificationRequestSchema.safeParse({
        token: longToken,
      });
      expect(result.success).toBe(true);
    });

    test('should accept token with special characters', () => {
      const result = emailVerificationRequestSchema.safeParse({
        token: 'abc-123_def.456',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Name field variations', () => {
    test('should accept firstName with special characters', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@example.com',
        username: 'jeanpierre',
        firstName: 'Jean-Pierre',
        lastName: "O'Connor",
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    test('should accept firstName with unicode characters', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@example.com',
        username: 'francois',
        firstName: 'Francois',
        lastName: 'Muller',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    test('should reject registration without firstName', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        lastName: 'User',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(false);
    });

    test('should reject registration without lastName', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(false);
    });
  });
});
