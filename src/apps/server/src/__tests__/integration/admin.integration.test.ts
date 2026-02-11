// src/apps/server/src/__tests__/integration/admin.integration.test.ts
/**
 * Admin API Integration Tests
 *
 * Tests the admin API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards (admin role required).
 */

import { adminRoutes } from '@abe-stack/core/admin';
import { createAuthGuard } from '@abe-stack/core/auth';
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
  };
}

// ============================================================================
// Mock Logger
// ============================================================================

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
// Mock Email Templates
// ============================================================================

function createMockEmailTemplates() {
  const template = {
    subject: 'Test Subject',
    html: '<p>Test</p>',
    text: 'Test',
    to: 'test@example.com',
  };
  return {
    passwordReset: vi.fn().mockReturnValue(template),
    magicLink: vi.fn().mockReturnValue(template),
    emailVerification: vi.fn().mockReturnValue(template),
    existingAccountRegistrationAttempt: vi.fn().mockReturnValue(template),
    tokenReuseAlert: vi.fn().mockReturnValue(template),
    newLoginAlert: vi.fn().mockReturnValue(template),
    passwordChangedAlert: vi.fn().mockReturnValue(template),
    emailChangedAlert: vi.fn().mockReturnValue(template),
  };
}

// ============================================================================
// Mock DB Client
// ============================================================================

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

describe('Admin API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockEmail: ReturnType<typeof createMockEmailTemplates>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockEmail = createMockEmailTemplates();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: mockEmail,
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, adminRoutes, {
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
  // Route Existence Tests
  // ==========================================================================

  describe('route existence', () => {
    // User Management
    it('GET /api/admin/users responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/users/search responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users/search' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/users/:id responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users/user-1' });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/users/:id/update responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/update',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/users/:id/lock responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/lock',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/users/:id/unlock responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/unlock',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/users/:id/hard-ban responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/hard-ban',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Impersonation
    it('POST /api/admin/impersonate/end responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/impersonate/end',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/impersonate/:userId responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/impersonate/user-1',
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Auth Admin
    it('POST /api/admin/auth/unlock responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/auth/unlock',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Security
    it('POST /api/admin/security/events responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/events',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/security/events/:id responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/events/evt-1',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/security/metrics responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/metrics',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/security/export responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/export',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Audit Events
    it('GET /api/admin/audit-events responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/audit-events',
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Jobs
    it('GET /api/admin/jobs responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/jobs/stats responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs/stats' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/jobs/:jobId responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs/job-1' });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/jobs/:jobId/retry responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/job-1/retry',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/jobs/:jobId/cancel responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/job-1/cancel',
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Metrics
    it('GET /api/admin/metrics responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/metrics' });
      expect(response.statusCode).not.toBe(404);
    });

    // Route Manifest
    it('GET /api/admin/routes responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/routes' });
      expect(response.statusCode).not.toBe(404);
    });

    // Tenants
    it('GET /api/admin/tenants responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/tenants' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/tenants/:id responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/tenants/tenant-1',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/tenants/:id/suspend responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/suspend',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/tenants/:id/unsuspend responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/unsuspend',
      });
      expect(response.statusCode).not.toBe(404);
    });

    // Billing
    it('GET /api/admin/billing/plans responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/billing/plans',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/billing/plans/create responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/create',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/billing/plans/:id responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/billing/plans/plan-1',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/billing/plans/:id/update responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/update',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/billing/plans/:id/sync-stripe responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/sync-stripe',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/billing/plans/:id/deactivate responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/deactivate',
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (All Admin Routes Require Admin Auth)
  // ==========================================================================

  describe('auth guards', () => {
    // User Management
    it('GET /api/admin/users returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users' });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/admin/users/search returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users/search' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/users/:id returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/users/user-1' });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/users/:id/update returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/update',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/users/:id/lock returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/lock',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/users/:id/unlock returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/unlock',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/users/:id/hard-ban returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/users/user-1/hard-ban',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    // Impersonation
    it('POST /api/admin/impersonate/end returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/impersonate/end',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/impersonate/:userId returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/impersonate/user-1',
      });
      expect(response.statusCode).toBe(401);
    });

    // Auth Admin
    it('POST /api/admin/auth/unlock returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/auth/unlock',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    // Security
    it('POST /api/admin/security/events returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/events',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/security/events/:id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/events/evt-1',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/security/metrics returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/metrics',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/security/export returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/export',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    // Audit Events
    it('GET /api/admin/audit-events returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/audit-events',
      });
      expect(response.statusCode).toBe(401);
    });

    // Jobs
    it('GET /api/admin/jobs returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/jobs/stats returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs/stats' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/jobs/:jobId returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/jobs/job-1' });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/jobs/:jobId/retry returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/job-1/retry',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/jobs/:jobId/cancel returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/job-1/cancel',
      });
      expect(response.statusCode).toBe(401);
    });

    // Metrics
    it('GET /api/admin/metrics returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/metrics' });
      expect(response.statusCode).toBe(401);
    });

    // Route Manifest
    it('GET /api/admin/routes returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/routes' });
      expect(response.statusCode).toBe(401);
    });

    // Tenants
    it('GET /api/admin/tenants returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/tenants' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/tenants/:id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/tenants/tenant-1',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/tenants/:id/suspend returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/suspend',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/tenants/:id/unsuspend returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/tenants/tenant-1/unsuspend',
      });
      expect(response.statusCode).toBe(401);
    });

    // Billing
    it('GET /api/admin/billing/plans returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/billing/plans',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/billing/plans/create returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/create',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/billing/plans/:id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/billing/plans/plan-1',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/billing/plans/:id/update returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/update',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/billing/plans/:id/sync-stripe returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/sync-stripe',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/billing/plans/:id/deactivate returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/billing/plans/plan-1/deactivate',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
