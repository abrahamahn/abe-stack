// apps/server/src/modules/auth/handlers/__tests__/login.test.ts
/**
 * Login Handler Tests
 *
 * Comprehensive tests for user authentication via email/password.
 */

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
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    config: {
      auth: {
        jwt: {
          secret: 'test-secret-32-characters-long!!',
          accessTokenExpiry: '15m',
        },
        argon2: {},
        refreshToken: {
          expiryDays: 7,
          gracePeriodSeconds: 30,
        },
        lockout: {
          maxAttempts: 5,
          windowMs: 900000,
          lockoutDurationMs: 1800000,
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    },
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

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function createMockRequest(
  requestInfo?: Partial<RequestWithCookies['requestInfo']>,
): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      ...requestInfo,
    },
  };
}

function createLoginBody(overrides?: Partial<LoginRequest>): LoginRequest {
  return {
    email: 'test@example.com',
    password: 'SecureP@ssw0rd!',
    ...overrides,
  };
}

// ============================================================================
// Tests: handleLogin
// ============================================================================

describe('handleLogin', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful login', () => {
    test('should return 200 with auth response on successful login', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'access-token-123',
        user: mockAuthResult.user,
      });
    });

    test('should call authenticateUser with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(authenticateUser).toHaveBeenCalledWith(
        ctx.db,
        ctx.config.auth,
        body.email,
        body.password,
        ctx.log,
        '127.0.0.1',
        'Test Browser',
        expect.any(Function),
      );
    });

    test('should set refresh token cookie on successful login', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'refresh-token-456',
        ctx.config.auth,
      );
    });

    test('should handle user with null name', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: null,
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(200);
      expect((result.body as { user: { name: string | null } }).user.name).toBeNull();
    });

    test('should handle admin role user', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(200);
      expect((result.body as { user: { role: string } }).user.role).toBe('admin');
    });
  });

  describe('error handling', () => {
    test('should return 401 for invalid credentials', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      vi.mocked(authenticateUser).mockRejectedValue(new InvalidCredentialsError());

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Invalid email or password');
    });

    test('should return 429 for locked account', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      vi.mocked(authenticateUser).mockRejectedValue(new AccountLockedError());

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(429);
      expect((result.body as { message: string }).message).toContain('Account temporarily locked');
    });

    test('should return 401 for unverified email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      vi.mocked(authenticateUser).mockRejectedValue(new EmailNotVerifiedError('test@example.com'));

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toContain('verify your email');
    });

    test('should return 500 for unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      vi.mocked(authenticateUser).mockRejectedValue(new Error('Database connection failed'));

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not set cookie on authentication failure', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      vi.mocked(authenticateUser).mockRejectedValue(new InvalidCredentialsError());

      await handleLogin(ctx, body, request, reply);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('password rehash callback', () => {
    test('should log password hash upgrade on callback invocation', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      let capturedCallback: ((userId: string) => void) | undefined;
      vi.mocked(authenticateUser).mockImplementation(
        async (_db, _config, _email, _password, _logger, _ip, _ua, callback) => {
          capturedCallback = callback;
          return mockAuthResult;
        },
      );

      await handleLogin(ctx, body, request, reply);

      expect(capturedCallback).toBeDefined();
      capturedCallback?.('user-123');

      expect(ctx.log.info).toHaveBeenCalledWith({ userId: 'user-123' }, 'Password hash upgraded');
    });
  });

  describe('request info extraction', () => {
    test('should use IP address from requestInfo', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ ipAddress: '192.168.1.100' });
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(authenticateUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '192.168.1.100',
        expect.anything(),
        expect.anything(),
      );
    });

    test('should use user agent from requestInfo', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ userAgent: 'Mozilla/5.0 Custom Browser' });
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(authenticateUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'Mozilla/5.0 Custom Browser',
        expect.anything(),
      );
    });

    test('should handle undefined user agent', async () => {
      const ctx = createMockContext();
      const request = createMockRequest({ userAgent: undefined });
      const reply = createMockReply();
      const body = createLoginBody();

      const mockAuthResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          createdAt,
        },
      };

      vi.mocked(authenticateUser).mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(authenticateUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
        expect.anything(),
      );
    });
  });
});
