// src/server/core/src/auth/magic-link/handlers.test.ts
/**
 * Magic Link Handlers Tests
 *
 * Comprehensive tests for magic link authentication handlers.
 * Tests request handling, verification, security logging, and error scenarios.
 */

import { EmailSendError, InvalidTokenError, TooManyRequestsError } from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleMagicLinkRequest, handleMagicLinkVerify } from './handlers';
import { requestMagicLink, verifyMagicLink } from './service';

import type { MagicLinkResult, RequestMagicLinkResult } from './service';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../index';
import type { UserId, MagicLinkRequest } from '@abe-stack/shared';
import type { AppConfig } from '@abe-stack/shared/config';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('./service', () => ({
  requestMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
}));

vi.mock('../security', () => ({
  logMagicLinkRequestEvent: vi.fn(),
  logMagicLinkVerifiedEvent: vi.fn(),
  logMagicLinkFailedEvent: vi.fn(),
}));

vi.mock('../utils', () => ({
  setRefreshTokenCookie: vi.fn(),
}));

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
  };
});

vi.mock('@abe-stack/shared/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared/config')>();
  return {
    ...actual,
    isStrategyEnabled: vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

const baseConfig: AppConfig = {
  env: 'test',
  server: {
    host: '127.0.0.1',
    port: 8080,
    portFallbacks: [],
    cors: { origin: ['*'], credentials: false, methods: ['GET', 'POST'] },
    trustProxy: false,
    logLevel: 'fatal',
    maintenanceMode: false,
    appBaseUrl: 'http://localhost:3000',
    apiBaseUrl: 'http://localhost:3000',
    rateLimit: { windowMs: 60000, max: 1000 },
  },
  database: {
    provider: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: 'test',
    maxConnections: 1,
    portFallbacks: [],
    ssl: false,
  },
  auth: {
    strategies: ['local', 'magic'],
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      accessTokenExpiry: '15m',
      issuer: 'test',
      audience: 'test',
    },
    refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
    argon2: { type: 2, memoryCost: 1024, timeCost: 1, parallelism: 1 },
    password: { minLength: 8, maxLength: 64, minZxcvbnScore: 2 },
    lockout: {
      maxAttempts: 5,
      lockoutDurationMs: 1800000,
      progressiveDelay: false,
      baseDelayMs: 0,
    },
    bffMode: false,
    proxy: { trustProxy: false, trustedProxies: [], maxProxyDepth: 1 },
    rateLimit: {
      login: { max: 100, windowMs: 60000 },
      register: { max: 100, windowMs: 60000 },
      forgotPassword: { max: 100, windowMs: 60000 },
      verifyEmail: { max: 100, windowMs: 60000 },
    },
    cookie: {
      name: 'refreshToken',
      secret: 'test-secret-32-characters-long!!',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    },
    oauth: {},
    magicLink: { tokenExpiryMinutes: 15, maxAttempts: 3 },
    totp: { issuer: 'Test', window: 1 },
  },
  email: {
    provider: 'console',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' },
      connectionTimeout: 30000,
      socketTimeout: 30000,
    },
    from: { name: 'Test', address: 'test@test.com' },
    replyTo: 'test@test.com',
  },
  storage: { provider: 'local', rootPath: './test-uploads' },
  billing: {
    enabled: false,
    provider: 'stripe',
    currency: 'USD',
    stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
    paypal: { clientId: '', clientSecret: '', webhookId: '', sandbox: true },
    plans: {},
    urls: {
      portalReturnUrl: 'http://localhost:3000/settings/billing',
      checkoutSuccessUrl: 'http://localhost:3000/checkout/success',
      checkoutCancelUrl: 'http://localhost:3000/checkout/cancel',
    },
  },
  cache: { ttl: 300000, maxSize: 1000, useExternalProvider: false },
  queue: {
    provider: 'local',
    pollIntervalMs: 1000,
    concurrency: 1,
    defaultMaxAttempts: 3,
    backoffBaseMs: 1000,
    maxBackoffMs: 30000,
  },
  notifications: {
    enabled: false,
    provider: 'fcm',
    config: { credentials: '', projectId: '' },
  },
  search: { provider: 'sql', config: { defaultPageSize: 20, maxPageSize: 100 } },
  packageManager: { provider: 'pnpm', strictPeerDeps: false, frozenLockfile: false },
};

type AppContextOverrides = Partial<AppContext> & {
  config?: Partial<AppConfig> & { server?: Partial<AppConfig['server']> };
};

function createMockContext(overrides?: AppContextOverrides): AppContext {
  const config: AppConfig = {
    ...baseConfig,
    ...(overrides?.config ?? {}),
    server: {
      ...baseConfig.server,
      ...(overrides?.config?.server ?? {}),
    },
  };
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    emailTemplates: {
      emailVerification: vi.fn(() => ({
        subject: 'Verify',
        text: 'verify',
        html: '<p>verify</p>',
      })),
      existingAccountRegistrationAttempt: vi.fn(() => ({
        subject: 'Reg',
        text: 'reg',
        html: '<p>reg</p>',
      })),
      passwordReset: vi.fn(() => ({ subject: 'Reset', text: 'reset', html: '<p>reset</p>' })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({ subject: 'Locked', text: 'locked', html: '<p>locked</p>' })),
    },
    config,
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

function createMockRequest(overrides?: Partial<RequestWithCookies>): RequestWithCookies {
  return {
    requestInfo: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    },
    ...overrides,
  } as RequestWithCookies;
}

function createMagicLinkRequestBody(overrides?: Partial<MagicLinkRequest>): MagicLinkRequest {
  return {
    email: 'user@example.com',
    ...overrides,
  };
}

// ============================================================================
// Tests: handleMagicLinkRequest
// ============================================================================

describe('handleMagicLinkRequest', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { isStrategyEnabled } = vi.mocked(await import('@abe-stack/shared/config'));
    isStrategyEnabled.mockReturnValue(true);
  });

  describe('when magic link strategy is enabled', () => {
    test('should return 200 with success message on successful request', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      const result = await handleMagicLinkRequest(ctx, body, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual(mockResult);
    });

    test('should call requestMagicLink with correct parameters', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody({ email: 'test@example.com' });
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '10.0.0.1',
          userAgent: 'Custom User Agent',
        },
      });

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      await handleMagicLinkRequest(ctx, body, request);

      expect(requestMagicLink).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        'test@example.com',
        'http://localhost:3000',
        '10.0.0.1',
        'Custom User Agent',
        {
          tokenExpiryMinutes: 15,
          maxAttemptsPerEmail: 3,
        },
      );
    });

    test('should use config values for magic link settings', async () => {
      const customAuthConfig = {
        ...baseConfig.auth,
        magicLink: {
          tokenExpiryMinutes: 30,
          maxAttempts: 5,
        },
      };

      const ctx = createMockContext({
        config: {
          ...baseConfig,
          auth: customAuthConfig,
        },
      });
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      await handleMagicLinkRequest(ctx, body, request);

      expect(requestMagicLink).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          tokenExpiryMinutes: 30,
          maxAttemptsPerEmail: 5,
        }),
      );
    });

    test('should log magic link request event asynchronously', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody({ email: 'test@example.com' });
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '10.0.0.1',
          userAgent: 'Custom User Agent',
        },
      });

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      const { logMagicLinkRequestEvent } = await import('../security');

      await handleMagicLinkRequest(ctx, body, request);

      expect(logMagicLinkRequestEvent).toHaveBeenCalledWith(
        ctx.db,
        'test@example.com',
        '10.0.0.1',
        'Custom User Agent',
      );
    });
  });

  describe('when magic link strategy is disabled', () => {
    test('should return 404 when magic link authentication is not enabled', async () => {
      const { isStrategyEnabled } = vi.mocked(await import('@abe-stack/shared/config'));
      isStrategyEnabled.mockReturnValue(false);

      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const result = await handleMagicLinkRequest(ctx, body, request);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        message: 'Magic link authentication is not enabled',
        code: 'NOT_FOUND',
      });
      expect(requestMagicLink).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return success message when EmailSendError occurs to prevent enumeration', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const originalError = new Error('SMTP connection failed');
      const emailError = new EmailSendError('Failed to send magic link email', originalError);

      vi.mocked(requestMagicLink).mockRejectedValue(emailError);

      const result = await handleMagicLinkRequest(ctx, body, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'Magic link sent to your email',
      });
      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          originalError: 'SMTP connection failed',
        },
        'Failed to send magic link email',
      );
    });

    test('should handle EmailSendError without original error message gracefully', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const emailError = new EmailSendError('Failed to send magic link email');

      vi.mocked(requestMagicLink).mockRejectedValue(emailError);

      const result = await handleMagicLinkRequest(ctx, body, request);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'Magic link sent to your email',
      });
      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          originalError: undefined,
        },
        'Failed to send magic link email',
      );
    });

    test('should return 500 when TooManyRequestsError is thrown (not specifically handled)', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const rateLimitError = new TooManyRequestsError(
        'Too many magic link requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
      );

      vi.mocked(requestMagicLink).mockRejectedValue(rateLimitError);

      const result = await handleMagicLinkRequest(ctx, body, request);

      // TooManyRequestsError is not specifically handled in the auth httpMapper
      // so it falls through to the generic 500 error
      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty('message');
    });

    test('should map other errors using mapErrorToResponse', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest();

      const genericError = new Error('Database connection failed');

      vi.mocked(requestMagicLink).mockRejectedValue(genericError);

      const result = await handleMagicLinkRequest(ctx, body, request);

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty('message');
    });
  });

  describe('edge cases', () => {
    test('should handle empty IP address', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '',
          userAgent: 'Test Browser',
        },
      });

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      await handleMagicLinkRequest(ctx, body, request);

      expect(requestMagicLink).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '',
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle empty user agent', async () => {
      const ctx = createMockContext();
      const body = createMagicLinkRequestBody();
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '192.168.1.1',
          userAgent: '',
        },
      });

      const mockResult: RequestMagicLinkResult = {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      };

      vi.mocked(requestMagicLink).mockResolvedValue(mockResult);

      await handleMagicLinkRequest(ctx, body, request);

      expect(requestMagicLink).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '',
        expect.anything(),
      );
    });
  });
});

// ============================================================================
// Tests: handleMagicLinkVerify
// ============================================================================

describe('handleMagicLinkVerify', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { isStrategyEnabled } = vi.mocked(await import('@abe-stack/shared/config'));
    isStrategyEnabled.mockReturnValue(true);
  });

  describe('when magic link strategy is enabled', () => {
    test('should return 200 with auth response on successful verification', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token-123' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123' as UserId,
          email: 'user@example.com',
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
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'jwt-access-token',
        user: mockResult.user,
      });
    });

    test('should call verifyMagicLink with correct parameters', async () => {
      const ctx = createMockContext();
      const body = { token: 'test-token-456' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123' as UserId,
          email: 'user@example.com',
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
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(verifyMagicLink).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'test-token-456',
      );
    });

    test('should set refresh token cookie on successful verification', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token-789' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123' as UserId,
          email: 'user@example.com',
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
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const { setRefreshTokenCookie } = await import('../utils');

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'refresh-token-456',
        ctx.config.auth,
      );
    });

    test('should log successful verification event for new user', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token-new-user' };
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0',
        },
      });
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-789',
        user: {
          id: 'user-new' as UserId,
          email: 'newuser@example.com',
          username: 'newuser',
          firstName: 'User',
          lastName: '',
          avatarUrl: null,
          role: 'user',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const { logMagicLinkVerifiedEvent } = await import('../security');

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(logMagicLinkVerifiedEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-new',
        'newuser@example.com',
        true,
        '192.168.1.100',
        'Chrome/120.0',
      );
    });

    test('should log successful verification event for existing user', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token-existing-user' };
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '10.0.0.50',
          userAgent: 'Firefox/115.0',
        },
      });
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-321',
        user: {
          id: 'user-existing' as UserId,
          email: 'existing@example.com',
          username: 'existinguser',
          firstName: 'Existing',
          lastName: 'User',
          avatarUrl: 'https://example.com/avatar.jpg',
          role: 'user',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const { logMagicLinkVerifiedEvent } = await import('../security');

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(logMagicLinkVerifiedEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-existing',
        'existing@example.com',
        false,
        '10.0.0.50',
        'Firefox/115.0',
      );
    });
  });

  describe('when magic link strategy is disabled', () => {
    test('should return 404 when magic link authentication is not enabled', async () => {
      const { isStrategyEnabled } = vi.mocked(await import('@abe-stack/shared/config'));
      isStrategyEnabled.mockReturnValue(false);

      const ctx = createMockContext();
      const body = { token: 'valid-token-123' };
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        message: 'Magic link authentication is not enabled',
        code: 'NOT_FOUND',
      });
      expect(verifyMagicLink).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return 400 when InvalidTokenError is thrown', async () => {
      const ctx = createMockContext();
      const body = { token: 'invalid-token' };
      const request = createMockRequest({
        requestInfo: {
          ipAddress: '192.168.1.200',
          userAgent: 'Safari/16.0',
        },
      });
      const reply = createMockReply();

      const tokenError = new InvalidTokenError('Invalid or expired magic link');

      vi.mocked(verifyMagicLink).mockRejectedValue(tokenError);

      const { logMagicLinkFailedEvent } = await import('../security');

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      // InvalidTokenError is mapped to 400 in the auth httpMapper
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({
        message: 'Invalid or expired token',
      });
      expect(logMagicLinkFailedEvent).toHaveBeenCalledWith(
        ctx.db,
        undefined,
        'Invalid or expired magic link',
        '192.168.1.200',
        'Safari/16.0',
      );
    });

    test('should not set cookie when verification fails', async () => {
      const ctx = createMockContext();
      const body = { token: 'invalid-token' };
      const request = createMockRequest();
      const reply = createMockReply();

      const tokenError = new InvalidTokenError('Invalid or expired magic link');

      vi.mocked(verifyMagicLink).mockRejectedValue(tokenError);

      const { setRefreshTokenCookie } = await import('../utils');

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });

    test('should map other errors using mapErrorToResponse', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token' };
      const request = createMockRequest();
      const reply = createMockReply();

      const genericError = new Error('Database error');

      vi.mocked(verifyMagicLink).mockRejectedValue(genericError);

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty('message');
    });
  });

  describe('edge cases', () => {
    test('should handle user with default name as new user', async () => {
      const ctx = createMockContext();
      const body = { token: 'valid-token' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123' as UserId,
          email: 'user@example.com',
          username: 'user123',
          firstName: 'User',
          lastName: '',
          avatarUrl: null,
          role: 'user',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const { logMagicLinkVerifiedEvent } = await import('../security');

      await handleMagicLinkVerify(ctx, body, request, reply);

      expect(logMagicLinkVerifiedEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        'user@example.com',
        true,
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle admin role users correctly', async () => {
      const ctx = createMockContext();
      const body = { token: 'admin-token' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-admin',
        user: {
          id: 'admin-123' as UserId,
          email: 'admin@example.com',
          username: 'adminuser',
          firstName: 'Admin',
          lastName: 'User',
          avatarUrl: null,
          role: 'admin',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      expect(result.status).toBe(200);
      if ('user' in result.body) {
        expect(result.body.user.role).toBe('admin');
      }
    });

    test('should handle moderator role users correctly', async () => {
      const ctx = createMockContext();
      const body = { token: 'moderator-token' };
      const request = createMockRequest();
      const reply = createMockReply();

      const mockResult: MagicLinkResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'refresh-token-mod',
        user: {
          id: 'mod-123' as UserId,
          email: 'moderator@example.com',
          username: 'moderator',
          firstName: 'Moderator',
          lastName: '',
          avatarUrl: null,
          role: 'moderator',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(verifyMagicLink).mockResolvedValue(mockResult);

      const result = await handleMagicLinkVerify(ctx, body, request, reply);

      expect(result.status).toBe(200);
      if ('user' in result.body) {
        expect(result.body.user.role).toBe('moderator');
      }
    });
  });
});
