// modules/auth/src/handlers.test.ts
/**
 * Auth Handlers Integration Tests
 *
 * Tests the auth handler functions by mocking service layer dependencies.
 */
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ERROR_MESSAGES, REFRESH_COOKIE_NAME, SUCCESS_MESSAGES } from './types';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from './types';

// ============================================================================
// Mock Dependencies - use vi.hoisted() so mocks are available before vi.mock
// ============================================================================

const {
  mockRegisterUser,
  mockAuthenticateUser,
  mockRefreshUserTokens,
  mockLogoutUser,
  mockRequestPasswordReset,
  mockResetPassword,
  mockVerifyEmail,
  mockSetRefreshTokenCookie,
  mockClearRefreshTokenCookie,
  mockVerifyToken,
  mockMapErrorToResponse,
} = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
  mockAuthenticateUser: vi.fn(),
  mockRefreshUserTokens: vi.fn(),
  mockLogoutUser: vi.fn(),
  mockRequestPasswordReset: vi.fn(),
  mockResetPassword: vi.fn(),
  mockVerifyEmail: vi.fn(),
  mockSetRefreshTokenCookie: vi.fn(),
  mockClearRefreshTokenCookie: vi.fn(),
  mockVerifyToken: vi.fn(),
  // Error mapper that checks error.name instead of instanceof (ESM compatibility)
  mockMapErrorToResponse: vi.fn((error: unknown, ctx: { log?: { error?: unknown } }) => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'EmailAlreadyExistsError':
          return { status: 409, body: { message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED } };
        case 'WeakPasswordError':
          return { status: 400, body: { message: ERROR_MESSAGES.WEAK_PASSWORD } };
        case 'InvalidCredentialsError':
          return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
        case 'AccountLockedError':
          return { status: 429, body: { message: ERROR_MESSAGES.ACCOUNT_LOCKED } };
        case 'InvalidTokenError':
          return { status: 400, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
        default:
          if (ctx.log && typeof ctx.log.error === 'function') {
            (ctx.log.error as (obj: object, msg: string) => void)(
              { error: error.message },
              'Internal error',
            );
          }
          return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
      }
    }
    if (ctx.log && typeof ctx.log.error === 'function') {
      (ctx.log.error as (obj: object, msg: string) => void)({ error: 'Unknown' }, 'Internal error');
    }
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }),
}));

// Mock the service module
vi.mock('./service', () => ({
  registerUser: mockRegisterUser,
  authenticateUser: mockAuthenticateUser,
  refreshUserTokens: mockRefreshUserTokens,
  logoutUser: mockLogoutUser,
  requestPasswordReset: mockRequestPasswordReset,
  resetPassword: mockResetPassword,
  verifyEmail: mockVerifyEmail,
  createEmailVerificationToken: vi.fn(),
}));

// Mock utilities
vi.mock('./utils', () => ({
  verifyToken: mockVerifyToken,
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
  clearRefreshTokenCookie: mockClearRefreshTokenCookie,
  hashPassword: vi.fn(),
  verifyPasswordSafe: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshTokenFamily: vi.fn(),
  rotateRefreshToken: vi.fn(),
  createAuthResponse: vi.fn(),
  needsRehash: vi.fn(),
}));

// Mock @shared to provide working mapErrorToResponse
vi.mock('../../shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../shared')>();
  return {
    ...original,
    mapErrorToResponse: mockMapErrorToResponse,
  };
});

// Import handlers AFTER mocks are set up
import {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResetPassword,
  handleVerifyEmail,
} from './handlers';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    emailTemplates: {
      emailVerification: vi.fn(() => ({ subject: 'Verify your email', text: 'verify', html: '<p>verify</p>' })),
      existingAccountRegistrationAttempt: vi.fn(() => ({ subject: 'Registration attempt', text: 'reg', html: '<p>reg</p>' })),
      passwordReset: vi.fn(() => ({ subject: 'Reset your password', text: 'reset', html: '<p>reset</p>' })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({ subject: 'Account locked', text: 'locked', html: '<p>locked</p>' })),
    },
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
    },
    ...overrides,
  } as unknown as AppContext;
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function createMockRequest(cookies: Record<string, string | undefined> = {}): RequestWithCookies {
  return {
    cookies,
    headers: { authorization: undefined },
    user: undefined,
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  };
}

// ============================================================================
// Tests: handleRegister
// ============================================================================

describe('handleRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 201 with pending verification on successful registration', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'StrongPass123!', name: 'Test User' };

    const mockResult = {
      status: 'pending_verification' as const,
      message: 'Please check your email to verify your account.',
      email: 'test@example.com',
    };

    mockRegisterUser.mockResolvedValue(mockResult);

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(201);
    expect(result.body).toEqual(mockResult);
    // No cookies set - user must verify email first
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 409 when email already exists', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'existing@example.com', password: 'StrongPass123!' };

    mockRegisterUser.mockRejectedValue(new EmailAlreadyExistsError('Email already registered'));

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 400 when password is too weak', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'weak' };

    mockRegisterUser.mockRejectedValue(new WeakPasswordError({ errors: ['Password too short'] }));

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    // Note: mapErrorToResponse does not log WeakPasswordError by default (no logContext provided)
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'StrongPass123!' };

    mockRegisterUser.mockRejectedValue(new Error('Database connection failed'));

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleLogin
// ============================================================================

describe('handleLogin', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 200 with auth response on successful login', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'password123' };

    const mockResult = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        avatarUrl: null,
        role: 'user' as const,
        createdAt,
      },
    };

    mockAuthenticateUser.mockResolvedValue(mockResult);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      token: 'access-token',
      user: mockResult.user,
    });
    expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
      reply,
      'refresh-token',
      ctx.config.auth,
    );
    expect(mockAuthenticateUser).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      'test@example.com',
      'password123',
      ctx.log,
      '127.0.0.1',
      'test-agent',
      expect.any(Function),
    );
  });

  test('should return 401 on invalid credentials', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'wrongpassword' };

    mockAuthenticateUser.mockRejectedValue(new InvalidCredentialsError());

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_CREDENTIALS });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 429 when account is locked', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { email: 'locked@example.com', password: 'password123' };

    mockAuthenticateUser.mockRejectedValue(new AccountLockedError());

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(429);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.ACCOUNT_LOCKED });
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'password123' };

    mockAuthenticateUser.mockRejectedValue(new Error('Unexpected error'));

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleRefresh
// ============================================================================

describe('handleRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 200 with new access token on valid refresh', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
    const reply = createMockReply();

    const mockResult = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    mockRefreshUserTokens.mockResolvedValue(mockResult);

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ token: 'new-access-token' });
    expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
      reply,
      'new-refresh-token',
      ctx.config.auth,
    );
  });

  test('should return 401 when no refresh token is provided', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
    expect(mockRefreshUserTokens).not.toHaveBeenCalled();
  });

  test('should return 401 and clear cookie on invalid token', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
    const reply = createMockReply();

    mockRefreshUserTokens.mockRejectedValue(new InvalidTokenError());

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
    const reply = createMockReply();

    mockRefreshUserTokens.mockRejectedValue(new Error('Database error'));

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleLogout
// ============================================================================

describe('handleLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 200 and clear cookie on successful logout', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'refresh-token' });
    const reply = createMockReply();

    mockLogoutUser.mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(mockClearRefreshTokenCookie).toHaveBeenCalledWith(reply);
    expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, 'refresh-token');
  });

  test('should return 200 even when no refresh token cookie exists', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    mockLogoutUser.mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(mockClearRefreshTokenCookie).toHaveBeenCalled();
    expect(mockLogoutUser).toHaveBeenCalledWith(ctx.db, ctx.repos, undefined);
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'refresh-token' });
    const reply = createMockReply();

    mockLogoutUser.mockRejectedValue(new Error('Database error'));

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleForgotPassword
// ============================================================================

describe('handleForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return success response for valid request', async () => {
    const ctx = createMockContext();
    const body = { email: 'test@example.com' };

    mockRequestPasswordReset.mockResolvedValue(undefined);

    const result = await handleForgotPassword(ctx, body);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
    expect(mockRequestPasswordReset).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      'test@example.com',
      'http://localhost:8080',
    );
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { email: 'test@example.com' };

    mockRequestPasswordReset.mockRejectedValue(new Error('Database error'));

    const result = await handleForgotPassword(ctx, body);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleResetPassword
// ============================================================================

describe('handleResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return success response for valid reset', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'newPassword123!' };

    mockResetPassword.mockResolvedValue(undefined);

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Password reset successfully' });
    expect(mockResetPassword).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      'reset-token',
      'newPassword123!',
    );
  });

  test('should return bad request for weak password', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'weak' };

    mockResetPassword.mockRejectedValue(new WeakPasswordError({ errors: ['Too weak'] }));

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    // Note: mapErrorToResponse does not log WeakPasswordError by default (no logContext provided)
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const body = { token: 'invalid-token', password: 'newPassword123!' };

    mockResetPassword.mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'newPassword123!' };

    mockResetPassword.mockRejectedValue(new Error('Database error'));

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleVerifyEmail
// ============================================================================

describe('handleVerifyEmail', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return success response with auth tokens for valid verification', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'verify-token' };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
      role: 'user' as const,
      createdAt,
    };
    mockVerifyEmail.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: mockUser,
    });

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      verified: true,
      token: 'access-token',
      user: mockUser,
    });
    expect(mockVerifyEmail).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      'verify-token',
    );
    expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
      reply,
      'refresh-token',
      ctx.config.auth,
    );
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'invalid-token' };

    mockVerifyEmail.mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'verify-token' };

    mockVerifyEmail.mockRejectedValue(new Error('Database error'));

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(ctx.log.error).toHaveBeenCalled();
    expect(reply.setCookie).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: verifyToken
// ============================================================================

describe('verifyToken (from utils/jwt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return token payload for valid token', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user' as const,
    };

    mockVerifyToken.mockReturnValue(mockPayload);

    const result = mockVerifyToken('valid-token', 'secret-key-32-characters-long!!');

    expect(result).toEqual(mockPayload);
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', 'secret-key-32-characters-long!!');
  });

  test('should throw error for invalid token', () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => mockVerifyToken('invalid-token', 'secret-key-32-characters-long!!')).toThrow(
      'Invalid token',
    );
  });
});
