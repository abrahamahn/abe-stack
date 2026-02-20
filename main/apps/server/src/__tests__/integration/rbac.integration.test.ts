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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createAdminJwt,
  createTestJwt,
  createTestServer,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';

import { registerRouteMap } from '@/http';

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
      findByTenantAndUser: vi.fn().mockResolvedValue(null),
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

  // ==========================================================================
  // Per-Tenant Role Enforcement — viewer cannot write, member cannot manage
  // ==========================================================================

  describe('per-tenant role enforcement', () => {
    it('viewer cannot add members to a workspace', async () => {
      const viewerUserId = 'viewer-user-1';
      const viewerJwt = createTestJwt({ userId: viewerUserId, email: 'viewer@example.com' });

      // Mock: tenant exists

      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test' });

      // Mock: viewer is a member with role 'viewer'
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-viewer',
        tenantId: 'tenant-1',
        userId: viewerUserId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Attempt to add a member as viewer — should be forbidden
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/add',
          accessToken: viewerJwt,
          payload: { userId: 'new-user-1', role: 'member' },
        }),
      );

      // Viewer lacks permission: expect 403 Forbidden
      expect(response.statusCode).toBe(403);
    });

    it('viewer cannot update workspace settings', async () => {
      const viewerUserId = 'viewer-user-2';
      const viewerJwt = createTestJwt({ userId: viewerUserId, email: 'viewer2@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-viewer-2',
        tenantId: 'tenant-1',
        userId: viewerUserId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/update',
          accessToken: viewerJwt,
          payload: { name: 'Hacked Name' },
        }),
      );

      // Viewer cannot write — expect 403
      expect(response.statusCode).toBe(403);
    });

    it('member cannot manage other members (change roles)', async () => {
      const memberUserId = 'member-user-1';
      const memberJwt = createTestJwt({ userId: memberUserId, email: 'member@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-member-1',
        tenantId: 'tenant-1',
        userId: memberUserId,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/other-user/role',
          accessToken: memberJwt,
          payload: { role: 'admin' },
        }),
      );

      // Member cannot manage roles — expect 403
      expect(response.statusCode).toBe(403);
    });

    it('member cannot remove other members', async () => {
      const memberUserId = 'member-user-2';
      const memberJwt = createTestJwt({ userId: memberUserId, email: 'member2@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-member-2',
        tenantId: 'tenant-1',
        userId: memberUserId,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/other-user/remove',
          accessToken: memberJwt,
        }),
      );

      // Member cannot remove others — expect 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Resource Ownership — user A cannot access user B's resources
  // ==========================================================================

  describe('resource ownership validation', () => {
    it('user A cannot access user B tenant when not a member', async () => {
      const userAId = 'user-a';
      const userAJwt = createTestJwt({ userId: userAId, email: 'usera@example.com' });


      // Tenant exists but userA is NOT a member
      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-b', name: 'B Workspace' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-b',
          accessToken: userAJwt,
        }),
      );

      // User A is not a member of tenant-b — expect 403
      expect(response.statusCode).toBe(403);
    });

    it('user A cannot list members of a workspace they do not belong to', async () => {
      const userAId = 'user-a-2';
      const userAJwt = createTestJwt({ userId: userAId, email: 'usera2@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-foreign', name: 'Foreign' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-foreign/members',
          accessToken: userAJwt,
        }),
      );

      // Not a member — expect 403
      expect([403, 404]).toContain(response.statusCode);
    });

    it('user cannot transfer ownership of a workspace they do not own', async () => {
      const userId = 'regular-user';
      const userJwt = createTestJwt({ userId, email: 'regular@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });
      // User is a member but not the owner
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-reg',
        tenantId: 'tenant-1',
        userId,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/transfer-ownership',
          accessToken: userJwt,
          payload: { newOwnerId: 'some-other-user' },
        }),
      );

      // Non-owner cannot transfer ownership — expect 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // System Admin vs Workspace Admin Distinction
  // ==========================================================================

  describe('system admin vs workspace admin distinction', () => {
    it('system admin JWT is authenticated (not 401) when accessing tenant routes', async () => {
      const adminJwt = createAdminJwt();

      // The tenant routes do not have admin-only endpoints, so we verify
      // that system admin JWT produces a valid token that passes auth
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: adminJwt,
          payload: { name: 'Admin Workspace', slug: 'admin-ws' },
        }),
      );

      // System admin JWT is recognized as valid (not 401)
      expect(response.statusCode).not.toBe(401);
    });

    it('workspace admin (non-system-admin) can manage members within their workspace', async () => {
      const wsAdminId = 'ws-admin-user';
      // Regular user JWT (role: user, not admin)
      const wsAdminJwt = createTestJwt({ userId: wsAdminId, email: 'wsadmin@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });
      // Workspace admin membership (role=admin in workspace, but user role at system level)
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-wsadmin',
        tenantId: 'tenant-1',
        userId: wsAdminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepos.users.findById.mockResolvedValue({
        id: 'target-user',
        email: 'target@example.com',
      });
      mockRepos.memberships.findByTenantId.mockResolvedValue([]);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/add',
          accessToken: wsAdminJwt,
          payload: { userId: 'target-user', role: 'member' },
        }),
      );

      // Workspace admin can add members — should not be 401 or 403
      expect(response.statusCode).not.toBe(401);
    });

    it('workspace admin cannot transfer ownership (only owner can)', async () => {
      const wsAdminId = 'ws-admin-user-2';
      const wsAdminJwt = createTestJwt({ userId: wsAdminId, email: 'wsadmin2@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-wsadmin-2',
        tenantId: 'tenant-1',
        userId: wsAdminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/transfer-ownership',
          accessToken: wsAdminJwt,
          payload: { newOwnerId: 'other-user-id' },
        }),
      );

      // Workspace admin cannot transfer ownership — expect 403
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Role Change Takes Effect Immediately on Next Request
  // ==========================================================================

  describe('role change takes effect immediately', () => {
    it('after role upgrade from viewer to admin, member can perform admin actions', async () => {
      const userId = 'promoted-user';
      const userJwt = createTestJwt({ userId, email: 'promoted@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });

      // First request: user is viewer — add member should fail
      mockRepos.memberships.findByTenantAndUser.mockResolvedValueOnce({
        id: 'mb-promo',
        tenantId: 'tenant-1',
        userId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const firstResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/add',
          accessToken: userJwt,
          payload: { userId: 'new-user', role: 'member' },
        }),
      );

      expect(firstResponse.statusCode).toBe(403);

      // Simulate role upgrade: now the same user is an admin
      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValueOnce({
        id: 'mb-promo',
        tenantId: 'tenant-1',
        userId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepos.users.findById.mockResolvedValue({
        id: 'new-user',
        email: 'newuser@example.com',
      });
      // No existing membership for target
      mockRepos.memberships.findByTenantId.mockResolvedValue([]);

      const secondResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/add',
          accessToken: userJwt,
          payload: { userId: 'new-user', role: 'member' },
        }),
      );

      // After upgrade, admin can add members — should not be 403
      expect(secondResponse.statusCode).not.toBe(403);
    });

    it('after role downgrade from admin to viewer, member loses admin actions', async () => {
      const userId = 'demoted-user';
      const userJwt = createTestJwt({ userId, email: 'demoted@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Workspace' });

      // First: user is admin — can update workspace
      mockRepos.memberships.findByTenantAndUser.mockResolvedValueOnce({
        id: 'mb-demo',
        tenantId: 'tenant-1',
        userId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRepos.tenants.update.mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Updated Name',
      });

      const firstResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/update',
          accessToken: userJwt,
          payload: { name: 'Updated Name' },
        }),
      );

      // Admin can update — expect success
      expect(firstResponse.statusCode).not.toBe(403);

      // Now role changes to viewer
      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Updated Name' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValueOnce({
        id: 'mb-demo',
        tenantId: 'tenant-1',
        userId,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const secondResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/update',
          accessToken: userJwt,
          payload: { name: 'Hacked Again' },
        }),
      );

      // Viewer cannot update — expect 403
      expect(secondResponse.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Malformed Authorization Headers
  // ==========================================================================

  describe('adversarial: boundary — malformed authorization headers', () => {
    it('10MB token in Authorization header does not crash the server', async () => {
      const megaToken = 'A'.repeat(10 * 1024 * 1024); // 10MB

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        headers: { authorization: `Bearer ${megaToken}` },
        payload: { name: 'test', slug: 'test' },
      });

      // Should be rejected — 401 or 400 or 413, never 500/502
      expect(response.statusCode).not.toBe(500);
      expect(response.statusCode).not.toBe(502);
    });

    it('empty Bearer token returns 401', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        headers: { authorization: 'Bearer ' },
        payload: { name: 'test', slug: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('malformed base64 in JWT returns 401', async () => {
      const malformedBase64 = 'eyJhbGci!!!INVALID.eyJzdWIi!!!INVALID.SIGNATURE!!!';

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: malformedBase64,
          payload: { name: 'test', slug: 'test' },
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('Bearer with only whitespace returns 401', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        headers: { authorization: 'Bearer    ' },
        payload: { name: 'test', slug: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('Authorization header with "null" string as token returns 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/list',
        headers: { authorization: 'Bearer null' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('Authorization header with "undefined" string as token returns 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/list',
        headers: { authorization: 'Bearer undefined' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('JWT with tampered payload (modified after signing) returns 401', async () => {
      const validToken = createTestJwt({ userId: 'user-1', email: 'test@example.com' });
      const parts = validToken.split('.');
      // Tamper with payload by changing a character
      const tamperedPayload = parts[1]!.substring(0, parts[1]!.length - 2) + 'XX';
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/list',
          accessToken: tamperedToken,
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('expired JWT returns 401', async () => {
      const expiredJwt = createTestJwt({
        userId: 'user-expired',
        email: 'expired@example.com',
        expiresIn: '0s',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/list',
          accessToken: expiredJwt,
        }),
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Non-existent / Malformed Role Values
  // ==========================================================================

  describe('adversarial: boundary — invalid role values in requests', () => {
    it('role change with non-existent role string returns 400 or 403', async () => {
      const adminId = 'admin-role-test';
      const adminJwt = createTestJwt({ userId: adminId, email: 'roleadmin@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-role-admin',
        tenantId: 'tenant-1',
        userId: adminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/target-user/role',
          accessToken: adminJwt,
          payload: { role: 'superadmin_nonexistent' },
        }),
      );

      // Invalid role should be rejected, not blindly persisted
      expect([400, 403, 422]).toContain(response.statusCode);
    });

    it('role change with numeric role value returns 400', async () => {
      const adminId = 'admin-numeric-role';
      const adminJwt = createTestJwt({ userId: adminId, email: 'numrole@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-num',
        tenantId: 'tenant-1',
        userId: adminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/target-user/role',
          accessToken: adminJwt,
          payload: { role: 999 },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('role change with null role value returns 400', async () => {
      const adminId = 'admin-null-role';
      const adminJwt = createTestJwt({ userId: adminId, email: 'nullrole@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-null',
        tenantId: 'tenant-1',
        userId: adminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/target-user/role',
          accessToken: adminJwt,
          payload: { role: null },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('role change with empty string role returns 400', async () => {
      const adminId = 'admin-empty-role';
      const adminJwt = createTestJwt({ userId: adminId, email: 'emptyrole@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-empty',
        tenantId: 'tenant-1',
        userId: adminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/target-user/role',
          accessToken: adminJwt,
          payload: { role: '' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('role change with array value for role returns 400', async () => {
      const adminId = 'admin-array-role';
      const adminJwt = createTestJwt({ userId: adminId, email: 'arrayrole@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-arr',
        tenantId: 'tenant-1',
        userId: adminId,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/members/target-user/role',
          accessToken: adminJwt,
          payload: { role: ['admin', 'owner'] },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — Permission cache returning stale/inconsistent data
  // ==========================================================================

  describe('adversarial: layer — stale/inconsistent permission data', () => {
    it('membership repo returning null mid-operation causes graceful failure', async () => {
      const userId = 'stale-user';
      const userJwt = createTestJwt({ userId, email: 'stale@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      // First call returns membership, second call returns null (deleted mid-request)
      mockRepos.memberships.findByTenantAndUser
        .mockResolvedValueOnce({
          id: 'mb-stale',
          tenantId: 'tenant-1',
          userId,
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-1/update',
          accessToken: userJwt,
          payload: { name: 'New Name' },
        }),
      );

      // Should not crash; either succeeds (first check) or 403/500
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('tenants repo returning null for existing tenant ID causes 404 or 403', async () => {
      const userId = 'user-null-tenant';
      const userJwt = createTestJwt({ userId, email: 'nulltenant@example.com' });


      // Tenant not found
      mockRepos.tenants.findById.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/nonexistent-tenant-id',
          accessToken: userJwt,
        }),
      );

      // Should get 404 or 403, never a crash
      expect([403, 404]).toContain(response.statusCode);
    });

    it('membership repo throwing error is handled gracefully (no crash)', async () => {
      const userId = 'user-error-membership';
      const userJwt = createTestJwt({ userId, email: 'errormb@example.com' });

      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-1', name: 'Test WS' });
      mockRepos.memberships.findByTenantAndUser.mockRejectedValue(
        new Error('Connection pool exhausted'),
      );

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-1',
          accessToken: userJwt,
        }),
      );

      // Error may be caught and treated as "no membership" (403) or propagated (500)
      // Key assertion: server handles it without crashing
      expect([403, 500]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double role-change request
  // ==========================================================================

  describe('adversarial: idempotency — double role-change', () => {
    it('double role-change request returns same final state', async () => {
      const ownerId = 'owner-idemp';
      const ownerJwt = createTestJwt({ userId: ownerId, email: 'owner-idemp@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-idemp',
        name: 'Idemp WS',
        ownerId,
      });

      // Owner membership
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-owner-idemp',
        tenantId: 'tenant-idemp',
        userId: ownerId,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Target member exists
      const targetMembership = {
        id: 'mb-target',
        tenantId: 'tenant-idemp',
        userId: 'target-user',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepos.memberships.findByTenantId.mockResolvedValue([
        { ...targetMembership, user: { id: 'target-user', email: 'target@example.com' } },
      ]);
      mockRepos.memberships.update.mockResolvedValue({ ...targetMembership, role: 'admin' });

      const requestOpts = buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/tenants/tenant-idemp/members/target-user/role',
        accessToken: ownerJwt,
        payload: { role: 'admin' },
      });

      const response1 = await testServer.inject(requestOpts);
      const response2 = await testServer.inject(requestOpts);

      // Both should succeed or both should return same status
      expect(response1.statusCode).not.toBe(500);
      expect(response2.statusCode).not.toBe(500);
      expect(response1.statusCode).toBe(response2.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" Test — Expired token + proto pollution + cross-tenant
  // ==========================================================================

  describe('adversarial: killer tests — combined attack vectors', () => {
    it('expired token user attempting workspace B admin operation is rejected', async () => {
      const expiredJwt = createTestJwt({
        userId: 'attacker-user',
        email: 'attacker@example.com',
        expiresIn: '0s',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/workspace-b/members/add',
          accessToken: expiredJwt,
          payload: { userId: 'victim-user', role: 'admin' },
        }),
      );

      expect(response.statusCode).toBe(401);
    });

    it('expired token + proto pollution payload does not pollute Object prototype', async () => {
      const expiredJwt = createTestJwt({
        userId: 'proto-attacker',
        email: 'proto-attack@example.com',
        expiresIn: '0s',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/workspace-target/update',
          accessToken: expiredJwt,
          payload: JSON.parse('{"name":"hacked","__proto__":{"isAdmin":true},"constructor":{"prototype":{"polluted":true}}}'),
        }),
      );

      // Must be rejected (expired token)
      expect(response.statusCode).toBe(401);
      // Verify prototype was not polluted
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('valid token user A cannot perform admin ops on workspace B they have no membership in', async () => {
      const userAJwt = createTestJwt({ userId: 'user-a-killer', email: 'usera-killer@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({
        id: 'workspace-b-private',
        name: 'Private Workspace B',
        ownerId: 'user-b-owner',
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/workspace-b-private/members/add',
          accessToken: userAJwt,
          payload: { userId: 'puppet-user', role: 'admin' },
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it('concurrent role escalation attempts from non-admin do not succeed', async () => {
      const memberJwt = createTestJwt({ userId: 'member-escalator', email: 'escalator@example.com' });


      mockRepos.tenants.findById.mockResolvedValue({ id: 'tenant-esc', name: 'Esc WS' });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-esc',
        tenantId: 'tenant-esc',
        userId: 'member-escalator',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requests = Array.from({ length: 5 }, () =>
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/tenants/tenant-esc/members/member-escalator/role',
            accessToken: memberJwt,
            payload: { role: 'owner' },
          }),
        ),
      );

      const responses = await Promise.all(requests);

      // All 5 concurrent attempts should be 403 — none should succeed
      for (const resp of responses) {
        expect(resp.statusCode).toBe(403);
      }
    });

    it('request with both valid auth and proto pollution in tenant ID is safe', async () => {
      const userJwt = createTestJwt({ userId: 'safe-user', email: 'safe@example.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/__proto__',
          accessToken: userJwt,
        }),
      );

      // Should be 403 or 404, never a crash
      expect(response.statusCode).not.toBe(500);
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
    });
  });
});
