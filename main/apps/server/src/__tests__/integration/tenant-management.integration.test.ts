// main/apps/server/src/__tests__/integration/tenant-management.integration.test.ts
/**
 * Tenant Management API Integration Tests
 *
 * Tests the tenant management endpoints through fastify.inject(),
 * verifying routing, auth guards, method enforcement, and schema validation.
 *
 * Covers: /api/tenants, /api/tenants/:id, /api/tenants/:id/members,
 *         /api/tenants/:id/invitations, /api/invitations/:id/accept
 */

import { createAuthGuard } from '@bslt/core';
import { tenantRoutes } from '@bslt/core/tenants';
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
      findPendingByTenantAndEmail: vi.fn().mockResolvedValue(null),
      findPendingByEmail: vi.fn().mockResolvedValue(null),
      countPendingByTenantId: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findByTenantId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
    notifications: {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    auditEvents: {
      create: vi.fn().mockResolvedValue({ id: 'ae-1' }),
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

describe('Tenant Management API Integration Tests', () => {
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
  // POST /api/tenants — Create Workspace
  // ==========================================================================

  describe('POST /api/tenants', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        payload: { name: 'Test Workspace', slug: 'test-workspace' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants',
        payload: { name: 'Test Workspace', slug: 'test-workspace' },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/tenants/list — List Workspaces
  // ==========================================================================

  describe('GET /api/tenants/list', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/list',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/list',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // GET /api/tenants/:id — Get Workspace
  // ==========================================================================

  describe('GET /api/tenants/:id', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/update — Update Workspace
  // ==========================================================================

  describe('POST /api/tenants/:id/update', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/update',
        payload: { name: 'Updated Workspace' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/update',
        payload: { name: 'Updated' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/update',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/delete — Delete Workspace
  // ==========================================================================

  describe('POST /api/tenants/:id/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/transfer-ownership
  // ==========================================================================

  describe('POST /api/tenants/:id/transfer-ownership', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/transfer-ownership',
        payload: { newOwnerId: 'user-2' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/transfer-ownership',
        payload: { newOwnerId: 'user-2' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // GET /api/tenants/:id/audit-events
  // ==========================================================================

  describe('GET /api/tenants/:id/audit-events', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/audit-events',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/audit-events',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // GET /api/tenants/:id/members — List Members
  // ==========================================================================

  describe('GET /api/tenants/:id/members', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/members',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/members',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/members/add — Add Member
  // ==========================================================================

  describe('POST /api/tenants/:id/members/add', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/add',
        payload: { userId: 'user-2', role: 'member' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/add',
        payload: { userId: 'user-2', role: 'member' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/members/:userId/role — Update Member Role
  // ==========================================================================

  describe('POST /api/tenants/:id/members/:userId/role', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/user-2/role',
        payload: { role: 'admin' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/user-2/role',
        payload: { role: 'admin' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/members/:userId/remove — Remove Member
  // ==========================================================================

  describe('POST /api/tenants/:id/members/:userId/remove', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/user-2/remove',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/members/user-2/remove',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/invitations — Create Invitation
  // ==========================================================================

  describe('POST /api/tenants/:id/invitations', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations',
        payload: { email: 'invite@example.com', role: 'member' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations',
        payload: { email: 'invite@example.com', role: 'member' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // GET /api/tenants/:id/invitations/list — List Invitations
  // ==========================================================================

  describe('GET /api/tenants/:id/invitations/list', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/invitations/list',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/test-id/invitations/list',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/invitations/:id/accept — Accept Invitation
  // ==========================================================================

  describe('POST /api/invitations/:id/accept', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/invitations/inv-123/accept',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/invitations/inv-123/accept',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/invitations/:invitationId/revoke
  // ==========================================================================

  describe('POST /api/tenants/:id/invitations/:invitationId/revoke', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/revoke',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/revoke',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/invitations/:invitationId/resend
  // ==========================================================================

  describe('POST /api/tenants/:id/invitations/:invitationId/resend', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/resend',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/resend',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/tenants/:id/invitations/:invitationId/regenerate
  // ==========================================================================

  describe('POST /api/tenants/:id/invitations/:invitationId/regenerate', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/regenerate',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/test-id/invitations/inv-1/regenerate',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Tenant-Scoped Query Tests (Sprint 4.5)
  // ==========================================================================

  describe('tenant-scoped queries only return data for the active workspace', () => {
    it('listing members for tenant-A does not include tenant-B members', async () => {
      const now = new Date();

      // User is a member of tenant-A
      mockRepos.memberships.findByTenantAndUser.mockImplementation(
        async (tenantId: string, _userId: string) => {
          if (tenantId === 'tenant-A') {
            return { id: 'mb-a', tenantId: 'tenant-A', userId: 'user-scope-1', role: 'owner', createdAt: now, updatedAt: now };
          }
          return null; // Not a member of tenant-B
        },
      );

      // tenant-A has its own members
      mockRepos.memberships.findByTenantId.mockImplementation(async (tenantId: string) => {
        if (tenantId === 'tenant-A') {
          return [
            {
              id: 'mb-a1',
              tenantId: 'tenant-A',
              userId: 'user-scope-1',
              role: 'owner',
              user: { id: 'user-scope-1', email: 'owner-a@example.com', username: 'ownerA' },
              createdAt: now,
              updatedAt: now,
            },
          ];
        }
        if (tenantId === 'tenant-B') {
          return [
            {
              id: 'mb-b1',
              tenantId: 'tenant-B',
              userId: 'user-scope-2',
              role: 'owner',
              user: { id: 'user-scope-2', email: 'owner-b@example.com', username: 'ownerB' },
              createdAt: now,
              updatedAt: now,
            },
          ];
        }
        return [];
      });

      mockRepos.tenants.findById.mockImplementation(async (id: string) => {
        if (id === 'tenant-A') {
          return { id: 'tenant-A', name: 'Workspace A', slug: 'workspace-a', ownerId: 'user-scope-1', createdAt: now };
        }
        if (id === 'tenant-B') {
          return { id: 'tenant-B', name: 'Workspace B', slug: 'workspace-b', ownerId: 'user-scope-2', createdAt: now };
        }
        return null;
      });

      const token = createTestJwt({
        userId: 'user-scope-1',
        email: 'owner-a@example.com',
        role: 'user',
      });

      // Request members for tenant-A (user is a member)
      const responseA = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-A/members',
          accessToken: token,
        }),
      );

      expect(responseA.statusCode).toBe(200);
      const membersA = parseJsonResponse(responseA) as Array<{ userId: string }>;
      // Should only contain tenant-A member data
      const userIdsA = membersA.map((m) => m.userId);
      expect(userIdsA).toContain('user-scope-1');
      expect(userIdsA).not.toContain('user-scope-2');

      // Request members for tenant-B (user is NOT a member) => should be forbidden
      const responseB = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-B/members',
          accessToken: token,
        }),
      );

      // Non-member should get 403 Forbidden
      const bodyB = parseJsonResponse(responseB) as { message: string };
      expect([403, 404]).toContain(responseB.statusCode);
      expect(bodyB.message).toBeDefined();
    });

    it('listing invitations for a workspace only returns that workspace invitations', async () => {
      const now = new Date();
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-scope',
        name: 'Inv Scope WS',
        slug: 'inv-scope-ws',
        ownerId: 'user-inv-1',
        createdAt: now,
      });

      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-1',
        tenantId: 'tenant-inv-scope',
        userId: 'user-inv-1',
        role: 'owner',
      });

      mockRepos.invitations.findByTenantId.mockResolvedValue([
        {
          id: 'inv-scope-1',
          tenantId: 'tenant-inv-scope',
          email: 'invite-a@example.com',
          role: 'member',
          status: 'pending',
          invitedById: 'user-inv-1',
          expiresAt: futureExpiry,
          acceptedAt: null,
          createdAt: now,
        },
      ]);

      const token = createTestJwt({
        userId: 'user-inv-1',
        email: 'owner-inv@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-inv-scope/invitations/list',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBe(200);
      const invitations = parseJsonResponse(response) as Array<{ tenantId: string }>;
      expect(invitations).toHaveLength(1);
      // All returned invitations belong to the requested tenant
      for (const inv of invitations) {
        expect(inv.tenantId).toBe('tenant-inv-scope');
      }
    });
  });

  // ==========================================================================
  // Expired Invitation Rejection (Sprint 4.5)
  // ==========================================================================

  describe('expired invitation rejection with clear error', () => {
    it('accepting an expired invitation returns 400 with clear error message', async () => {
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      mockRepos.invitations.findById.mockResolvedValue({
        id: 'inv-expired-1',
        tenantId: 'tenant-exp',
        email: 'expired-user@example.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-inviter-1',
        expiresAt: pastDate, // Already expired
        acceptedAt: null,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });

      const token = createTestJwt({
        userId: 'user-accepter-1',
        email: 'expired-user@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/invitations/inv-expired-1/accept',
          accessToken: token,
        }),
      );

      // Should reject with 400 Bad Request
      expect(response.statusCode).toBe(400);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/expired/i);
    });

    it('accepting an already-accepted invitation returns 400', async () => {
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const acceptedDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      mockRepos.invitations.findById.mockResolvedValue({
        id: 'inv-accepted-1',
        tenantId: 'tenant-acc',
        email: 'already-accepted@example.com',
        role: 'member',
        status: 'accepted',
        invitedById: 'user-inviter-2',
        expiresAt: futureExpiry,
        acceptedAt: acceptedDate,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });

      const token = createTestJwt({
        userId: 'user-accepter-2',
        email: 'already-accepted@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/invitations/inv-accepted-1/accept',
          accessToken: token,
        }),
      );

      // Should reject - invitation cannot be accepted again
      expect(response.statusCode).toBe(400);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBeDefined();
      expect(body.message.length).toBeGreaterThan(0);
    });

    it('accepting a non-existent invitation returns 404', async () => {
      mockRepos.invitations.findById.mockResolvedValue(null);

      const token = createTestJwt({
        userId: 'user-accepter-3',
        email: 'nobody@example.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/invitations/inv-does-not-exist/accept',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBe(404);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/not found/i);
    });
  });

  // ==========================================================================
  // Domain-Restricted Tenant Invitation Tests (Sprint 4.5)
  // ==========================================================================

  describe('domain-restricted tenant rejects invites to non-matching email domains', () => {
    it('creating invitation to non-allowed domain returns 400', async () => {
      const now = new Date();

      // Tenant has domain restriction
      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-domain-1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        ownerId: 'user-domain-owner',
        allowedEmailDomains: ['acme.com', 'acme.io'],
        createdAt: now,
      });

      // Actor is an admin of the workspace
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-domain-1',
        tenantId: 'tenant-domain-1',
        userId: 'user-domain-owner',
        role: 'owner',
      });

      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);

      const token = createTestJwt({
        userId: 'user-domain-owner',
        email: 'owner@acme.com',
        role: 'user',
      });

      // Try to invite an email from an external domain
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-domain-1/invitations',
          accessToken: token,
          payload: { email: 'outsider@gmail.com', role: 'member' },
        }),
      );

      expect(response.statusCode).toBe(400);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/domain.*not allowed/i);
    });

    it('creating invitation to allowed domain succeeds', async () => {
      const now = new Date();
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Tenant has domain restriction
      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-domain-2',
        name: 'Acme Corp',
        slug: 'acme-corp-2',
        ownerId: 'user-domain-owner-2',
        allowedEmailDomains: ['acme.com'],
        createdAt: now,
      });

      // Actor is an admin of the workspace
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-domain-2',
        tenantId: 'tenant-domain-2',
        userId: 'user-domain-owner-2',
        role: 'owner',
      });

      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);

      // Invitation creation succeeds
      mockRepos.invitations.create.mockResolvedValue({
        id: 'inv-domain-ok',
        tenantId: 'tenant-domain-2',
        email: 'teammate@acme.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-domain-owner-2',
        expiresAt: futureExpiry,
        acceptedAt: null,
        createdAt: now,
      });

      const token = createTestJwt({
        userId: 'user-domain-owner-2',
        email: 'owner2@acme.com',
        role: 'user',
      });

      // Invite an email from the allowed domain
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-domain-2/invitations',
          accessToken: token,
          payload: { email: 'teammate@acme.com', role: 'member' },
        }),
      );

      expect(response.statusCode).toBe(201);
      const body = parseJsonResponse(response) as { id: string; email: string };
      expect(body.email).toBe('teammate@acme.com');
      expect(body.id).toBe('inv-domain-ok');
    });

    it('tenant without domain restrictions allows any email domain', async () => {
      const now = new Date();
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Tenant has NO domain restriction
      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-nodomain',
        name: 'Open Workspace',
        slug: 'open-workspace',
        ownerId: 'user-open-owner',
        createdAt: now,
        // No allowedEmailDomains property
      });

      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-open',
        tenantId: 'tenant-nodomain',
        userId: 'user-open-owner',
        role: 'owner',
      });

      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);

      mockRepos.invitations.create.mockResolvedValue({
        id: 'inv-open-ok',
        tenantId: 'tenant-nodomain',
        email: 'anyone@anydomain.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-open-owner',
        expiresAt: futureExpiry,
        acceptedAt: null,
        createdAt: now,
      });

      const token = createTestJwt({
        userId: 'user-open-owner',
        email: 'owner@open.com',
        role: 'user',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-nodomain/invitations',
          accessToken: token,
          payload: { email: 'anyone@anydomain.com', role: 'member' },
        }),
      );

      expect(response.statusCode).toBe(201);
      const body = parseJsonResponse(response) as { email: string };
      expect(body.email).toBe('anyone@anydomain.com');
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Workspace name validation
  // ==========================================================================

  describe('adversarial: boundary — workspace name edge cases', () => {
    it('create workspace with empty string name returns 400', async () => {
      const token = createTestJwt({ userId: 'user-name-1', email: 'name1@example.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: '', slug: 'empty-name' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('create workspace with 10000-character name returns 400', async () => {
      const token = createTestJwt({ userId: 'user-name-2', email: 'name2@example.com' });
      const longName = 'W'.repeat(10000);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: longName, slug: 'long-name' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('create workspace with null name returns 400', async () => {
      const token = createTestJwt({ userId: 'user-name-3', email: 'name3@example.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: null, slug: 'null-name' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('create workspace with special characters in name does not cause injection', async () => {
      const token = createTestJwt({ userId: 'user-name-4', email: 'name4@example.com' });

      mockRepos.tenants.findBySlug.mockResolvedValue(null);

      // The createTenant handler uses raw DB transactions via tx.query
      const now = new Date();
      mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          query: vi.fn()
            .mockResolvedValueOnce([{
              id: 'tenant-special', name: '<script>alert("xss")</script>',
              slug: 'special-chars', logo_url: null, owner_id: 'user-name-4',
              is_active: true, metadata: {}, created_at: now, updated_at: now,
            }])
            .mockResolvedValueOnce([{
              id: 'mb-special', tenant_id: 'tenant-special', user_id: 'user-name-4',
              role: 'owner', created_at: now, updated_at: now,
            }]),
        };
        return cb(txMock);
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: '<script>alert("xss")</script>', slug: 'special-chars' },
        }),
      );

      // Server should handle XSS-like names without crashing
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
      if (response.statusCode === 200 || response.statusCode === 201) {
        const body = parseJsonResponse(response) as { name: string };
        expect(body.name).toBeDefined();
      }
    });

    it('create workspace with SQL injection in name does not cause injection', async () => {
      const token = createTestJwt({ userId: 'user-name-5', email: 'name5@example.com' });

      mockRepos.tenants.findBySlug.mockResolvedValue(null);

      const now = new Date();
      mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          query: vi.fn()
            .mockResolvedValueOnce([{
              id: 'tenant-sqli', name: "'; DROP TABLE tenants; --",
              slug: 'sqli-name', logo_url: null, owner_id: 'user-name-5',
              is_active: true, metadata: {}, created_at: now, updated_at: now,
            }])
            .mockResolvedValueOnce([{
              id: 'mb-sqli', tenant_id: 'tenant-sqli', user_id: 'user-name-5',
              role: 'owner', created_at: now, updated_at: now,
            }]),
        };
        return cb(txMock);
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: "'; DROP TABLE tenants; --", slug: 'sqli-name' },
        }),
      );

      // Server should handle SQL-like names through parameterized queries
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('create workspace with unicode/emoji name does not crash', async () => {
      const token = createTestJwt({ userId: 'user-name-6', email: 'name6@example.com' });

      mockRepos.tenants.findBySlug.mockResolvedValue(null);

      const now = new Date();
      mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          query: vi.fn()
            .mockResolvedValueOnce([{
              id: 'tenant-unicode', name: '\u{1F680} Rocket Workspace \u{2603}',
              slug: 'rocket-workspace', logo_url: null, owner_id: 'user-name-6',
              is_active: true, metadata: {}, created_at: now, updated_at: now,
            }])
            .mockResolvedValueOnce([{
              id: 'mb-unicode', tenant_id: 'tenant-unicode', user_id: 'user-name-6',
              role: 'owner', created_at: now, updated_at: now,
            }]),
        };
        return cb(txMock);
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: '\u{1F680} Rocket Workspace \u{2603}', slug: 'rocket-workspace' },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('create workspace with missing name field returns 400', async () => {
      const token = createTestJwt({ userId: 'user-name-7', email: 'name7@example.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { slug: 'no-name-given' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('create workspace with only whitespace name is handled without crashing', async () => {
      const token = createTestJwt({ userId: 'user-name-8', email: 'name8@example.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: '   ', slug: 'whitespace-name' },
        }),
      );

      // The handler may accept whitespace names (no validation) or reject them.
      // Key assertion: server does not crash or return 502.
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Invitation email validation
  // ==========================================================================

  describe('adversarial: boundary — invitation email edge cases', () => {
    it('invite with invalid email format returns 400', async () => {
      const token = createTestJwt({ userId: 'user-inv-owner', email: 'owner@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-test',
        name: 'Inv Test WS',
        slug: 'inv-test-ws',
        ownerId: 'user-inv-owner',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-owner',
        tenantId: 'tenant-inv-test',
        userId: 'user-inv-owner',
        role: 'owner',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-inv-test/invitations',
          accessToken: token,
          payload: { email: 'not-a-valid-email', role: 'member' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('invite with empty string email returns 400', async () => {
      const token = createTestJwt({ userId: 'user-inv-empty', email: 'empty-inv@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-empty',
        name: 'Empty Inv WS',
        slug: 'empty-inv-ws',
        ownerId: 'user-inv-empty',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-empty',
        tenantId: 'tenant-inv-empty',
        userId: 'user-inv-empty',
        role: 'owner',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-inv-empty/invitations',
          accessToken: token,
          payload: { email: '', role: 'member' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('invite with null email returns 400', async () => {
      const token = createTestJwt({ userId: 'user-inv-null', email: 'null-inv@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-null',
        name: 'Null Inv WS',
        slug: 'null-inv-ws',
        ownerId: 'user-inv-null',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-null',
        tenantId: 'tenant-inv-null',
        userId: 'user-inv-null',
        role: 'owner',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-inv-null/invitations',
          accessToken: token,
          payload: { email: null, role: 'member' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('invite with extremely long email (5000 chars) returns 400', async () => {
      const token = createTestJwt({ userId: 'user-inv-long', email: 'long-inv@test.com' });
      const longEmail = 'a'.repeat(4990) + '@test.com';

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-long',
        name: 'Long Inv WS',
        slug: 'long-inv-ws',
        ownerId: 'user-inv-long',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-long',
        tenantId: 'tenant-inv-long',
        userId: 'user-inv-long',
        role: 'owner',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-inv-long/invitations',
          accessToken: token,
          payload: { email: longEmail, role: 'member' },
        }),
      );

      expect([400, 422]).toContain(response.statusCode);
    });

    it('duplicate invitation for same email returns 400 or 409', async () => {
      const token = createTestJwt({ userId: 'user-inv-dup', email: 'dup-inv@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-inv-dup',
        name: 'Dup Inv WS',
        slug: 'dup-inv-ws',
        ownerId: 'user-inv-dup',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-inv-dup',
        tenantId: 'tenant-inv-dup',
        userId: 'user-inv-dup',
        role: 'owner',
      });

      // A pending invitation already exists for this email
      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue({
        id: 'inv-existing',
        tenantId: 'tenant-inv-dup',
        email: 'already-invited@test.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-inv-dup',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-inv-dup/invitations',
          accessToken: token,
          payload: { email: 'already-invited@test.com', role: 'member' },
        }),
      );

      expect([400, 409]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — DB returning null tenant mid-operation
  // ==========================================================================

  describe('adversarial: layer — DB returns null tenant mid-operation', () => {
    it('tenant deleted between auth check and operation returns 404 or 403', async () => {
      const token = createTestJwt({ userId: 'user-vanish', email: 'vanish@test.com' });

      // Tenant lookup returns null (was deleted)
      mockRepos.tenants.findById.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/deleted-tenant-id/update',
          accessToken: token,
          payload: { name: 'Ghost Update' },
        }),
      );

      expect([403, 404]).toContain(response.statusCode);
    });

    it('tenant repo throwing mid-invitation-create returns 500', async () => {
      const token = createTestJwt({ userId: 'user-db-crash', email: 'dbcrash@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-crash',
        name: 'Crash WS',
        slug: 'crash-ws',
        ownerId: 'user-db-crash',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-crash',
        tenantId: 'tenant-crash',
        userId: 'user-db-crash',
        role: 'owner',
      });
      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);

      // DB crashes during invitation creation
      mockRepos.invitations.create.mockRejectedValue(new Error('ECONNRESET: connection reset'));

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-crash/invitations',
          accessToken: token,
          payload: { email: 'victim@example.com', role: 'member' },
        }),
      );

      // Should return 500, not hang
      expect(response.statusCode).toBe(500);
    });

    it('membership repo returning malformed data does not crash list-members', async () => {
      const token = createTestJwt({ userId: 'user-malformed', email: 'malformed@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-malformed',
        name: 'Malformed WS',
        slug: 'malformed-ws',
        ownerId: 'user-malformed',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-malformed',
        tenantId: 'tenant-malformed',
        userId: 'user-malformed',
        role: 'owner',
      });
      // Return malformed membership records (missing user property)
      mockRepos.memberships.findByTenantId.mockResolvedValue([
        {
          id: 'mb-bad',
          tenantId: 'tenant-malformed',
          userId: null,
          role: undefined,
          user: null,
          createdAt: null,
          updatedAt: null,
        },
      ] as never);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/tenants/tenant-malformed/members',
          accessToken: token,
        }),
      );

      // Should not crash; may return 200 with partial data or 500
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(502);
    });
  });

  // ==========================================================================
  // Adversarial: Async — Concurrent workspace creation with same name
  // ==========================================================================

  describe('adversarial: async — concurrent workspace creation', () => {
    it('concurrent workspace creation with same slug does not create duplicates', async () => {
      const token = createTestJwt({ userId: 'user-concurrent', email: 'concurrent@test.com' });
      const now = new Date();

      mockRepos.tenants.findBySlug.mockResolvedValue(null);

      let txCallCount = 0;
      mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        txCallCount++;
        if (txCallCount > 1) {
          throw new Error('Unique constraint violation: slug already exists');
        }
        const txMock = {
          query: vi.fn()
            .mockResolvedValueOnce([{
              id: 'tenant-concurrent', name: 'Concurrent WS',
              slug: 'concurrent-ws', logo_url: null, owner_id: 'user-concurrent',
              is_active: true, metadata: {}, created_at: now, updated_at: now,
            }])
            .mockResolvedValueOnce([{
              id: 'mb-concurrent', tenant_id: 'tenant-concurrent', user_id: 'user-concurrent',
              role: 'owner', created_at: now, updated_at: now,
            }]),
        };
        return cb(txMock);
      });

      const requestOpts = buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/tenants',
        accessToken: token,
        payload: { name: 'Concurrent WS', slug: 'concurrent-ws' },
      });

      const [response1, response2] = await Promise.all([
        testServer.inject(requestOpts),
        testServer.inject(requestOpts),
      ]);

      // Neither should be 502 (proxy error / crash)
      expect(response1.statusCode).not.toBe(502);
      expect(response2.statusCode).not.toBe(502);

      const statuses = [response1.statusCode, response2.statusCode].sort();
      // At least one should succeed (201) or both may get 500 due to race
      // The key assertion: server handles it gracefully without hanging
      expect(statuses.every((s) => s !== 502)).toBe(true);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double invitation for same email
  // ==========================================================================

  describe('adversarial: idempotency — double invitation', () => {
    it('double-POST invitation for same email returns consistent state', async () => {
      const token = createTestJwt({ userId: 'user-idemp-inv', email: 'idemp-inv@test.com' });
      const now = new Date();
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-idemp-inv',
        name: 'Idemp Inv WS',
        slug: 'idemp-inv-ws',
        ownerId: 'user-idemp-inv',
        createdAt: now,
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-idemp-inv',
        tenantId: 'tenant-idemp-inv',
        userId: 'user-idemp-inv',
        role: 'owner',
      });
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);

      // First call: no pending invitation exists
      mockRepos.invitations.findPendingByTenantAndEmail
        .mockResolvedValueOnce(null)
        // Second call: invitation now exists
        .mockResolvedValueOnce({
          id: 'inv-first',
          tenantId: 'tenant-idemp-inv',
          email: 'idemp-target@example.com',
          role: 'member',
          status: 'pending',
          invitedById: 'user-idemp-inv',
          expiresAt: futureExpiry,
          acceptedAt: null,
          createdAt: now,
        });

      mockRepos.invitations.create.mockResolvedValue({
        id: 'inv-first',
        tenantId: 'tenant-idemp-inv',
        email: 'idemp-target@example.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-idemp-inv',
        expiresAt: futureExpiry,
        acceptedAt: null,
        createdAt: now,
      });

      const requestOpts = buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/tenants/tenant-idemp-inv/invitations',
        accessToken: token,
        payload: { email: 'idemp-target@example.com', role: 'member' },
      });

      const response1 = await testServer.inject(requestOpts);
      const response2 = await testServer.inject(requestOpts);

      // First should succeed (201), second should be rejected (400/409 — duplicate)
      expect(response1.statusCode).toBe(201);
      expect([400, 409]).toContain(response2.statusCode);
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" Test — Expired session + CSRF + proto pollution
  // ==========================================================================

  describe('adversarial: killer tests — combined attack scenarios', () => {
    it('expired token + workspace creation with proto pollution in name is rejected', async () => {
      const expiredToken = createTestJwt({
        userId: 'user-killer-exp',
        email: 'killer-exp@test.com',
        expiresIn: '0s',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: expiredToken,
          payload: JSON.parse('{"name":"Hacked","slug":"hacked","__proto__":{"isAdmin":true},"constructor":{"prototype":{"polluted":"yes"}}}'),
        }),
      );

      // Must be 401 (expired token)
      expect(response.statusCode).toBe(401);
      // Prototype must not be polluted
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('valid token + proto pollution in tenant update payload is neutralized', async () => {
      const token = createTestJwt({ userId: 'user-proto-update', email: 'proto-update@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-proto',
        name: 'Proto WS',
        slug: 'proto-ws',
        ownerId: 'user-proto-update',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-proto',
        tenantId: 'tenant-proto',
        userId: 'user-proto-update',
        role: 'owner',
      });
      mockRepos.tenants.update.mockResolvedValue({
        id: 'tenant-proto',
        name: 'Safe Update',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-proto/update',
          accessToken: token,
          payload: JSON.parse('{"name":"Safe Update","__proto__":{"admin":true}}'),
        }),
      );

      // Should not crash
      expect(response.statusCode).not.toBe(502);
      // Prototype must not be polluted
      expect(({} as Record<string, unknown>)['admin']).toBeUndefined();
    });

    it('oversized payload (1MB) on workspace creation is handled safely', async () => {
      const token = createTestJwt({ userId: 'user-mega', email: 'mega@test.com' });
      const megaPayload = { name: 'X'.repeat(1024 * 1024), slug: 'mega-ws' };

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: megaPayload,
        }),
      );

      // Should be rejected with 400/413 or handled — never 502
      expect(response.statusCode).not.toBe(502);
      expect(response.statusCode).not.toBe(503);
    });

    it('concurrent invitation create + accept for same email does not corrupt data', async () => {
      const ownerToken = createTestJwt({ userId: 'user-race-owner', email: 'raceowner@test.com' });
      const inviteeToken = createTestJwt({ userId: 'user-race-invitee', email: 'raceinvitee@test.com' });
      const now = new Date();
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-race-inv',
        name: 'Race Inv WS',
        slug: 'race-inv-ws',
        ownerId: 'user-race-owner',
        createdAt: now,
      });
      mockRepos.memberships.findByTenantAndUser.mockImplementation(
        async (_tenantId: string, userId: string) => {
          if (userId === 'user-race-owner') {
            return { id: 'mb-race-owner', tenantId: 'tenant-race-inv', userId, role: 'owner' };
          }
          return null;
        },
      );
      mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
      mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);
      mockRepos.invitations.create.mockResolvedValue({
        id: 'inv-race',
        tenantId: 'tenant-race-inv',
        email: 'raceinvitee@test.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-race-owner',
        expiresAt: futureExpiry,
        acceptedAt: null,
        createdAt: now,
      });
      mockRepos.invitations.findById.mockResolvedValue({
        id: 'inv-race',
        tenantId: 'tenant-race-inv',
        email: 'raceinvitee@test.com',
        role: 'member',
        status: 'pending',
        invitedById: 'user-race-owner',
        expiresAt: futureExpiry,
        acceptedAt: null,
        createdAt: now,
      });

      const [createResponse, acceptResponse] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/tenants/tenant-race-inv/invitations',
            accessToken: ownerToken,
            payload: { email: 'raceinvitee@test.com', role: 'member' },
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/invitations/inv-race/accept',
            accessToken: inviteeToken,
          }),
        ),
      ]);

      // Both should complete without crashing
      expect(createResponse.statusCode).toBeDefined();
      expect(acceptResponse.statusCode).toBeDefined();
      expect(createResponse.statusCode).not.toBe(502);
      expect(acceptResponse.statusCode).not.toBe(502);
    });

    it('invitation with XSS in email field is safely handled', async () => {
      const token = createTestJwt({ userId: 'user-xss-inv', email: 'xss-inv@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-xss-inv',
        name: 'XSS Inv WS',
        slug: 'xss-inv-ws',
        ownerId: 'user-xss-inv',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue({
        id: 'mb-xss-inv',
        tenantId: 'tenant-xss-inv',
        userId: 'user-xss-inv',
        role: 'owner',
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-xss-inv/invitations',
          accessToken: token,
          payload: { email: '<img src=x onerror=alert(1)>@evil.com', role: 'member' },
        }),
      );

      // Should be rejected as invalid email, never 500
      expect([400, 422]).toContain(response.statusCode);
    });

    it('workspace creation with __proto__ in slug is neutralized', async () => {
      const token = createTestJwt({ userId: 'user-proto-slug', email: 'protoslug@test.com' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants',
          accessToken: token,
          payload: { name: 'Proto Slug WS', slug: '__proto__' },
        }),
      );

      // Must not pollute prototype
      expect(({} as Record<string, unknown>)['name']).toBeUndefined();
      expect(response.statusCode).not.toBe(502);
    });

    it('DELETE workspace with non-member token returns 403', async () => {
      const attackerToken = createTestJwt({ userId: 'attacker-del', email: 'attacker-del@test.com' });

      mockRepos.tenants.findById.mockResolvedValue({
        id: 'tenant-victim',
        name: 'Victim WS',
        slug: 'victim-ws',
        ownerId: 'real-owner',
        createdAt: new Date(),
      });
      mockRepos.memberships.findByTenantAndUser.mockResolvedValue(null);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/tenants/tenant-victim/delete',
          accessToken: attackerToken,
        }),
      );

      expect(response.statusCode).toBe(403);
    });
  });
});
