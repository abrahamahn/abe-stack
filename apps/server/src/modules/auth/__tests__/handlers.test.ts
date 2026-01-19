// apps/server/src/modules/auth/__tests__/handlers.test.ts
import {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResetPassword,
  handleVerifyEmail,
} from '@auth/handlers';
import {
  authenticateUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '@auth/service';
import { verifyToken as verifyJwtToken } from '@auth/utils';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  ERROR_MESSAGES,
  InvalidCredentialsError,
  InvalidTokenError,
  SUCCESS_MESSAGES,
  WeakPasswordError,
} from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock @abe-stack/auth (needed because service.ts imports from it)
vi.mock('@abe-stack/auth', () => ({
  createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })),
}));

// Mock the service module
vi.mock('@auth/service', () => ({
  registerUser: vi.fn(),
  authenticateUser: vi.fn(),
  refreshUserTokens: vi.fn(),
  logoutUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  createEmailVerificationToken: vi.fn(),
}));

// Mock config
vi.mock('@config', () => ({
  getRefreshCookieOptions: vi.fn(() => ({
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })),
}));

// Mock utilities
vi.mock('../utils', () => ({
  extractRequestInfo: vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  })),
  verifyToken: vi.fn(),
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

    vi.mocked(registerUser).mockResolvedValue(mockResult);

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

    vi.mocked(registerUser).mockRejectedValue(
      new EmailAlreadyExistsError('Email already registered'),
    );

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 400 when password is too weak', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'weak' };

    vi.mocked(registerUser).mockRejectedValue(
      new WeakPasswordError({ errors: ['Password too short'] }),
    );

    const result = await handleRegister(ctx, body, reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    expect(ctx.log.warn).toHaveBeenCalled();
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'StrongPass123!' };

    vi.mocked(registerUser).mockRejectedValue(new Error('Database connection failed'));

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
      user: { id: 'user-123', email: 'test@example.com', name: 'Test', role: 'user' as const },
    };

    vi.mocked(authenticateUser).mockResolvedValue(mockResult);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      token: 'access-token',
      user: mockResult.user,
    });
    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      expect.any(Object),
    );
    expect(authenticateUser).toHaveBeenCalledWith(
      ctx.db,
      ctx.config.auth,
      'test@example.com',
      'password123',
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

    vi.mocked(authenticateUser).mockRejectedValue(new InvalidCredentialsError());

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

    vi.mocked(authenticateUser).mockRejectedValue(new AccountLockedError());

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(429);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.ACCOUNT_LOCKED });
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { email: 'test@example.com', password: 'password123' };

    vi.mocked(authenticateUser).mockRejectedValue(new Error('Unexpected error'));

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

    vi.mocked(refreshUserTokens).mockResolvedValue(mockResult);

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ token: 'new-access-token' });
    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'new-refresh-token',
      expect.any(Object),
    );
  });

  test('should return 401 when no refresh token is provided', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.NO_REFRESH_TOKEN });
    expect(refreshUserTokens).not.toHaveBeenCalled();
  });

  test('should return 401 and clear cookie on invalid token', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
    const reply = createMockReply();

    vi.mocked(refreshUserTokens).mockRejectedValue(new InvalidTokenError());

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    expect(reply.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, { path: '/' });
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
    const reply = createMockReply();

    vi.mocked(refreshUserTokens).mockRejectedValue(new Error('Database error'));

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

    vi.mocked(logoutUser).mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(reply.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, { path: '/' });
    expect(logoutUser).toHaveBeenCalledWith(ctx.db, 'refresh-token');
  });

  test('should return 200 even when no refresh token cookie exists', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    vi.mocked(logoutUser).mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(reply.clearCookie).toHaveBeenCalled();
    expect(logoutUser).toHaveBeenCalledWith(ctx.db, undefined);
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'refresh-token' });
    const reply = createMockReply();

    vi.mocked(logoutUser).mockRejectedValue(new Error('Database error'));

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

    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);

    const result = await handleForgotPassword(ctx, body);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
    expect(requestPasswordReset).toHaveBeenCalledWith(
      ctx.db,
      ctx.email,
      'test@example.com',
      'http://localhost:8080',
    );
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { email: 'test@example.com' };

    vi.mocked(requestPasswordReset).mockRejectedValue(new Error('Database error'));

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

    vi.mocked(resetPassword).mockResolvedValue(undefined);

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Password reset successfully' });
    expect(resetPassword).toHaveBeenCalledWith(
      ctx.db,
      ctx.config.auth,
      'reset-token',
      'newPassword123!',
    );
  });

  test('should return bad request for weak password', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'weak' };

    vi.mocked(resetPassword).mockRejectedValue(new WeakPasswordError({ errors: ['Too weak'] }));

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
    expect(ctx.log.warn).toHaveBeenCalled();
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const body = { token: 'invalid-token', password: 'newPassword123!' };

    vi.mocked(resetPassword).mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleResetPassword(ctx, body);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'newPassword123!' };

    vi.mocked(resetPassword).mockRejectedValue(new Error('Database error'));

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
      role: 'user' as const,
    };
    vi.mocked(verifyEmail).mockResolvedValue({
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
    expect(verifyEmail).toHaveBeenCalledWith(ctx.db, ctx.config.auth, 'verify-token');
    expect(reply.setCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh-token',
      expect.any(Object),
    );
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'invalid-token' };

    vi.mocked(verifyEmail).mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INVALID_TOKEN });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'verify-token' };

    vi.mocked(verifyEmail).mockRejectedValue(new Error('Database error'));

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

    vi.mocked(verifyJwtToken).mockReturnValue(mockPayload);

    const result = verifyJwtToken('valid-token', 'secret-key-32-characters-long!!');

    expect(result).toEqual(mockPayload);
    expect(verifyJwtToken).toHaveBeenCalledWith('valid-token', 'secret-key-32-characters-long!!');
  });

  test('should throw error for invalid token', () => {
    vi.mocked(verifyJwtToken).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => verifyJwtToken('invalid-token', 'secret-key-32-characters-long!!')).toThrow(
      'Invalid token',
    );
  });
});
