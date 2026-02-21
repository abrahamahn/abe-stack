// main/apps/server/src/__tests__/integration/golden-path-tenant-rbac.integration.test.ts
/**
 * Golden Path: Tenant + RBAC Flow Integration Test (Sprint 5.1)
 *
 * Verifies the full end-to-end tenant and RBAC flow through fastify.inject():
 *   1. Owner creates workspace  (POST /api/tenants → 201)
 *   2. Owner invites teammate   (POST /api/tenants/:id/invitations → 201)
 *   3. Teammate accepts invite  (POST /api/invitations/:id/accept → 200)
 *   4. Member reads workspace   (GET  /api/tenants/:id → 200)
 *   5. Member cannot delete     (POST /api/tenants/:id/delete → 403)
 *
 * Tests are deliberately stateful and share mock state across steps.
 * Do NOT add vi.clearAllMocks() in beforeEach — the mock state must persist.
 */

import { createAuthGuard } from '@bslt/core/auth';
import { tenantRoutes } from '@bslt/core/tenants';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';

import { registerRouteMap } from '@/http';

// ============================================================================
// Constants
// ============================================================================

const OWNER_ID = 'gp-owner-1';
const OWNER_EMAIL = 'owner@golden.test';
const MEMBER_ID = 'gp-member-2';
const MEMBER_EMAIL = 'member@golden.test';
const TENANT_ID = 'gp-tenant-1';
const INV_ID = 'gp-inv-1';

// ============================================================================
// Mock Factories
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
    plans: {
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
    },
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
      create: vi.fn().mockResolvedValue({ id: 'mb-gp-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    tenants: {
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: TENANT_ID }),
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
      create: vi.fn().mockResolvedValue({ id: INV_ID }),
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
    // Expose mockTx so individual tests can configure tx.query responses
    _mockTx: mockTx,
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

// ============================================================================
// Shared Fixtures
// ============================================================================

const NOW = new Date('2026-02-20T12:00:00.000Z');
const FUTURE_EXPIRY = new Date('2026-02-27T12:00:00.000Z');

/** The tenant row as returned by tx.query() — snake_case */
const TENANT_ROW = {
  id: TENANT_ID,
  name: 'Golden Workspace',
  slug: 'golden-workspace',
  logo_url: null,
  owner_id: OWNER_ID,
  is_active: true,
  metadata: {},
  allowed_email_domains: [],
  created_at: NOW,
  updated_at: NOW,
};

/** The owner membership row as returned by tx.query() — snake_case */
const OWNER_MEMBERSHIP_ROW = {
  id: 'mb-gp-owner',
  tenant_id: TENANT_ID,
  user_id: OWNER_ID,
  role: 'owner',
  created_at: NOW,
  updated_at: NOW,
};

/** The tenant object as returned by repos.tenants.findById() — camelCase */
const TENANT_REPO_OBJECT = {
  id: TENANT_ID,
  name: 'Golden Workspace',
  slug: 'golden-workspace',
  logoUrl: null,
  ownerId: OWNER_ID,
  isActive: true,
  metadata: {},
  allowedEmailDomains: [],
  createdAt: NOW,
  updatedAt: NOW,
};

/** Owner membership as returned by repos.memberships.findByTenantAndUser() */
const OWNER_MEMBERSHIP = {
  id: 'mb-gp-owner',
  tenantId: TENANT_ID,
  userId: OWNER_ID,
  role: 'owner',
  createdAt: NOW,
  updatedAt: NOW,
};

/** Member membership as returned by repos.memberships.findByTenantAndUser() */
const MEMBER_MEMBERSHIP = {
  id: 'mb-gp-member',
  tenantId: TENANT_ID,
  userId: MEMBER_ID,
  role: 'member',
  createdAt: NOW,
  updatedAt: NOW,
};

/** Pending invitation as returned by repos.invitations.findById() */
const PENDING_INVITATION = {
  id: INV_ID,
  tenantId: TENANT_ID,
  email: MEMBER_EMAIL,
  role: 'member',
  status: 'pending',
  invitedById: OWNER_ID,
  expiresAt: FUTURE_EXPIRY,
  acceptedAt: null,
  createdAt: NOW,
};

/** Accepted invitation as returned by repos.invitations.update() */
const ACCEPTED_INVITATION = {
  ...PENDING_INVITATION,
  status: 'accepted',
  acceptedAt: NOW,
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Golden Path: Tenant + RBAC Flow', () => {
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

  // --------------------------------------------------------------------------
  // Step 1: Owner creates workspace
  // --------------------------------------------------------------------------

  it('Step 1: owner creates workspace (POST /api/tenants → 201)', async () => {
    // ensureUniqueSlug checks slug uniqueness before the transaction
    mockRepos.tenants.findBySlug.mockResolvedValue(null);

    // createTenant calls withTransaction → db.transaction(cb) → cb(tx)
    // Inside cb, tx.query() is called twice:
    //   1st call → tenant insert row (snake_case)
    //   2nd call → membership insert row (snake_case)
    mockDb.transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        query: vi
          .fn()
          .mockResolvedValueOnce([TENANT_ROW])
          .mockResolvedValueOnce([OWNER_MEMBERSHIP_ROW]),
        execute: vi.fn().mockResolvedValue(0),
      };
      return cb(txMock);
    });

    // auditEvents and activities fire-and-forget
    mockRepos.auditEvents.create.mockResolvedValue({ id: 'ae-step1' });
    mockRepos.activities.create.mockResolvedValue({ id: 'act-step1' });

    const ownerToken = createTestJwt({ userId: OWNER_ID, email: OWNER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/tenants',
        accessToken: ownerToken,
        payload: { name: 'Golden Workspace', slug: 'golden-workspace' },
      }),
    );

    expect(response.statusCode).toBe(201);

    const body = parseJsonResponse(response) as {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
      role: string;
    };
    expect(body.id).toBe(TENANT_ID);
    expect(body.name).toBe('Golden Workspace');
    expect(body.slug).toBe('golden-workspace');
    expect(body.ownerId).toBe(OWNER_ID);
    expect(body.role).toBe('owner');
  });

  // --------------------------------------------------------------------------
  // Step 2: Owner invites teammate
  // --------------------------------------------------------------------------

  it('Step 2: owner invites teammate (POST /api/tenants/:id/invitations → 201)', async () => {
    // createInvitation checks:
    //   1. repos.tenants.findById        → tenant exists
    //   2. repos.memberships.findByTenantAndUser → actor is a member w/ sufficient role
    //   3. repos.invitations.findPendingByTenantAndEmail → no existing pending invite
    //   4. repos.invitations.countPendingByTenantId → under quota
    //   5. repos.invitations.create      → create the invitation
    mockRepos.tenants.findById.mockResolvedValue(TENANT_REPO_OBJECT);
    mockRepos.memberships.findByTenantAndUser.mockResolvedValue(OWNER_MEMBERSHIP);
    mockRepos.invitations.findPendingByTenantAndEmail.mockResolvedValue(null);
    mockRepos.invitations.countPendingByTenantId.mockResolvedValue(0);
    mockRepos.invitations.create.mockResolvedValue(PENDING_INVITATION);

    // fire-and-forget mocks
    mockRepos.auditEvents.create.mockResolvedValue({ id: 'ae-step2' });
    mockRepos.activities.create.mockResolvedValue({ id: 'act-step2' });
    mockRepos.notifications.create.mockResolvedValue({ id: 'notif-step2' });

    const ownerToken = createTestJwt({ userId: OWNER_ID, email: OWNER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'POST',
        url: `/api/tenants/${TENANT_ID}/invitations`,
        accessToken: ownerToken,
        payload: { email: MEMBER_EMAIL, role: 'member' },
      }),
    );

    expect(response.statusCode).toBe(201);

    const body = parseJsonResponse(response) as {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      status: string;
    };
    expect(body.id).toBe(INV_ID);
    expect(body.tenantId).toBe(TENANT_ID);
    expect(body.email).toBe(MEMBER_EMAIL);
    expect(body.role).toBe('member');
    expect(body.status).toBe('pending');
  });

  // --------------------------------------------------------------------------
  // Step 3: Teammate accepts invitation
  // --------------------------------------------------------------------------

  it('Step 3: teammate accepts invitation (POST /api/invitations/:id/accept → 200)', async () => {
    // acceptInvitation checks:
    //   1. repos.invitations.findById              → invitation exists & is pending
    //   2. repos.memberships.findByTenantAndUser   → null (not yet a member)
    //   3. repos.memberships.create                → create membership
    //   4. repos.invitations.update                → mark as accepted

    mockRepos.invitations.findById.mockResolvedValue(PENDING_INVITATION);

    // findByTenantAndUser: MEMBER_ID is not yet a member at this point
    // After create, they become a member — but findByTenantAndUser is only called
    // once inside acceptInvitation (to check they aren't already a member).
    mockRepos.memberships.findByTenantAndUser.mockImplementation(
      async (tenantId: string, userId: string) => {
        // During acceptInvitation, check is for MEMBER_ID → null (not yet a member)
        if (tenantId === TENANT_ID && userId === MEMBER_ID) {
          return null;
        }
        // Owner's membership is still present
        if (tenantId === TENANT_ID && userId === OWNER_ID) {
          return OWNER_MEMBERSHIP;
        }
        return null;
      },
    );

    mockRepos.memberships.create.mockResolvedValue(MEMBER_MEMBERSHIP);
    mockRepos.invitations.update.mockResolvedValue(ACCEPTED_INVITATION);

    // fire-and-forget mocks
    mockRepos.auditEvents.create.mockResolvedValue({ id: 'ae-step3' });
    mockRepos.activities.create.mockResolvedValue({ id: 'act-step3' });

    const memberToken = createTestJwt({ userId: MEMBER_ID, email: MEMBER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'POST',
        url: `/api/invitations/${INV_ID}/accept`,
        accessToken: memberToken,
        payload: {},
      }),
    );

    expect(response.statusCode).toBe(200);

    const body = parseJsonResponse(response) as {
      id: string;
      tenantId: string;
      email: string;
      status: string;
    };
    expect(body.id).toBe(INV_ID);
    expect(body.tenantId).toBe(TENANT_ID);
    expect(body.email).toBe(MEMBER_EMAIL);
    expect(body.status).toBe('accepted');

    // Confirm the membership was created for the member
    expect(mockRepos.memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: MEMBER_ID,
        role: 'member',
      }),
    );
  });

  // --------------------------------------------------------------------------
  // Step 4: Member can read workspace info
  // --------------------------------------------------------------------------

  it('Step 4: member can read workspace info (GET /api/tenants/:id → 200)', async () => {
    // getTenantById checks:
    //   1. repos.tenants.findById            → tenant exists and is active
    //   2. repos.memberships.findByTenantAndUser → user is a member

    mockRepos.tenants.findById.mockResolvedValue(TENANT_REPO_OBJECT);
    mockRepos.memberships.findByTenantAndUser.mockImplementation(
      async (tenantId: string, userId: string) => {
        if (tenantId === TENANT_ID && userId === MEMBER_ID) {
          return MEMBER_MEMBERSHIP;
        }
        if (tenantId === TENANT_ID && userId === OWNER_ID) {
          return OWNER_MEMBERSHIP;
        }
        return null;
      },
    );

    const memberToken = createTestJwt({ userId: MEMBER_ID, email: MEMBER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'GET',
        url: `/api/tenants/${TENANT_ID}`,
        accessToken: memberToken,
      }),
    );

    expect(response.statusCode).toBe(200);

    const body = parseJsonResponse(response) as {
      id: string;
      name: string;
      slug: string;
      ownerId: string;
      role: string;
    };
    expect(body.id).toBe(TENANT_ID);
    expect(body.name).toBe('Golden Workspace');
    expect(body.slug).toBe('golden-workspace');
    expect(body.ownerId).toBe(OWNER_ID);
    // Member gets back their own role
    expect(body.role).toBe('member');
  });

  // --------------------------------------------------------------------------
  // Step 5: Non-owner (member role) cannot delete workspace — RBAC enforced
  // --------------------------------------------------------------------------

  it('Step 5: non-owner cannot delete workspace (POST /api/tenants/:id/delete → 403)', async () => {
    // deleteTenant checks:
    //   1. repos.tenants.findById                → tenant exists
    //   2. repos.memberships.findByTenantAndUser → membership?.role !== 'owner' → ForbiddenError

    mockRepos.tenants.findById.mockResolvedValue(TENANT_REPO_OBJECT);
    mockRepos.memberships.findByTenantAndUser.mockImplementation(
      async (tenantId: string, userId: string) => {
        if (tenantId === TENANT_ID && userId === MEMBER_ID) {
          // Member role — NOT owner — should trigger 403
          return MEMBER_MEMBERSHIP;
        }
        if (tenantId === TENANT_ID && userId === OWNER_ID) {
          return OWNER_MEMBERSHIP;
        }
        return null;
      },
    );

    const memberToken = createTestJwt({ userId: MEMBER_ID, email: MEMBER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'POST',
        url: `/api/tenants/${TENANT_ID}/delete`,
        accessToken: memberToken,
        payload: {},
      }),
    );

    expect(response.statusCode).toBe(403);

    const body = parseJsonResponse(response) as { message?: string; code?: string };
    // The ForbiddenError message from deleteTenant
    expect(body.message ?? body.code).toBeTruthy();

    // The delete transaction must NOT have been called
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});
