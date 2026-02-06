// backend/core/src/auth/handlers/login.test.ts
/**
 * Login Handler Tests
 *
 * Comprehensive tests for user authentication via email/password.
 */

import {
  AccountLockedError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleLogin } from './login';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { LoginRequest } from '@abe-stack/shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const { mockAuthenticateUser, mockSetRefreshTokenCookie, mockMapErrorToResponse } = vi.hoisted(
  () => ({
    mockAuthenticateUser: vi.fn(),
    mockSetRefreshTokenCookie: vi.fn(),
    // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
    mockMapErrorToResponse: vi.fn((error: unknown, _ctx: unknown) => {
      if (error instanceof Error) {
        switch (error.name) {
          case 'AccountLockedError':
            return {
              status: 429,
              body: { message: 'Account temporarily locked due to too many failed attempts' },
            };
          case 'EmailNotVerifiedError':
            return {
              status: 401,
              body: {
                message:
                  (error as Error & { email?: string }).message !== ''
                    ? (error as Error & { email?: string }).message
                    : 'Please verify your email',
                code: 'EMAIL_NOT_VERIFIED',
              },
            };
          case 'InvalidCredentialsError':
            return { status: 401, body: { message: 'Invalid email or password' } };
          default:
            return { status: 500, body: { message: 'Internal server error' } };
        }
      }
      return { status: 500, body: { message: 'Internal server error' } };
    }),
  }),
);

// Mock the service module
vi.mock('../service', () => ({
  authenticateUser: mockAuthenticateUser,
}));

// Mock utils module
vi.mock('../utils', () => ({
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
}));

// Mock @shared to provide working mapErrorToResponse (use relative path from handler's location)
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToResponse: mockMapErrorToResponse,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
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
  } as RequestWithCookies;
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
          name: null,
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(mockAuthenticateUser).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

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
          name: 'Test User',
          avatarUrl: null,
          role: 'admin' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

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

      mockAuthenticateUser.mockRejectedValue(new InvalidCredentialsError());

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Invalid email or password');
    });

    test('should return 429 for locked account', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      mockAuthenticateUser.mockRejectedValue(new AccountLockedError());

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(429);
      expect((result.body as { message: string }).message).toContain('Account temporarily locked');
    });

    test('should return 401 for unverified email', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      mockAuthenticateUser.mockRejectedValue(new EmailNotVerifiedError('test@example.com'));

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toContain('verify your email');
    });

    test('should return 500 for unexpected errors', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      mockAuthenticateUser.mockRejectedValue(new Error('Database connection failed'));

      const result = await handleLogin(ctx, body, request, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not set cookie on authentication failure', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();
      const body = createLoginBody();

      mockAuthenticateUser.mockRejectedValue(new InvalidCredentialsError());

      await handleLogin(ctx, body, request, reply);

      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      let capturedCallback: ((userId: string) => void) | undefined;
      mockAuthenticateUser.mockImplementation(
        (_db, _repos, _config, _email, _password, _logger, _ip, _ua, callback) => {
          capturedCallback = callback;
          return Promise.resolve(mockAuthResult);
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(mockAuthenticateUser).toHaveBeenCalledWith(
        expect.anything(),
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(mockAuthenticateUser).toHaveBeenCalledWith(
        expect.anything(),
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
          avatarUrl: null,
          role: 'user' as const,
          createdAt,
        },
      };

      mockAuthenticateUser.mockResolvedValue(mockAuthResult);

      await handleLogin(ctx, body, request, reply);

      expect(mockAuthenticateUser).toHaveBeenCalledWith(
        expect.anything(),
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
