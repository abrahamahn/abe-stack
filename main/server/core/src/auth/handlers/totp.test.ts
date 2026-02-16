// main/server/core/src/auth/handlers/totp.test.ts
/**
 * TOTP Handler Tests
 *
 * Comprehensive tests for TOTP (2FA) setup, enable, disable, status, and login verification.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  handleTotpDisable,
  handleTotpEnable,
  handleTotpLoginVerify,
  handleTotpSetup,
  handleTotpStatus,
} from './totp';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type {
  TotpLoginVerifyRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
} from '@abe-stack/shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const {
  mockSetupTotp,
  mockEnableTotp,
  mockDisableTotp,
  mockGetTotpStatus,
  mockVerifyTotpForLogin,
  mockCreateAccessToken,
  mockCreateAuthResponse,
  mockCreateRefreshTokenFamily,
  mockSetRefreshTokenCookie,
  mockJwtVerify,
  mockWithTransaction,
  mockMapErrorToHttpResponse,
} = vi.hoisted(() => ({
  mockSetupTotp: vi.fn(),
  mockEnableTotp: vi.fn(),
  mockDisableTotp: vi.fn(),
  mockGetTotpStatus: vi.fn(),
  mockVerifyTotpForLogin: vi.fn(),
  mockCreateAccessToken: vi.fn(),
  mockCreateAuthResponse: vi.fn(),
  mockCreateRefreshTokenFamily: vi.fn(),
  mockSetRefreshTokenCookie: vi.fn(),
  mockJwtVerify: vi.fn(),
  mockWithTransaction: vi.fn(),
  // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
  mockMapErrorToHttpResponse: vi.fn((error: unknown, _ctx: unknown) => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidTokenError':
          return {
            status: 401,
            body: { message: error.message },
          };
        default:
          return { status: 500, body: { message: 'Internal server error' } };
      }
    }
    return { status: 500, body: { message: 'Internal server error' } };
  }),
}));

// Mock the totp module
vi.mock('../totp', () => ({
  setupTotp: mockSetupTotp,
  enableTotp: mockEnableTotp,
  disableTotp: mockDisableTotp,
  getTotpStatus: mockGetTotpStatus,
  verifyTotpForLogin: mockVerifyTotpForLogin,
}));

// Mock utils module
vi.mock('../utils', () => ({
  createAccessToken: mockCreateAccessToken,
  createAuthResponse: mockCreateAuthResponse,
  createRefreshTokenFamily: mockCreateRefreshTokenFamily,
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
}));

// Mock @abe-stack/server-engine for JWT
vi.mock('@abe-stack/server-engine', () => ({
  verify: mockJwtVerify,
  JwtError: class JwtError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JwtError';
    }
  },
}));

// Mock @abe-stack/db for transactions
vi.mock('@abe-stack/db', () => ({
  withTransaction: mockWithTransaction,
}));

// Mock @abe-stack/shared partially to provide error mapper and InvalidTokenError
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
    InvalidTokenError: class InvalidTokenError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InvalidTokenError';
      }
    },
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {
      users: {
        findById: vi.fn().mockResolvedValue({ lockedUntil: null }),
      },
    } as unknown as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    config: {
      auth: {
        jwt: {
          secret: 'test-secret-32-chars-long!!!!!!!!',
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

function createAuthenticatedRequest(
  userId: string = 'user-123',
  email: string = 'test@example.com',
): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    },
    user: {
      userId,
      email,
      role: 'user',
    },
  } as RequestWithCookies;
}

function createUnauthenticatedRequest(): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleTotpSetup
// ============================================================================

describe('handleTotpSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful setup', () => {
    test('should return 200 with TOTP setup response on success', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();

      const mockSetupResult: TotpSetupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/App:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=App',
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
      };

      mockSetupTotp.mockResolvedValue(mockSetupResult);

      const result = await handleTotpSetup(ctx, {}, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual(mockSetupResult);
    });

    test('should call setupTotp with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-456', 'user@example.com');

      const mockSetupResult: TotpSetupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/App:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=App',
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
      };

      mockSetupTotp.mockResolvedValue(mockSetupResult);

      await handleTotpSetup(ctx, {}, request);

      expect(mockSetupTotp).toHaveBeenCalledWith(
        ctx.db,
        'user-456',
        'user@example.com',
        ctx.config.auth,
      );
    });

    test('should handle email fallback when request.user.email is undefined', async () => {
      const ctx = createMockContext();
      const request = {
        ...createAuthenticatedRequest(),
        user: {
          userId: 'user-123',
          role: 'user' as const,
          // email is undefined
        },
      } as RequestWithCookies;

      const mockSetupResult: TotpSetupResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/App:?secret=JBSWY3DPEHPK3PXP&issuer=App',
        backupCodes: ['BACKUP1', 'BACKUP2', 'BACKUP3'],
      };

      mockSetupTotp.mockResolvedValue(mockSetupResult);

      await handleTotpSetup(ctx, {}, request);

      expect(mockSetupTotp).toHaveBeenCalledWith(ctx.db, 'user-123', '', ctx.config.auth);
    });
  });

  describe('authentication required', () => {
    test('should return 401 when userId is undefined', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();

      const result = await handleTotpSetup(ctx, {}, request);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Authentication required');
      expect(mockSetupTotp).not.toHaveBeenCalled();
    });

    test('should return 401 when user object is missing', async () => {
      const ctx = createMockContext();
      const request = {
        cookies: {},
        headers: {},
        ip: '127.0.0.1',
        requestInfo: { ipAddress: '127.0.0.1', userAgent: 'Test' },
        // user is undefined
      } as RequestWithCookies;

      const result = await handleTotpSetup(ctx, {}, request);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Authentication required');
    });
  });

  describe('error handling', () => {
    test('should map errors via mapErrorToHttpResponse', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();

      const error = new Error('Database error');
      mockSetupTotp.mockRejectedValue(error);

      const result = await handleTotpSetup(ctx, {}, request);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.anything());
      expect(result.status).toBe(500);
    });
  });
});

// ============================================================================
// Tests: handleTotpEnable
// ============================================================================

describe('handleTotpEnable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful enable', () => {
    test('should return 200 with success message when code is valid', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const mockEnableResult = {
        success: true,
        message: 'TOTP enabled successfully',
      };

      mockEnableTotp.mockResolvedValue(mockEnableResult);

      const result = await handleTotpEnable(ctx, body, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual(mockEnableResult);
    });

    test('should call enableTotp with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-789', 'enable@example.com');
      const body: TotpVerifyRequest = { code: '654321' };

      mockEnableTotp.mockResolvedValue({ success: true, message: 'Enabled' });

      await handleTotpEnable(ctx, body, request);

      expect(mockEnableTotp).toHaveBeenCalledWith(ctx.db, 'user-789', '654321', ctx.config.auth);
    });
  });

  describe('invalid code', () => {
    test('should return 400 when TOTP code is invalid', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '000000' };

      const mockEnableResult = {
        success: false,
        message: 'Invalid TOTP code',
      };

      mockEnableTotp.mockResolvedValue(mockEnableResult);

      const result = await handleTotpEnable(ctx, body, request);

      expect(result.status).toBe(400);
      expect((result.body as { message: string }).message).toBe('Invalid TOTP code');
    });
  });

  describe('authentication required', () => {
    test('should return 401 when userId is undefined', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const result = await handleTotpEnable(ctx, body, request);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Authentication required');
      expect(mockEnableTotp).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should map errors via mapErrorToHttpResponse', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const error = new Error('Database error');
      mockEnableTotp.mockRejectedValue(error);

      const result = await handleTotpEnable(ctx, body, request);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.anything());
      expect(result.status).toBe(500);
    });
  });
});

// ============================================================================
// Tests: handleTotpDisable
// ============================================================================

describe('handleTotpDisable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful disable', () => {
    test('should return 200 with success message when code is valid', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const mockDisableResult = {
        success: true,
        message: 'TOTP disabled successfully',
      };

      mockDisableTotp.mockResolvedValue(mockDisableResult);

      const result = await handleTotpDisable(ctx, body, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual(mockDisableResult);
    });

    test('should call disableTotp with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-999', 'disable@example.com');
      const body: TotpVerifyRequest = { code: '111111' };

      mockDisableTotp.mockResolvedValue({ success: true, message: 'Disabled' });

      await handleTotpDisable(ctx, body, request);

      expect(mockDisableTotp).toHaveBeenCalledWith(ctx.db, 'user-999', '111111', ctx.config.auth);
    });
  });

  describe('invalid code', () => {
    test('should return 400 when TOTP code is invalid', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '000000' };

      const mockDisableResult = {
        success: false,
        message: 'Invalid TOTP code',
      };

      mockDisableTotp.mockResolvedValue(mockDisableResult);

      const result = await handleTotpDisable(ctx, body, request);

      expect(result.status).toBe(400);
      expect((result.body as { message: string }).message).toBe('Invalid TOTP code');
    });
  });

  describe('authentication required', () => {
    test('should return 401 when userId is undefined', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const result = await handleTotpDisable(ctx, body, request);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Authentication required');
      expect(mockDisableTotp).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should map errors via mapErrorToHttpResponse', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();
      const body: TotpVerifyRequest = { code: '123456' };

      const error = new Error('Database error');
      mockDisableTotp.mockRejectedValue(error);

      const result = await handleTotpDisable(ctx, body, request);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.anything());
      expect(result.status).toBe(500);
    });
  });
});

// ============================================================================
// Tests: handleTotpStatus
// ============================================================================

describe('handleTotpStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful status check', () => {
    test('should return 200 with enabled status when TOTP is enabled', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();

      const mockStatusResult: TotpStatusResponse = {
        enabled: true,
      };

      mockGetTotpStatus.mockResolvedValue(mockStatusResult);

      const result = await handleTotpStatus(ctx, {}, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ enabled: true });
    });

    test('should return 200 with disabled status when TOTP is disabled', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();

      const mockStatusResult: TotpStatusResponse = {
        enabled: false,
      };

      mockGetTotpStatus.mockResolvedValue(mockStatusResult);

      const result = await handleTotpStatus(ctx, {}, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ enabled: false });
    });

    test('should call getTotpStatus with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-status-123');

      mockGetTotpStatus.mockResolvedValue({ enabled: true });

      await handleTotpStatus(ctx, {}, request);

      expect(mockGetTotpStatus).toHaveBeenCalledWith(ctx.db, 'user-status-123');
    });
  });

  describe('authentication required', () => {
    test('should return 401 when userId is undefined', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();

      const result = await handleTotpStatus(ctx, {}, request);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Authentication required');
      expect(mockGetTotpStatus).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should map errors via mapErrorToHttpResponse', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest();

      const error = new Error('Database error');
      mockGetTotpStatus.mockRejectedValue(error);

      const result = await handleTotpStatus(ctx, {}, request);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(error, expect.anything());
      expect(result.status).toBe(500);
    });
  });
});

// ============================================================================
// Tests: handleTotpLoginVerify
// ============================================================================

describe('handleTotpLoginVerify', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful login verification', () => {
    test('should return 200 with auth tokens when challenge and TOTP are valid', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'valid-challenge-token',
        code: '123456',
      };

      // Mock JWT verification
      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      // Mock TOTP verification
      mockVerifyTotpForLogin.mockResolvedValue(true);

      // Mock user fetch
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      // Mock token creation
      mockWithTransaction.mockImplementation((_, callback) => {
        return Promise.resolve(callback({} as never));
      });
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token-123' });
      mockCreateAccessToken.mockReturnValue('access-token-123');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockUser,
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(result.status).toBe(200);
      expect((result.body as { token: string }).token).toBe('access-token-123');
      expect((result.body as { user: typeof mockUser }).user).toEqual(mockUser);
    });

    test('should verify challenge JWT with correct secret', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'challenge-jwt-token',
        code: '654321',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-456',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      mockWithTransaction.mockImplementation((_, callback) =>
        Promise.resolve(callback({} as never)),
      );
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token-456' });
      mockCreateAccessToken.mockReturnValue('access-token-456');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        user: mockUser,
      });

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockJwtVerify).toHaveBeenCalledWith(
        'challenge-jwt-token',
        'test-secret-32-chars-long!!!!!!!!',
      );
    });

    test('should verify TOTP code with correct userId', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'challenge-token',
        code: '999999',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-totp-verify',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'user-totp-verify',
        email: 'verify@example.com',
        username: 'verifyuser',
        firstName: 'Verify',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      mockWithTransaction.mockImplementation((_, callback) =>
        Promise.resolve(callback({} as never)),
      );
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token' });
      mockCreateAccessToken.mockReturnValue('access-token');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockVerifyTotpForLogin).toHaveBeenCalledWith(
        ctx.db,
        'user-totp-verify',
        '999999',
        ctx.config.auth,
      );
    });

    test('should set refresh token cookie', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'challenge-token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      mockWithTransaction.mockImplementation((_, callback) =>
        Promise.resolve(callback({} as never)),
      );
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token-cookie-test' });
      mockCreateAccessToken.mockReturnValue('access-token-cookie-test');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token-cookie-test',
        refreshToken: 'refresh-token-cookie-test',
        user: mockUser,
      });

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'refresh-token-cookie-test',
        ctx.config.auth,
      );
    });

    test('should create access token with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'challenge-token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'admin-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      mockWithTransaction.mockImplementation((_, callback) =>
        Promise.resolve(callback({} as never)),
      );
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token' });
      mockCreateAccessToken.mockReturnValue('access-token');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockCreateAccessToken).toHaveBeenCalledWith(
        'admin-123',
        'admin@example.com',
        'admin',
        'test-secret-32-chars-long!!!!!!!!',
        '15m',
      );
    });

    test('should create refresh token family with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'challenge-token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      let capturedTx: unknown;
      mockWithTransaction.mockImplementation((_, callback) => {
        capturedTx = { mockTransaction: true };
        return Promise.resolve(callback(capturedTx as never));
      });
      mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token' });
      mockCreateAccessToken.mockReturnValue('access-token');
      mockCreateAuthResponse.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockCreateRefreshTokenFamily).toHaveBeenCalledWith(capturedTx, 'user-123', 7, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Browser',
      });
    });
  });

  describe('invalid challenge token', () => {
    test('should return 401 when challenge token is invalid (JWT error)', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'invalid-token',
        code: '123456',
      };

      const JwtError = vi.mocked(await import('../../../../engine/src'))
        .JwtError as unknown as new (message: string) => Error;
      mockJwtVerify.mockImplementation(() => {
        throw new JwtError('Invalid JWT');
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Challenge token is invalid or expired',
        }),
        expect.anything(),
      );
      expect(result.status).toBe(401);
    });

    test('should return 401 when challenge token has wrong purpose', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'wrong-purpose-token',
        code: '123456',
      };

      // Mock JWT with wrong purpose
      mockJwtVerify.mockReturnValue({
        purpose: 'password_reset', // Wrong purpose!
        userId: 'user-123',
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Invalid challenge token',
        }),
        expect.anything(),
      );
      expect(result.status).toBe(401);
    });

    test('should return 401 when challenge token is missing userId', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'no-userid-token',
        code: '123456',
      };

      // Mock JWT with missing userId
      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        // userId is missing!
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Invalid challenge token',
        }),
        expect.anything(),
      );
      expect(result.status).toBe(401);
    });

    test('should return 401 when challenge token has non-string userId', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'numeric-userid-token',
        code: '123456',
      };

      // Mock JWT with numeric userId
      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 12345, // Not a string!
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'Invalid challenge token',
        }),
        expect.anything(),
      );
      expect(result.status).toBe(401);
    });
  });

  describe('invalid TOTP code', () => {
    test('should return 401 when TOTP code is invalid', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'valid-challenge-token',
        code: '000000',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      // Mock TOTP verification failure
      mockVerifyTotpForLogin.mockResolvedValue(false);

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(result.status).toBe(401);
      expect((result.body as { message: string }).message).toBe('Invalid TOTP code');
    });

    test('should not create tokens when TOTP code is invalid', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'valid-challenge-token',
        code: '000000',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(false);

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockCreateAccessToken).not.toHaveBeenCalled();
      expect(mockCreateRefreshTokenFamily).not.toHaveBeenCalled();
      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('user not found', () => {
    test('should return 401 when user does not exist', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'valid-challenge-token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'nonexistent-user',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      // User not found
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(null);

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'InvalidTokenError',
          message: 'User not found',
        }),
        expect.anything(),
      );
      expect(result.status).toBe(401);
    });

    test('should not create tokens when user does not exist', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'valid-challenge-token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'nonexistent-user',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      vi.mocked(ctx.repos.users.findById).mockResolvedValue(null);

      await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockCreateAccessToken).not.toHaveBeenCalled();
      expect(mockCreateRefreshTokenFamily).not.toHaveBeenCalled();
      expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should map unexpected JWT errors', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'token',
        code: '123456',
      };

      const unexpectedError = new Error('Unexpected JWT error');
      mockJwtVerify.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(unexpectedError, expect.anything());
      expect(result.status).toBe(500);
    });

    test('should map database errors from verifyTotpForLogin', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      const dbError = new Error('Database connection failed');
      mockVerifyTotpForLogin.mockRejectedValue(dbError);

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(dbError, expect.anything());
      expect(result.status).toBe(500);
    });

    test('should map errors from user fetch', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const fetchError = new Error('User fetch failed');
      vi.mocked(ctx.repos.users.findById).mockRejectedValue(fetchError);

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(fetchError, expect.anything());
      expect(result.status).toBe(500);
    });

    test('should map errors from token creation', async () => {
      const ctx = createMockContext();
      const request = createUnauthenticatedRequest();
      const reply = createMockReply();
      const body: TotpLoginVerifyRequest = {
        challengeToken: 'token',
        code: '123456',
      };

      mockJwtVerify.mockReturnValue({
        purpose: 'totp_challenge',
        userId: 'user-123',
      });

      mockVerifyTotpForLogin.mockResolvedValue(true);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        emailVerified: true,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        createdAt,
        updatedAt: createdAt,
      };
      vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);

      const tokenError = new Error('Token creation failed');
      mockWithTransaction.mockRejectedValue(tokenError);

      const result = await handleTotpLoginVerify(ctx, body, request, reply);

      expect(mockMapErrorToHttpResponse).toHaveBeenCalledWith(tokenError, expect.anything());
      expect(result.status).toBe(500);
    });
  });
});
