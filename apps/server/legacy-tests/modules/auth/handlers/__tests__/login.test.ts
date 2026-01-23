// apps/server/src/modules/auth/handlers/__tests__/login.test.ts
import {
  AccountLockedError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '@abe-stack/core';
import { authenticateUser } from '@auth/service';
import { setRefreshTokenCookie } from '@auth/utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleLogin } from '../login';

import type { LoginRequest } from '@abe-stack/core';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/service', () => ({
  authenticateUser: vi.fn(),
}));

vi.mock('@auth/utils', () => ({
  setRefreshTokenCookie: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    : {
      auth: {
        jwt: {
          secret: 'test-secret-32-characters-long!!',
          accessTokenExpiry: '15m',
        },
        argon2: {},
        refreshToken: {
          expiryDays: 7,
        },
        cookie: {
          name: 'refreshToken',
          secret: 'test-secret',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as AppContext[''],
    log: {
      error: vi.fn(),
    } as unknown as AppContext['log'],
    pubsub: {} as AppContext['pubsub'],
    ...overrides,
  } as unknown as AppContext;
}

function createMockRequest(overrides?: Partial<RequestWithCookies>): RequestWithCookies {
  return {
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...overrides,
  };
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

// ============================================================================
// Tests: handleLogin
// ============================================================================

describe('handleLogin', () => {
  const mockCtx = createMockContext();
  const mockRequest = createMockRequest();
  const mockReply = createMockReply();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 200 with auth response on successful login', async () => {
    const body: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockAuthResult = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
      },
    };

    vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

    const result = await handleLogin(mockCtx, body, mockRequest, mockReply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      token: 'access-token',
      user: mockAuthResult.user,
    });
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(mockReply, 'refresh-token', mockCtx..auth);
    expect(authenticateUser).toHaveBeenCalledWith(
      mockCtx.db,
      mockCtx.repos,
      mockCtx..auth,
      'test@example.com',
      'password123',
      mockCtx.log,
      '127.0.0.1',
      'test-agent',
      expect.any(Function),
    );
  });

  test('should return 401 on invalid credentials', async () => {
    const body: LoginRequest = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    vi.mocked(authenticateUser).mockRejectedValue(new InvalidCredentialsError());

    const result = await handleLogin(mockCtx, body, mockRequest, mockReply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Invalid credentials' });
    expect(mockReply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 429 when account is locked', async () => {
    const body: LoginRequest = {
      email: 'locked@example.com',
      password: 'password123',
    };

    vi.mocked(authenticateUser).mockRejectedValue(new AccountLockedError());

    const result = await handleLogin(mockCtx, body, mockRequest, mockReply);

    expect(result.status).toBe(429);
    expect(result.body).toEqual({ message: 'Account locked. Please try again later.' });
  });

  test('should return 403 when email not verified', async () => {
    const body: LoginRequest = {
      email: 'unverified@example.com',
      password: 'password123',
    };

    vi.mocked(authenticateUser).mockRejectedValue(new EmailNotVerifiedError('unverified@example.com'));

    const result = await handleLogin(mockCtx, body, mockRequest, mockReply);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ message: 'Please verify your email address' });
  });

  test('should return 500 on unexpected errors', async () => {
    const body: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };

    vi.mocked(authenticateUser).mockRejectedValue(new Error('Database error'));

    const result = await handleLogin(mockCtx, body, mockRequest, mockReply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
    expect(mockCtx.log.error).toHaveBeenCalled();
  });
});
