// main/apps/server/src/__tests__/integration/sessions.integration.test.ts
/**
 * Sessions API Integration Tests
 *
 * Tests the session management endpoints through fastify.inject(),
 * verifying routing, auth guards, and method enforcement.
 */

import { createAuthGuard, userRoutes } from '@bslt/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@/http';

import { registerRouteMap } from '@/http';

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
});
