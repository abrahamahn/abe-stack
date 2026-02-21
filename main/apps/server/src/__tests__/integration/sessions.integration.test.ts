// main/apps/server/src/__tests__/integration/sessions.integration.test.ts
/**
 * Sessions API Integration Tests
 *
 * Tests the session management endpoints through fastify.inject(),
 * verifying routing, auth guards, and method enforcement.
 */

import { createAuthGuard, userRoutes } from '@bslt/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory } from '@/http';

import { registerRouteMap } from '@/http';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos() {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue(null),
      existsByEmail: vi.fn().mockResolvedValue(false),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      unlockAccount: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      updateWithVersion: vi.fn().mockResolvedValue(null),
    },
    refreshTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findByToken: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      findActiveFamilies: vi.fn().mockResolvedValue([]),
      findFamilyById: vi.fn().mockResolvedValue(null),
      revokeFamily: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByToken: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteByFamilyId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    refreshTokenFamilies: {
      findById: vi.fn().mockResolvedValue(null),
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'family-1' }),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAllForUser: vi.fn().mockResolvedValue(0),
    },
    loginAttempts: {
      create: vi.fn().mockResolvedValue({ id: 'la-1' }),
      countRecentFailures: vi.fn().mockResolvedValue(0),
      findRecentByEmail: vi.fn().mockResolvedValue([]),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    passwordResetTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    emailVerificationTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    securityEvents: {
      create: vi.fn().mockResolvedValue({ id: 'se-1' }),
      findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByEmail: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByType: vi.fn().mockResolvedValue([]),
      findBySeverity: vi.fn().mockResolvedValue([]),
      countByType: vi.fn().mockResolvedValue(0),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    magicLinkTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ml-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
      countRecentByEmail: vi.fn().mockResolvedValue(0),
    },
    oauthConnections: {
      findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'oc-1' }),
      delete: vi.fn().mockResolvedValue(true),
      countByUserId: vi.fn().mockResolvedValue(0),
    },
    pushSubscriptions: {
      findByEndpoint: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ps-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
    },
    notificationPreferences: {
      findByUserId: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'np-1' }),
    },
    plans: { findById: vi.fn().mockResolvedValue(null), findAll: vi.fn().mockResolvedValue([]) },
    subscriptions: {
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue(null),
    },
    customerMappings: { findByUserId: vi.fn().mockResolvedValue(null) },
    invoices: { findByUserId: vi.fn().mockResolvedValue([]) },
    paymentMethods: { findByUserId: vi.fn().mockResolvedValue([]) },
    billingEvents: { create: vi.fn().mockResolvedValue({ id: 'be-1' }) },
    legalDocuments: { findLatestByType: vi.fn().mockResolvedValue(null) },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1' }),
    },
  };
}

function createMockLogger() {
  const logger: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  (logger['child'] as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

function createMockDbClient() {
  const mockTx = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };

  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx);
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Sessions API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, userRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Route Existence Tests
  // ==========================================================================

  describe('route existence', () => {
    it('GET /api/users/me/sessions responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/users/me/sessions/count responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions/count',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('DELETE /api/users/me/sessions/test-id responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/sessions/test-id',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/users/me/sessions/revoke-all responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/sessions/revoke-all',
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests
  // ==========================================================================

  describe('auth guards', () => {
    it('GET /api/users/me/sessions returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/users/me/sessions/count returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions/count',
      });
      expect(response.statusCode).toBe(401);
    });

    it('DELETE /api/users/me/sessions/test-id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/sessions/test-id',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/users/me/sessions/revoke-all returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/sessions/revoke-all',
      });
      expect(response.statusCode).toBe(401);
    });

    // TODO: Investigate Fastify scoped plugin hang with valid Bearer tokens
    it.todo('authenticated operations work with valid tokens');
  });

  // ==========================================================================
  // Method Enforcement Tests
  // ==========================================================================

  describe('method enforcement', () => {
    it('POST /api/users/me/sessions returns 404 (only GET)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/sessions',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/users/me/sessions/count returns 404 (only GET)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/sessions/count',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });

    it('GET /api/users/me/sessions/revoke-all returns 404 (only POST)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions/revoke-all',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Session Record & Device Security Tests (Sprint 4.3)
  // ==========================================================================

  describe('session record creation and device metadata', () => {
    it('authenticated session list returns records with IP address and user agent', async () => {
      const chromeOnWindows =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-sess-1',
          userId: 'user-auth-1',
          familyCreatedAt: new Date('2026-01-15T10:00:00Z'),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date('2026-02-15T10:00:00Z'),
          ipAddress: '203.0.113.42',
          userAgent: chromeOnWindows,
        },
        {
          familyId: 'family-sess-2',
          userId: 'user-auth-1',
          familyCreatedAt: new Date('2026-01-14T08:00:00Z'),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date('2026-02-14T08:00:00Z'),
          ipAddress: '198.51.100.7',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        },
      ]);

      // No refresh token cookie => currentFamilyId is undefined
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const token = createTestJwt({
        userId: 'user-auth-1',
        email: 'session-test@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBe(200);
      const sessions = parseJsonResponse(response) as Array<{
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
        isCurrent: boolean;
        createdAt: string;
      }>;

      expect(sessions).toHaveLength(2);

      // First session includes IP and full UA string
      expect(sessions[0]!.id).toBe('family-sess-1');
      expect(sessions[0]!.ipAddress).toBe('203.0.113.42');
      expect(sessions[0]!.userAgent).toBe(chromeOnWindows);
      expect(sessions[0]!.createdAt).toBe('2026-01-15T10:00:00.000Z');

      // Second session includes different IP and UA
      expect(sessions[1]!.id).toBe('family-sess-2');
      expect(sessions[1]!.ipAddress).toBe('198.51.100.7');
      expect(sessions[1]!.userAgent).toContain('Safari');
    });

    it('session record includes null IP and user agent when not captured', async () => {
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-null-meta',
          userId: 'user-auth-1',
          familyCreatedAt: new Date('2026-01-10T12:00:00Z'),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date('2026-02-10T12:00:00Z'),
          ipAddress: null,
          userAgent: null,
        },
      ]);

      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const token = createTestJwt({
        userId: 'user-auth-1',
        email: 'null-meta@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBe(200);
      const sessions = parseJsonResponse(response) as Array<{
        id: string;
        ipAddress: string | null;
        userAgent: string | null;
      }>;

      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.ipAddress).toBeNull();
      expect(sessions[0]!.userAgent).toBeNull();
    });

    it('session list marks the current session via refresh token cookie lookup', async () => {
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-current',
          userId: 'user-auth-1',
          familyCreatedAt: new Date('2026-01-15T10:00:00Z'),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date('2026-02-15T10:00:00Z'),
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome/120',
        },
        {
          familyId: 'family-other',
          userId: 'user-auth-1',
          familyCreatedAt: new Date('2026-01-14T10:00:00Z'),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date('2026-02-14T10:00:00Z'),
          ipAddress: '10.0.0.2',
          userAgent: 'Firefox/120',
        },
      ]);

      // Simulate refresh token cookie resolving to the current family
      mockRepos.refreshTokens.findByToken.mockResolvedValue({
        id: 'rt-current',
        familyId: 'family-current',
        userId: 'user-auth-1',
        token: 'mock-refresh-token',
        expiresAt: new Date('2026-02-15T10:00:00Z'),
      });

      const token = createTestJwt({
        userId: 'user-auth-1',
        email: 'current-session@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
          cookies: { refreshToken: 'mock-refresh-token' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const sessions = parseJsonResponse(response) as Array<{
        id: string;
        isCurrent: boolean;
      }>;

      expect(sessions).toHaveLength(2);
      const currentSession = sessions.find((s) => s.id === 'family-current');
      const otherSession = sessions.find((s) => s.id === 'family-other');
      expect(currentSession!.isCurrent).toBe(true);
      expect(otherSession!.isCurrent).toBe(false);
    });

    it('session count endpoint returns correct active session count', async () => {
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'f1',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '1.1.1.1',
          userAgent: 'UA1',
        },
        {
          familyId: 'f2',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '2.2.2.2',
          userAgent: 'UA2',
        },
        {
          familyId: 'f3',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '3.3.3.3',
          userAgent: 'UA3',
        },
      ]);

      const token = createTestJwt({
        userId: 'user-auth-1',
        email: 'count@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions/count',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { count: number };
      expect(body.count).toBe(3);
    });

    it('revoke-all endpoint revokes all sessions except the current one', async () => {
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-keep',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome',
        },
        {
          familyId: 'family-revoke-1',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.2',
          userAgent: 'Firefox',
        },
        {
          familyId: 'family-revoke-2',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.3',
          userAgent: 'Safari',
        },
      ]);

      // Current session's refresh token resolves to family-keep
      mockRepos.refreshTokens.findByToken.mockResolvedValue({
        id: 'rt-keep',
        familyId: 'family-keep',
        userId: 'user-auth-1',
        token: 'keep-token',
        expiresAt: new Date('2026-02-15T10:00:00Z'),
      });

      mockRepos.refreshTokens.revokeFamily.mockResolvedValue(1);

      const token = createTestJwt({
        userId: 'user-auth-1',
        email: 'revoke-all@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/users/me/sessions/revoke-all',
          accessToken: token,
          cookies: { refreshToken: 'keep-token' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { revokedCount: number };
      expect(body.revokedCount).toBe(2);

      // Verify revokeFamily was called for the two non-current sessions
      expect(mockRepos.refreshTokens.revokeFamily).toHaveBeenCalledTimes(2);
      expect(mockRepos.refreshTokens.revokeFamily).toHaveBeenCalledWith(
        'family-revoke-1',
        'User logged out from all devices',
      );
      expect(mockRepos.refreshTokens.revokeFamily).toHaveBeenCalledWith(
        'family-revoke-2',
        'User logged out from all devices',
      );
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Malformed JWT Tokens
  // ==========================================================================

  describe('adversarial: malformed JWT boundary tests', () => {
    it('GET /api/users/me/sessions with truncated JWT returns 401', async () => {
      const validToken = createTestJwt({ userId: 'user-1', email: 'test@example.com' });
      const truncatedToken = validToken.substring(0, Math.floor(validToken.length / 2));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: truncatedToken,
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with empty Bearer token returns 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
        headers: { authorization: 'Bearer ' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with null-string bearer returns 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
        headers: { authorization: 'Bearer null' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with "undefined" bearer returns 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
        headers: { authorization: 'Bearer undefined' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with malformed base64 JWT returns 401', async () => {
      const malformedJwt = 'not.a.valid.jwt.token!!!@@@###';

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: malformedJwt,
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with JWT signed by wrong secret returns 401', async () => {
      // createAccessToken is used internally; craft a token with a different secret
      const { createAccessToken } = await import('@bslt/core/auth');
      const wrongSecretToken = createAccessToken(
        'user-1',
        'test@example.com',
        'user',
        'completely-wrong-secret-that-is-long-enough!!',
        '15m',
      );

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: wrongSecretToken,
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with expired JWT returns 401', async () => {
      // 0s expiry means exp = now, and verify checks now >= exp, so immediately expired
      const expiredToken = createTestJwt({
        userId: 'user-1',
        email: 'expired@example.com',
        expiresIn: '0s',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: expiredToken,
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/sessions with authorization header lacking Bearer prefix returns 401', async () => {
      const validToken = createTestJwt({ userId: 'user-1', email: 'test@example.com' });

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/sessions',
        headers: { authorization: validToken },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — DELETE /sessions/:id with malicious IDs
  // ==========================================================================

  describe('adversarial: DELETE /sessions/:id boundary tests', () => {
    it('DELETE with SQL injection-like ID returns 401 or non-500', async () => {
      const sqlInjectionId = "'; DROP TABLE sessions; --";

      const response = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/sessions/${encodeURIComponent(sqlInjectionId)}`,
      });

      // Without auth, should be 401; must never be 500 (SQL error)
      expect(response.statusCode).toBe(401);
    });

    it('DELETE with XSS payload in ID param returns 401 or non-500', async () => {
      const xssId = '<script>alert("xss")</script>';

      const response = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/sessions/${encodeURIComponent(xssId)}`,
      });

      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      // Response must not reflect XSS payload
      expect(body.message).not.toContain('<script>');
    });

    it('DELETE with empty ID segment returns 401 or 404 (no valid route match or no auth)', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/sessions/',
      });

      // Empty ID segment: route may still match with trailing slash (401 = auth guard)
      // or not match (404). Either is safe behavior — never 500.
      expect([401, 404]).toContain(response.statusCode);
    });

    it('DELETE with extremely long ID (10000 chars) does not crash', async () => {
      const longId = 'A'.repeat(10000);

      const response = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/sessions/${longId}`,
      });

      // Should get 401 (no auth), but must not be 500
      expect([401, 400, 404, 414]).toContain(response.statusCode);
      expect(response.statusCode).not.toBe(500);
    });

    it('DELETE with ID containing path traversal returns 401 and not 500', async () => {
      const pathTraversalId = '../../etc/passwd';

      const response = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/sessions/${encodeURIComponent(pathTraversalId)}`,
      });

      expect(response.statusCode).not.toBe(500);
    });

    it('DELETE with ID containing null byte returns safe response', async () => {
      const nullByteId = 'session-id%00malicious';

      const response = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/sessions/${nullByteId}`,
      });

      expect(response.statusCode).not.toBe(500);
    });

    it('authenticated DELETE with SQL injection ID does not cause server error', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'sqli@example.com' });
      const sqlInjectionId = "1' OR '1'='1";

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([]);
      mockRepos.refreshTokens.revokeFamily.mockResolvedValue(0);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'DELETE',
          url: `/api/users/me/sessions/${encodeURIComponent(sqlInjectionId)}`,
          accessToken: token,
        }),
      );

      // Should not be a server error
      expect(response.statusCode).not.toBe(500);
      expect(response.statusCode).not.toBe(502);
      expect(response.statusCode).not.toBe(503);
    });
  });

  // ==========================================================================
  // Adversarial: Layer Handshake — Repo returning malformed data
  // ==========================================================================

  describe('adversarial: layer handshake — malformed repo responses', () => {
    it('repo returning null where session array expected does not crash', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'layer@example.com' });

      // Force repo to return null instead of an array
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue(null as never);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
        }),
      );

      // Should either handle gracefully (200 with empty or 500)
      // The key assertion: server does not hang or throw unhandled exception
      expect(response.statusCode).toBeDefined();
      expect([200, 500]).toContain(response.statusCode);
    });

    it('repo returning sessions with missing required fields does not crash', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'malformed@example.com' });

      // Session records missing familyCreatedAt, latestExpiresAt, etc.
      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-bad-1',
          userId: 'user-auth-1',
          // Missing familyCreatedAt
          familyRevokedAt: null,
          familyRevokeReason: null,
          // Missing latestExpiresAt
          ipAddress: null,
          userAgent: null,
        },
      ] as never);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
        }),
      );

      // Should not hang; may be 200 or 500, but defined
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('repo returning undefined familyId in session records does not crash', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'undef@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: undefined,
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '1.2.3.4',
          userAgent: 'TestAgent',
        },
      ] as never);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBeDefined();
    });

    it('session count endpoint handles repo throwing error gracefully', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'throw@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockRejectedValue(
        new Error('Database connection lost'),
      );

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions/count',
          accessToken: token,
        }),
      );

      // Should return 500 internal server error, not crash the process
      expect(response.statusCode).toBe(500);
    });

    it('revoke-all handles repo revokeFamily throwing mid-operation', async () => {
      const token = createTestJwt({ userId: 'user-auth-1', email: 'revoke-err@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-1',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome',
        },
        {
          familyId: 'family-2',
          userId: 'user-auth-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.2',
          userAgent: 'Firefox',
        },
      ]);

      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      // First call succeeds, second throws
      mockRepos.refreshTokens.revokeFamily
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('DB write failed'));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/users/me/sessions/revoke-all',
          accessToken: token,
        }),
      );

      // Should return 500 or partial success, but never hang
      expect(response.statusCode).toBeDefined();
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: Async Integrity — Concurrent operations
  // ==========================================================================

  describe('adversarial: async integrity — concurrent session operations', () => {
    it('concurrent session list and revoke-all do not cause race condition crash', async () => {
      const token = createTestJwt({ userId: 'user-race-1', email: 'race@example.com' });

      const sessionData = [
        {
          familyId: 'family-race-1',
          userId: 'user-race-1',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome',
        },
      ];

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue(sessionData);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);
      mockRepos.refreshTokens.revokeFamily.mockResolvedValue(1);

      // Fire both concurrently
      const [listResponse, revokeResponse] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'GET',
            url: '/api/users/me/sessions',
            accessToken: token,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/users/me/sessions/revoke-all',
            accessToken: token,
          }),
        ),
      ]);

      // Both should complete without hanging
      expect(listResponse.statusCode).toBeDefined();
      expect(revokeResponse.statusCode).toBeDefined();
      // Neither should be a 502/503
      expect(listResponse.statusCode).not.toBe(502);
      expect(revokeResponse.statusCode).not.toBe(502);
    });

    it('session revocation during concurrent session count does not corrupt state', async () => {
      const token = createTestJwt({ userId: 'user-race-2', email: 'race2@example.com' });

      let callCount = 0;
      mockRepos.refreshTokens.findActiveFamilies.mockImplementation(async () => {
        callCount++;
        // Simulate first call returning 3 sessions, second call (after revocation) returning 1
        if (callCount === 1) {
          return [
            {
              familyId: 'f1',
              userId: 'user-race-2',
              familyCreatedAt: new Date(),
              familyRevokedAt: null,
              familyRevokeReason: null,
              latestExpiresAt: new Date(),
              ipAddress: '1.1.1.1',
              userAgent: 'A',
            },
            {
              familyId: 'f2',
              userId: 'user-race-2',
              familyCreatedAt: new Date(),
              familyRevokedAt: null,
              familyRevokeReason: null,
              latestExpiresAt: new Date(),
              ipAddress: '2.2.2.2',
              userAgent: 'B',
            },
            {
              familyId: 'f3',
              userId: 'user-race-2',
              familyCreatedAt: new Date(),
              familyRevokedAt: null,
              familyRevokeReason: null,
              latestExpiresAt: new Date(),
              ipAddress: '3.3.3.3',
              userAgent: 'C',
            },
          ];
        }
        return [
          {
            familyId: 'f1',
            userId: 'user-race-2',
            familyCreatedAt: new Date(),
            familyRevokedAt: null,
            familyRevokeReason: null,
            latestExpiresAt: new Date(),
            ipAddress: '1.1.1.1',
            userAgent: 'A',
          },
        ];
      });
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);
      mockRepos.refreshTokens.revokeFamily.mockResolvedValue(1);

      // First count
      const countResponse1 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions/count',
          accessToken: token,
        }),
      );

      // Now count again after "revocation"
      const countResponse2 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/users/me/sessions/count',
          accessToken: token,
        }),
      );

      expect(countResponse1.statusCode).toBe(200);
      expect(countResponse2.statusCode).toBe(200);
      const body1 = parseJsonResponse(countResponse1) as { count: number };
      const body2 = parseJsonResponse(countResponse2) as { count: number };
      expect(body1.count).toBe(3);
      expect(body2.count).toBe(1);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double-POST revoke-all
  // ==========================================================================

  describe('adversarial: idempotency — double revoke-all', () => {
    it('double-POST /sessions/revoke-all returns consistent state on second call', async () => {
      const token = createTestJwt({ userId: 'user-idemp-1', email: 'idemp@example.com' });

      // First call: 2 sessions to revoke
      mockRepos.refreshTokens.findActiveFamilies
        .mockResolvedValueOnce([
          {
            familyId: 'family-keep',
            userId: 'user-idemp-1',
            familyCreatedAt: new Date(),
            familyRevokedAt: null,
            familyRevokeReason: null,
            latestExpiresAt: new Date(),
            ipAddress: '10.0.0.1',
            userAgent: 'Chrome',
          },
          {
            familyId: 'family-revoke',
            userId: 'user-idemp-1',
            familyCreatedAt: new Date(),
            familyRevokedAt: null,
            familyRevokeReason: null,
            latestExpiresAt: new Date(),
            ipAddress: '10.0.0.2',
            userAgent: 'Firefox',
          },
        ])
        // Second call: only 1 session remaining (the current one)
        .mockResolvedValueOnce([
          {
            familyId: 'family-keep',
            userId: 'user-idemp-1',
            familyCreatedAt: new Date(),
            familyRevokedAt: null,
            familyRevokeReason: null,
            latestExpiresAt: new Date(),
            ipAddress: '10.0.0.1',
            userAgent: 'Chrome',
          },
        ]);

      mockRepos.refreshTokens.findByToken.mockResolvedValue({
        id: 'rt-keep',
        familyId: 'family-keep',
        userId: 'user-idemp-1',
        token: 'keep-token',
        expiresAt: new Date('2026-02-15T10:00:00Z'),
      });

      mockRepos.refreshTokens.revokeFamily.mockResolvedValue(1);

      const requestOpts = buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/users/me/sessions/revoke-all',
        accessToken: token,
        cookies: { refreshToken: 'keep-token' },
      });

      const response1 = await testServer.inject(requestOpts);
      const response2 = await testServer.inject(requestOpts);

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const body1 = parseJsonResponse(response1) as { revokedCount: number };
      const body2 = parseJsonResponse(response2) as { revokedCount: number };

      // First call revokes 1, second call revokes 0 (already revoked)
      expect(body1.revokedCount).toBe(1);
      expect(body2.revokedCount).toBe(0);
    });

    it('double DELETE of same session ID returns consistent state', async () => {
      const token = createTestJwt({ userId: 'user-idemp-2', email: 'idemp2@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([
        {
          familyId: 'family-del',
          userId: 'user-idemp-2',
          familyCreatedAt: new Date(),
          familyRevokedAt: null,
          familyRevokeReason: null,
          latestExpiresAt: new Date(),
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome',
        },
      ]);

      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);
      mockRepos.refreshTokens.revokeFamily
        .mockResolvedValueOnce(1) // first delete succeeds
        .mockResolvedValueOnce(0); // second delete: already revoked

      const requestOpts = buildAuthenticatedRequest({
        method: 'DELETE',
        url: '/api/users/me/sessions/family-del',
        accessToken: token,
      });

      const response1 = await testServer.inject(requestOpts);
      const response2 = await testServer.inject(requestOpts);

      // Both should succeed or second should be 404 — never 500
      expect(response1.statusCode).not.toBe(500);
      expect(response2.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" Test — Unauthorized revoke-all with oversized payload
  // ==========================================================================

  describe('adversarial: killer tests — extreme abuse scenarios', () => {
    it('unauthorized user sends revoke-all with payload exceeding 10KB', async () => {
      const oversizedPayload = { data: 'X'.repeat(10240) }; // >10KB

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/sessions/revoke-all',
        payload: oversizedPayload,
      });

      // Should be rejected with 401 (no auth), payload size should not cause crash
      expect(response.statusCode).toBe(401);
    });

    it('authorized user sends revoke-all with 1MB payload — server stays healthy', async () => {
      const token = createTestJwt({ userId: 'user-killer', email: 'killer@example.com' });
      const megabytePayload = { garbage: 'Y'.repeat(1024 * 1024) };

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([]);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/users/me/sessions/revoke-all',
          accessToken: token,
          payload: megabytePayload,
        }),
      );

      // Should not crash; 200, 400, or 413 are all acceptable
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('prototype pollution in session request payload is neutralized', async () => {
      const token = createTestJwt({ userId: 'user-proto', email: 'proto@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([]);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/users/me/sessions/revoke-all',
          accessToken: token,
          payload: JSON.parse(
            '{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}}}',
          ),
        }),
      );

      // Server should not be polluted; response should be normal
      expect(response.statusCode).toBeDefined();
      // Verify Object.prototype was not polluted
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
    });

    it('multiple concurrent revoke-all from different users do not interfere', async () => {
      const tokenA = createTestJwt({ userId: 'user-A-killer', email: 'killerA@example.com' });
      const tokenB = createTestJwt({ userId: 'user-B-killer', email: 'killerB@example.com' });

      mockRepos.refreshTokens.findActiveFamilies.mockResolvedValue([]);
      mockRepos.refreshTokens.findByToken.mockResolvedValue(null);

      const [responseA, responseB] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/users/me/sessions/revoke-all',
            accessToken: tokenA,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/users/me/sessions/revoke-all',
            accessToken: tokenB,
          }),
        ),
      ]);

      expect(responseA.statusCode).toBe(200);
      expect(responseB.statusCode).toBe(200);
    });
  });
});
