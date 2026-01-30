// apps/server/src/modules/auth/oauth/handlers.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/auth/oauth/handlers.test.ts
/**
 * OAuth Handlers Tests
 *
 * Comprehensive unit tests for OAuth authentication flow handlers.
 * Tests provider validation, rate limiting, state management, callback processing,
 * account linking/unlinking, and security event logging.
 */



import { OAUTH_PROVIDERS } from '@abe-stack/db';
import { beforeEach, describe, expect, test, vi } from 'vitest';



// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock security module
vi.mock('@abe-stack/auth/security', () => ({
  authRateLimiters: {
    check: vi.fn(),
  },
  logOAuthLinkSuccessEvent: vi.fn().mockResolvedValue(undefined),
  logOAuthLoginSuccessEvent: vi.fn().mockResolvedValue(undefined),
  logOAuthLoginFailureEvent: vi.fn().mockResolvedValue(undefined),
  logOAuthUnlinkSuccessEvent: vi.fn().mockResolvedValue(undefined),
  logOAuthUnlinkFailureEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock service functions
vi.mock('@abe-stack/auth/oauth/service', () => ({
  getAuthorizationUrl: vi.fn(),
  handleOAuthCallback: vi.fn(),
  unlinkOAuthAccount: vi.fn(),
  getConnectedProviders: vi.fn(),
}));

// Mock cookie utilities
vi.mock('@abe-stack/auth/utils', () => ({
  setRefreshTokenCookie: vi.fn(),
}));

// Mock @abe-stack/db for OAUTH_PROVIDERS
vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
    OAUTH_PROVIDERS: ['google', 'github', 'apple'] as const,
  };
});

// Import after mocking
import {
  authRateLimiters,
  logOAuthLinkSuccessEvent,
  logOAuthLoginFailureEvent,
  logOAuthLoginSuccessEvent,
  logOAuthUnlinkFailureEvent,
  logOAuthUnlinkSuccessEvent,
} from '@abe-stack/auth/security';
import { setRefreshTokenCookie } from '@abe-stack/auth/utils';

import {
  handleGetConnections,
  handleOAuthCallbackRequest,
  handleOAuthInitiate,
  handleOAuthLink,
  handleOAuthUnlink,
} from '@abe-stack/auth/oauth/handlers';
import {
  getAuthorizationUrl,
  getConnectedProviders,
  handleOAuthCallback,
  unlinkOAuthAccount,
} from '@abe-stack/auth/oauth/service';

import type { OAuthConnectionInfo } from '@abe-stack/auth/oauth/types';
import type { AppContext } from '@abe-stack/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
          issuer: 'test',
          audience: 'test',
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
        cookie: {
          secret: 'cookie-secret-key',
          name: 'refreshToken',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
        },
        oauth: {
          google: {
            clientId: 'google-client-id',
            clientSecret: 'google-client-secret',
            callbackUrl: '/auth/google/callback',
          },
          github: {
            clientId: 'github-client-id',
            clientSecret: 'github-client-secret',
            callbackUrl: '/auth/github/callback',
          },
          apple: {
            clientId: 'apple-client-id',
            clientSecret: 'apple-client-secret',
            callbackUrl: '/auth/apple/callback',
          },
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

function createMockRequest(overrides?: Partial<FastifyRequest>): FastifyRequest {
  return {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Test Browser' },
    ...overrides,
  } as FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as FastifyReply;
}

function createAuthenticatedRequest(userId: string, role: 'user' | 'admin' | 'moderator' = 'user'): FastifyRequest {
  const request = createMockRequest();
  (request as { user?: { userId: string; role: string } }).user = { userId, role };
  return request;
}

// ============================================================================
// Tests: handleOAuthInitiate
// ============================================================================

describe('handleOAuthInitiate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRateLimiters.check).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });
  });

  describe('successful initiation', () => {
    test('should return 302 with authorization URL for valid provider', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=xyz',
        state: 'encrypted-state',
      });

      const result = await handleOAuthInitiate(
        ctx,
        { provider: 'google' },
        request,
        reply,
      );

      expect(result.status).toBe(302);
      expect(result.body).toEqual({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=xyz',
      });
    });

    test('should call getAuthorizationUrl with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://github.com/login/oauth/authorize',
        state: 'state',
      });

      await handleOAuthInitiate(ctx, { provider: 'github' }, request, reply);

      expect(getAuthorizationUrl).toHaveBeenCalledWith(
        'github',
        ctx.config.auth,
        'http://localhost:8080/auth/github/callback',
        false,
        undefined,
      );
    });

    test('should handle full callback URL in config', async () => {
      const ctx = createMockContext({
        config: {
          ...createMockContext().config,
          auth: {
            ...createMockContext().config.auth,
            oauth: {
              google: {
                clientId: 'google-client-id',
                clientSecret: 'google-client-secret',
                callbackUrl: 'https://example.com/auth/google/callback',
              },
            },
          },
        },
      });
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'state',
      });

      await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(getAuthorizationUrl).toHaveBeenCalledWith(
        'google',
        ctx.config.auth,
        'https://example.com/auth/google/callback',
        false,
        undefined,
      );
    });

    test('should detect authenticated user and pass to service', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'state',
      });

      await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(getAuthorizationUrl).toHaveBeenCalledWith(
        'google',
        ctx.config.auth,
        'http://localhost:8080/auth/google/callback',
        true,
        'user-123',
      );
    });

    test('should check rate limit before processing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'state',
      });

      await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(authRateLimiters.check).toHaveBeenCalledWith('oauthInitiate', '127.0.0.1');
    });
  });

  describe('invalid provider', () => {
    test('should return error for invalid provider', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthInitiate(
        ctx,
        { provider: 'invalid-provider' },
        request,
        reply,
      );

      expect(result.status).not.toBe(302);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should not call service for invalid provider', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      await handleOAuthInitiate(
        ctx,
        { provider: 'invalid-provider' },
        request,
        reply,
      );

      expect(getAuthorizationUrl).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    test('should return error when rate limit exceeded', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(authRateLimiters.check).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: 30000,
      });

      const result = await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(result.status).not.toBe(302);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should not call service when rate limited', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(authRateLimiters.check).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: 30000,
      });

      await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(getAuthorizationUrl).not.toHaveBeenCalled();
    });
  });

  describe('unconfigured provider', () => {
    test('should return error for unconfigured provider', async () => {
      const ctx = createMockContext({
        config: {
          ...createMockContext().config,
          auth: {
            ...createMockContext().config.auth,
            oauth: {},
          },
        },
      });
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthInitiate(ctx, { provider: 'google' }, request, reply);

      expect(result.status).not.toBe(302);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });

  describe('all supported providers', () => {
    test.each(OAUTH_PROVIDERS)('should handle %s provider', async (provider) => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: `https://${provider}.com/oauth/authorize`,
        state: 'state',
      });

      const result = await handleOAuthInitiate(ctx, { provider }, request, reply);

      expect(result.status).toBe(302);
      expect(getAuthorizationUrl).toHaveBeenCalledWith(
        provider,
        ctx.config.auth,
        expect.stringContaining(`/auth/${provider}/callback`),
        false,
        undefined,
      );
    });
  });
});

// ============================================================================
// Tests: handleOAuthCallbackRequest
// ============================================================================

describe('handleOAuthCallbackRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRateLimiters.check).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });
  });

  describe('successful authentication', () => {
    test('should return 200 with auth tokens for new user', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: true,
        },
      });

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'access-token-123',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          avatarUrl: null,
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        isNewUser: true,
      });
    });

    test('should return 200 with auth tokens for existing user', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: false,
        },
      });

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'github' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        token: 'access-token-123',
        user: expect.objectContaining({
          id: 'user-123',
          email: 'user@example.com',
        }),
        isNewUser: false,
      });
    });

    test('should set refresh token cookie on successful auth', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: false,
        },
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        reply,
        'refresh-token-456',
        ctx.config.auth,
      );
    });

    test('should log successful login event', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: false,
        },
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(logOAuthLoginSuccessEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        'user@example.com',
        'google',
        false,
        '127.0.0.1',
        'Test Browser',
      );
    });

    test('should call handleOAuthCallback with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: false,
        },
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'github' },
        { code: 'auth-code-abc', state: 'state-xyz' },
        request,
        reply,
      );

      expect(handleOAuthCallback).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'github',
        'auth-code-abc',
        'state-xyz',
        'http://localhost:8080/auth/github/callback',
      );
    });
  });

  describe('successful linking', () => {
    test('should return 200 with link success for linking flow', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: true,
        linked: true,
      });

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        linked: true,
        provider: 'google',
      });
    });

    test('should log successful link event', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: true,
        linked: true,
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'github' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(logOAuthLinkSuccessEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        '',
        'github',
        '127.0.0.1',
        'Test Browser',
      );
    });

    test('should not set refresh token cookie for linking flow', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: true,
        linked: true,
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return error when code is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should return error when state is missing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should return error when code is empty string', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: '', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should handle OAuth error from provider', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { error: 'access_denied', error_description: 'User denied access' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should handle OAuth error without description', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { error: 'server_error' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });

    test('should log failure event on error', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: '', state: 'state' },
        request,
        reply,
      );

      expect(logOAuthLoginFailureEvent).toHaveBeenCalledWith(
        ctx.db,
        'google',
        expect.any(String),
        undefined,
        '127.0.0.1',
        'Test Browser',
      );
    });

    test('should throw error when auth is null in non-linking flow', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: undefined,
      });

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });

  describe('rate limiting', () => {
    test('should check rate limit before processing', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(handleOAuthCallback).mockResolvedValue({
        isLinking: false,
        auth: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'user',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: false,
        },
      });

      await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(authRateLimiters.check).toHaveBeenCalledWith('oauthCallback', '127.0.0.1');
    });

    test('should return error when rate limit exceeded', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      vi.mocked(authRateLimiters.check).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: 30000,
      });

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'google' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });

  describe('invalid provider', () => {
    test('should return error for invalid provider', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthCallbackRequest(
        ctx,
        { provider: 'invalid-provider' },
        { code: 'auth-code', state: 'state-value' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });
});

// ============================================================================
// Tests: handleOAuthLink
// ============================================================================

describe('handleOAuthLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRateLimiters.check).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });
  });

  describe('successful link initiation', () => {
    test('should return 200 with authorization URL for authenticated user', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=xyz',
        state: 'encrypted-state',
      });

      const result = await handleOAuthLink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?state=xyz',
      });
    });

    test('should call getAuthorizationUrl with linking parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-456');
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://github.com/login/oauth/authorize',
        state: 'state',
      });

      await handleOAuthLink(ctx, { provider: 'github' }, request, reply);

      expect(getAuthorizationUrl).toHaveBeenCalledWith(
        'github',
        ctx.config.auth,
        'http://localhost:8080/auth/github/callback',
        true,
        'user-456',
      );
    });
  });

  describe('authentication required', () => {
    test('should return 401 when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthLink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    });

    test('should not call service when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      await handleOAuthLink(ctx, { provider: 'google' }, request, reply);

      expect(getAuthorizationUrl).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    test('should check rate limit before processing', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(getAuthorizationUrl).mockReturnValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'state',
      });

      await handleOAuthLink(ctx, { provider: 'google' }, request, reply);

      expect(authRateLimiters.check).toHaveBeenCalledWith('oauthLink', '127.0.0.1');
    });

    test('should return error when rate limit exceeded', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(authRateLimiters.check).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: 30000,
      });

      const result = await handleOAuthLink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });

  describe('invalid provider', () => {
    test('should return error for invalid provider', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      const result = await handleOAuthLink(
        ctx,
        { provider: 'invalid-provider' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });
});

// ============================================================================
// Tests: handleOAuthUnlink
// ============================================================================

describe('handleOAuthUnlink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRateLimiters.check).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetMs: 60000,
    });
  });

  describe('successful unlink', () => {
    test('should return 200 with success message', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockResolvedValue();

      const result = await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'google account unlinked successfully',
      });
    });

    test('should call unlinkOAuthAccount with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-456');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockResolvedValue();

      await handleOAuthUnlink(ctx, { provider: 'github' }, request, reply);

      expect(unlinkOAuthAccount).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        'user-456',
        'github',
      );
    });

    test('should log successful unlink event', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockResolvedValue();

      await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(logOAuthUnlinkSuccessEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        '',
        'google',
        '127.0.0.1',
        'Test Browser',
      );
    });
  });

  describe('authentication required', () => {
    test('should return 401 when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    });

    test('should not call service when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(unlinkOAuthAccount).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return error when unlink fails', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockRejectedValue(
        new Error('Cannot unlink the only authentication method'),
      );

      const result = await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
    });

    test('should log unlink failure event', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockRejectedValue(new Error('Unlink failed'));

      await handleOAuthUnlink(ctx, { provider: 'github' }, request, reply);

      expect(logOAuthUnlinkFailureEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        '',
        'github',
        'Unlink failed',
        '127.0.0.1',
        'Test Browser',
      );
    });

    test('should log unknown error as Unknown error', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockRejectedValue('string error');

      await handleOAuthUnlink(ctx, { provider: 'github' }, request, reply);

      expect(logOAuthUnlinkFailureEvent).toHaveBeenCalledWith(
        ctx.db,
        'user-123',
        '',
        'github',
        'Unknown error',
        '127.0.0.1',
        'Test Browser',
      );
    });
  });

  describe('rate limiting', () => {
    test('should check rate limit before processing', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(unlinkOAuthAccount).mockResolvedValue();

      await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(authRateLimiters.check).toHaveBeenCalledWith('oauthUnlink', '127.0.0.1');
    });

    test('should return error when rate limit exceeded', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(authRateLimiters.check).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: 30000,
      });

      const result = await handleOAuthUnlink(ctx, { provider: 'google' }, request, reply);

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });

  describe('invalid provider', () => {
    test('should return error for invalid provider', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      const result = await handleOAuthUnlink(
        ctx,
        { provider: 'invalid-provider' },
        request,
        reply,
      );

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBeTruthy();
    });
  });
});

// ============================================================================
// Tests: handleGetConnections
// ============================================================================

describe('handleGetConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful retrieval', () => {
    test('should return 200 with connections list', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      const mockConnections: OAuthConnectionInfo[] = [
        {
          id: 'conn-1',
          provider: 'google',
          providerEmail: 'user@gmail.com',
          connectedAt: new Date('2024-01-01'),
        },
        {
          id: 'conn-2',
          provider: 'github',
          providerEmail: 'user@github.com',
          connectedAt: new Date('2024-02-01'),
        },
      ];

      vi.mocked(getConnectedProviders).mockResolvedValue(mockConnections);

      const result = await handleGetConnections(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        connections: mockConnections,
      });
    });

    test('should call getConnectedProviders with correct parameters', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-456');
      const reply = createMockReply();

      vi.mocked(getConnectedProviders).mockResolvedValue([]);

      await handleGetConnections(ctx, request, reply);

      expect(getConnectedProviders).toHaveBeenCalledWith(ctx.db, ctx.repos, 'user-456');
    });

    test('should return empty array when no connections', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(getConnectedProviders).mockResolvedValue([]);

      const result = await handleGetConnections(ctx, request, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        connections: [],
      });
    });
  });

  describe('authentication required', () => {
    test('should return 401 when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      const result = await handleGetConnections(ctx, request, reply);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    });

    test('should not call service when user is not authenticated', async () => {
      const ctx = createMockContext();
      const request = createMockRequest();
      const reply = createMockReply();

      await handleGetConnections(ctx, request, reply);

      expect(getConnectedProviders).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should return error when service fails', async () => {
      const ctx = createMockContext();
      const request = createAuthenticatedRequest('user-123');
      const reply = createMockReply();

      vi.mocked(getConnectedProviders).mockRejectedValue(new Error('Database error'));

      const result = await handleGetConnections(ctx, request, reply);

      expect(result.status).not.toBe(200);
      expect(result.body).toHaveProperty('message');
    });
  });
});
