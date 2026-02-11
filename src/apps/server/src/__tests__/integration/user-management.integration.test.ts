// src/apps/server/src/__tests__/integration/user-management.integration.test.ts
/**
 * User Management API Integration Tests
 *
 * Tests the user management endpoints through fastify.inject(),
 * verifying routing, auth guards, method enforcement, and schema validation.
 *
 * Covers: /api/users/me, /api/users/me/username,
 *         /api/users/me/profile-completeness,
 *         /api/users/me/deactivate, /api/users/me/delete,
 *         /api/users/me/reactivate
 */

import { createAuthGuard, userRoutes } from '@abe-stack/core';
import { registerRouteMap } from '@abe-stack/server-engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@abe-stack/server-engine';

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
    legalDocuments: {
      findLatestByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1', agreedAt: new Date() }),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
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

describe('User Management API Integration Tests', () => {
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
      authGuardFactory: createAuthGuard as AuthGuardFactory,
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
  // GET /api/users/me — Profile
  // ==========================================================================

  describe('GET /api/users/me', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/users/me/profile-completeness
  // ==========================================================================

  describe('GET /api/users/me/profile-completeness', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/profile-completeness',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/profile-completeness',
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/profile-completeness',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // PATCH /api/users/me/username
  // ==========================================================================

  describe('PATCH /api/users/me/username', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/username',
        payload: { username: 'newuser' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/username',
        payload: { username: 'newuser' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/username',
      });
      expect(response.statusCode).toBe(404);
    });

    it('rejects invalid payload (missing username)', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/username',
        payload: {},
      });
      // Should be 400 (schema validation) or 401 (auth guard runs first)
      expect([400, 401]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // POST /api/users/me/deactivate — Account Deactivation
  // ==========================================================================

  describe('POST /api/users/me/deactivate', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/deactivate',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/deactivate',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/deactivate',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/users/me/delete — Account Deletion Request
  // ==========================================================================

  describe('POST /api/users/me/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/delete',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/users/me/reactivate — Account Reactivation
  // ==========================================================================

  describe('POST /api/users/me/reactivate', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/reactivate',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/reactivate',
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/reactivate',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/users/list — Admin-only endpoint
  // ==========================================================================

  describe('GET /api/users/list', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/list',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/list',
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/list',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
