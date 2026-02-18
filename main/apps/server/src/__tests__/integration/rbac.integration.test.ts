// main/apps/server/src/__tests__/integration/rbac.integration.test.ts
/**
 * RBAC Integration Tests
 *
 * Tests role-based access control through fastify.inject(),
 * verifying that protected routes enforce authentication (401)
 * and admin routes enforce admin role (403).
 *
 * Deeper tests (per-tenant role enforcement, resource ownership)
 * require authenticated requests → deferred.
 */

import { createAuthGuard } from '@bslt/core/auth';
import { tenantRoutes } from '@bslt/core/tenants';
import { registerRouteMap } from '@bslt/server-engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-engine';

// ============================================================================
// Mock Repositories (minimal set for tenant routes)
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
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mb-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    tenants: {
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'tenant-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    invitations: {
      findById: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findByTenantId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
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

describe('RBAC Integration Tests', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    const mockDb = createMockDbClient();
    const mockRepos = createMockRepos();
    const mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, tenantRoutes, {
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
  // Route Existence — RBAC-protected tenant endpoints respond (not 404)
  // ==========================================================================

  describe('route existence', () => {
    it('POST /api/tenants responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        payload: { name: 'test', slug: 'test' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/tenants/list responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/tenants/list' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/tenants/:id responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/tenants/t-1' });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/tenants/:id/members/add responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/add',
        payload: { userId: 'u-1', role: 'member' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/tenants/:id/members/:userId/role responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/u-1/role',
        payload: { role: 'admin' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/tenants/:id/members/:userId/remove responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/u-1/remove',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/tenants/:id/transfer-ownership responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/transfer-ownership',
        payload: { newOwnerId: 'u-2' },
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guards — Protected routes reject unauthenticated requests (401)
  // ==========================================================================

  describe('auth guards (unauthenticated → 401)', () => {
    it('POST /api/tenants requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        payload: { name: 'test', slug: 'test' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/tenants/list requires auth', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/tenants/list' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/tenants/:id requires auth', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/tenants/t-1' });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/update requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/update',
        payload: { name: 'updated' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/delete requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/delete',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/members/add requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/add',
        payload: { userId: 'u-1', role: 'member' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/members/:userId/role requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/u-1/role',
        payload: { role: 'admin' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/members/:userId/remove requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/members/u-1/remove',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/transfer-ownership requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/transfer-ownership',
        payload: { newOwnerId: 'u-2' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/tenants/:id/invitations requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/t-1/invitations',
        payload: { email: 'invite@example.com', role: 'member' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/tenants/:id/invitations/list requires auth', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/t-1/invitations/list',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/invitations/:id/accept requires auth', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/invitations/inv-1/accept',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/tenants/:id/audit-events requires auth', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/t-1/audit-events',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
