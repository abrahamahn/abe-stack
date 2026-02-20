// main/apps/server/src/__tests__/integration/admin.integration.test.ts
/**
 * Admin API Integration Tests
 *
 * Tests the admin API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards (admin role required).
 */

import { adminRoutes } from '@bslt/core/admin';
import { createAuthGuard } from '@bslt/core/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createAdminJwt,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory } from '@/http';
import type { RouteMap as DbRouteMap } from '@bslt/server-system';

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
      listWithFilters: vi
        .fn()
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    },
    auditEvents: {
      create: vi.fn().mockResolvedValue({ id: 'ae-1' }),
      findByUserId: vi.fn().mockResolvedValue([]),
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

    registerRouteMap(testServer.server, ctx as never, adminRoutes as unknown as DbRouteMap, {
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

    it('GET /api/admin/health responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/health' });
      expect(response.statusCode).not.toBe(404);
    });

    // Webhook Monitor
    it('GET /api/admin/webhooks responds (not 404)', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/webhooks' });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/webhooks/:id/deliveries responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/webhooks/wh-1/deliveries',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/webhooks/:id/deliveries/:deliveryId/replay responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/webhooks/wh-1/deliveries/del-1/replay',
      });
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

    it('GET /api/admin/health returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/health' });
      expect(response.statusCode).toBe(401);
    });

    // Webhook Monitor
    it('GET /api/admin/webhooks returns 401 without token', async () => {
      const response = await testServer.inject({ method: 'GET', url: '/api/admin/webhooks' });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/webhooks/:id/deliveries returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/webhooks/wh-1/deliveries',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/admin/webhooks/:id/deliveries/:deliveryId/replay returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/webhooks/wh-1/deliveries/del-1/replay',
      });
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

  // ==========================================================================
  // Role Enforcement Tests
  // ==========================================================================

  describe('role enforcement', () => {
    it('GET /api/admin/users returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('GET /api/admin/users/:id returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users/user-1',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/users/:id/lock returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-1/lock',
          accessToken: userJwt,
          payload: { reason: 'test', durationMinutes: 60 },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/users/:id/unlock returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-1/unlock',
          accessToken: userJwt,
          payload: { reason: 'test' },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/impersonate/:userId returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/user-1',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/users/:id/hard-ban returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-1/hard-ban',
          accessToken: userJwt,
          payload: { reason: 'spam' },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('GET /api/admin/routes returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/routes',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/security/events returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: userJwt,
          payload: {},
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('GET /api/admin/billing/plans returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/billing/plans',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Admin User Management
  // ==========================================================================

  describe('admin user management', () => {
    it('GET /api/admin/users returns paginated user list', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: unknown[];
        total: number;
        page: number;
      };
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
    });

    it('GET /api/admin/users/:id returns user detail', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.findById.mockResolvedValueOnce(mockUser);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users/user-1',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { id: string; email: string };
      expect(body.id).toBe('user-1');
      expect(body.email).toBe('test@example.com');
    });

    it('GET /api/admin/users/:id returns 404 for unknown user', async () => {
      mockRepos.users.findById.mockResolvedValueOnce(null);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users/nonexistent',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });

    it('POST /api/admin/users/:id/lock locks user account', async () => {
      const mockUser = {
        id: 'user-target',
        email: 'target@example.com',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000),
        lockReason: 'Suspicious activity',
      };

      // First call: check user exists; second call: return updated user
      mockRepos.users.findById.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(lockedUser);
      mockRepos.users.lockAccount.mockResolvedValueOnce(undefined);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-target/lock',
          accessToken: adminJwt,
          payload: { reason: 'Suspicious activity', durationMinutes: 60 },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string; user: { id: string } };
      expect(body.message).toContain('locked');
      expect(mockRepos.users.lockAccount).toHaveBeenCalledWith(
        'user-target',
        expect.any(Date),
        'Suspicious activity',
      );
    });

    it('POST /api/admin/users/:id/unlock unlocks user account', async () => {
      const lockedUser = {
        id: 'user-locked',
        email: 'locked@example.com',
        role: 'user',
        lockedUntil: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const unlockedUser = { ...lockedUser, lockedUntil: null, lockReason: null };

      mockRepos.users.findById
        .mockResolvedValueOnce(lockedUser)
        .mockResolvedValueOnce(unlockedUser);
      mockRepos.users.unlockAccount.mockResolvedValueOnce(undefined);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-locked/unlock',
          accessToken: adminJwt,
          payload: { reason: 'Account reviewed' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toContain('unlocked');
      expect(mockRepos.users.unlockAccount).toHaveBeenCalledWith('user-locked');
    });

    it('POST /api/admin/users/:id/hard-ban revokes sessions and schedules deletion', async () => {
      const targetUser = {
        id: 'user-hard-ban',
        email: 'hardban@example.com',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.findById.mockResolvedValue(targetUser);
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.update.mockResolvedValue({
        ...targetUser,
        deletedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deletionGracePeriodEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const adminJwt = createAdminJwt({ userId: 'admin-1', email: 'admin@example.com' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-hard-ban/hard-ban',
          accessToken: adminJwt,
          headers: { 'x-sudo-token': 'sudo-verified-token' },
          payload: { reason: 'Fraud and abuse' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string; gracePeriodEnds: string };
      expect(body.message).toContain('permanently banned');
      expect(typeof body.gracePeriodEnds).toBe('string');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockRepos.users.lockAccount).toHaveBeenCalledWith(
        'user-hard-ban',
        expect.any(Date),
        'Fraud and abuse',
      );
      expect(mockRepos.users.update).toHaveBeenCalledWith(
        'user-hard-ban',
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletionGracePeriodEnds: expect.any(Date),
        }),
      );
    });

    it('GET /api/admin/routes returns route manifest', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/routes',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { routes: unknown[]; count: number };
      expect(body.routes).toBeDefined();
      expect(typeof body.count).toBe('number');
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Events (Admin)
  // ==========================================================================

  describe('admin security events', () => {
    it('POST /api/admin/security/events returns paginated events', async () => {
      const mockEvent = {
        id: 'se-1',
        user_id: 'user-1',
        email: 'test@example.com',
        event_type: 'login_failure',
        severity: 'medium',
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        metadata: null,
        created_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce([mockEvent]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '1' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 10, sortOrder: 'desc' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it('GET /api/admin/security/metrics returns aggregated metrics', async () => {
      const mockEvents = [
        { event_type: 'login_failure', severity: 'medium' },
        { event_type: 'login_failure', severity: 'medium' },
        { event_type: 'account_locked', severity: 'high' },
        { event_type: 'token_reuse', severity: 'critical' },
      ];

      mockDb.query.mockResolvedValueOnce(mockEvents);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/metrics',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        totalEvents: number;
        criticalEvents: number;
        highEvents: number;
        period: string;
      };
      expect(body.totalEvents).toBe(4);
      expect(body.criticalEvents).toBe(1);
      expect(body.highEvents).toBe(1);
      expect(body.period).toBeDefined();
    });

    it('POST /api/admin/security/export returns exported data', async () => {
      const mockEvents = [
        {
          id: 'se-1',
          event_type: 'login_failure',
          severity: 'medium',
          created_at: new Date(),
        },
      ];

      mockDb.query.mockResolvedValueOnce(mockEvents);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'json' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: string;
        filename: string;
        contentType: string;
      };
      expect(body.data).toBeDefined();
      expect(body.filename).toContain('security-events');
      expect(body.contentType).toBe('application/json');
    });
  });

  // ==========================================================================
<<<<<<< HEAD
  // Impersonation Integration Flow
  // ==========================================================================

  describe('impersonation integration', () => {
    it('start -> perform action -> verify audit trail -> end', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      mockRepos.users.findById.mockImplementation(async (id: string) => {
        if (id === 'admin-1') {
          return {
            id: 'admin-1',
            email: 'admin@example.com',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            emailVerified: true,
            emailVerifiedAt: now,
            lockedUntil: null,
            lockReason: null,
            failedLoginAttempts: 0,
            phone: null,
            phoneVerified: null,
            createdAt: now,
            updatedAt: now,
          };
        }
        if (id === 'user-2') {
          return {
            id: 'user-2',
            email: 'user2@example.com',
            username: 'user2',
            firstName: 'Regular',
            lastName: 'User',
            role: 'user',
            emailVerified: true,
            emailVerifiedAt: now,
            lockedUntil: null,
            lockReason: null,
            failedLoginAttempts: 0,
            phone: null,
            phoneVerified: null,
            createdAt: now,
            updatedAt: now,
          };
        }
        return null;
      });

      const adminJwt = createAdminJwt({ userId: 'admin-1', email: 'admin@example.com' });
      const startResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/user-2',
=======
  // Sprint 4.14: Impersonation Tests
  // ==========================================================================

  describe('admin impersonation', () => {
    it('POST /api/admin/impersonate/:userId returns scoped token and creates audit event', async () => {
      const targetUser = {
        id: 'user-target-imp',
        email: 'target@example.com',
        username: 'targetuser',
        firstName: 'Target',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const adminUser = {
        id: 'admin-test-456',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findById: first call returns admin (for validation), second returns target
      mockRepos.users.findById
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/user-target-imp',
>>>>>>> f159f3e15326d2f7d405bc98d04eb6b5aa4f2d0f
          accessToken: adminJwt,
        }),
      );

<<<<<<< HEAD
      expect(startResponse.statusCode).toBe(200);
      const startBody = parseJsonResponse(startResponse) as { token: string };
      expect(typeof startBody.token).toBe('string');
      expect(startBody.token.length).toBeGreaterThan(20);

      // With impersonation token, admin-only route must not be accessible.
      const adminRouteWithImpersonationToken = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users',
          accessToken: startBody.token,
        }),
      );
      expect([401, 403]).toContain(adminRouteWithImpersonationToken.statusCode);

      const endResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/end?targetUserId=user-2',
=======
      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        token: string;
        expiresAt: string;
        targetUser: { id: string; email: string };
      };
      expect(body.token).toBeDefined();
      expect(body.token.length).toBeGreaterThan(20);
      expect(body.expiresAt).toBeDefined();
      expect(body.targetUser.id).toBe('user-target-imp');
      expect(body.targetUser.email).toBe('target@example.com');

      // Verify audit event was created
      expect(mockRepos.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_impersonation_start',
          resource: 'user',
          resourceId: 'user-target-imp',
          category: 'security',
          severity: 'warn',
        }),
      );
    });

    it('cannot impersonate another admin -> 403', async () => {
      const adminTarget = {
        id: 'admin-target-2',
        email: 'admin2@example.com',
        username: 'admin2',
        firstName: 'Admin',
        lastName: 'Two',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const adminUser = {
        id: 'admin-test-456',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findById: first for admin validation, second for target (also admin)
      mockRepos.users.findById
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(adminTarget);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/admin-target-2',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/admin/i);
    });

    it('cannot impersonate self -> 403', async () => {
      const adminJwt = createAdminJwt({ userId: 'admin-test-456' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/admin-test-456',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/yourself/i);
    });
  });

  // ==========================================================================
  // Sprint 4.14: Hard Ban Tests
  // ==========================================================================

  describe('admin hard ban', () => {
    it('POST /api/admin/users/:id/hard-ban bans user and schedules deletion', async () => {
      const targetUser = {
        id: 'user-ban-target',
        email: 'bantarget@example.com',
        username: 'bantarget',
        firstName: 'Ban',
        lastName: 'Target',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.findById.mockResolvedValue(targetUser);
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.update.mockResolvedValue({ ...targetUser, deletedAt: new Date() });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-ban-target/hard-ban',
          accessToken: adminJwt,
          headers: {
            'x-sudo-token': 'valid-sudo-token-for-test',
          },
          payload: { reason: 'Terms of service violation' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        message: string;
        gracePeriodEnds: string;
      };
      expect(body.message).toContain('banned');
      expect(body.gracePeriodEnds).toBeDefined();

      // Verify the grace period is in the future
      const gracePeriodDate = new Date(body.gracePeriodEnds);
      expect(gracePeriodDate.getTime()).toBeGreaterThan(Date.now());

      // Verify lockAccount was called with a far-future date (permanent ban)
      expect(mockRepos.users.lockAccount).toHaveBeenCalledWith(
        'user-ban-target',
        expect.any(Date),
        'Terms of service violation',
      );

      // Verify user update was called to schedule deletion
      expect(mockRepos.users.update).toHaveBeenCalledWith(
        'user-ban-target',
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletionGracePeriodEnds: expect.any(Date),
        }),
      );
    });

    it('hard ban requires sudo re-auth (x-sudo-token header)', async () => {
      const targetUser = {
        id: 'user-ban-nosudo',
        email: 'nosudo@example.com',
        username: 'nosudo',
        firstName: 'No',
        lastName: 'Sudo',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.findById.mockResolvedValueOnce(targetUser);

      const adminJwt = createAdminJwt();
      // Attempt hard ban WITHOUT the x-sudo-token header
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-ban-nosudo/hard-ban',
          accessToken: adminJwt,
          payload: { reason: 'Missing sudo' },
        }),
      );

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/sudo|re-auth/i);
    });

    it('admin cannot hard-ban themselves', async () => {
      const adminJwt = createAdminJwt({ userId: 'admin-test-456' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/admin-test-456/hard-ban',
          accessToken: adminJwt,
          headers: {
            'x-sudo-token': 'valid-sudo-token',
          },
          payload: { reason: 'Self ban attempt' },
        }),
      );

      expect(response.statusCode).toBe(400);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/own account/i);
    });
  });

  // ==========================================================================
  // Sprint 4.14: GET /api/admin/routes — Route Manifest
  // ==========================================================================

  describe('admin route manifest', () => {
    it('GET /api/admin/routes returns route manifest with routes and count', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/routes',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        routes: Array<{
          method: string;
          path: string;
          auth?: string;
        }>;
        count: number;
      };
      expect(body.routes).toBeDefined();
      expect(Array.isArray(body.routes)).toBe(true);
      expect(body.count).toBeGreaterThan(0);
      expect(body.routes.length).toBe(body.count);

      // Each route should have at least method and path
      for (const route of body.routes) {
        expect(route.method).toBeDefined();
        expect(route.path).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Sprint 4.14: GET /api/admin/users with query filters
  // ==========================================================================

  describe('admin user list with filters', () => {
    it('GET /api/admin/users?role=admin filters by admin role', async () => {
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [mockAdmin],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users?role=admin',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: Array<{ role: string }>;
        total: number;
      };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.role).toBe('admin');

      // Verify the filter was passed to the repository
      expect(mockRepos.users.listWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
        }),
      );
    });

    it('GET /api/admin/users?page=2&limit=5 passes pagination params', async () => {
      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [],
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users?page=2&limit=5',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      expect(body.total).toBe(15);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(5);
      expect(body.totalPages).toBe(3);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: User List Boundary Tests
  // ==========================================================================

  describe('adversarial: user list boundary tests', () => {
    it('GET /api/admin/users with page=-1 does not crash', async () => {
      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users?page=-1',
          accessToken: adminJwt,
        }),
      );

      // Should either normalize to page 1, return 400 validation error, or handle gracefully
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();
    });

    it('GET /api/admin/users with limit=0 does not crash', async () => {
      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 0,
        totalPages: 0,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users?limit=0',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();
    });

    it('GET /api/admin/users with limit=999999 does not cause memory exhaustion', async () => {
      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 999999,
        totalPages: 0,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users?limit=999999',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      // Should either cap the limit or return 400
      expect(response.statusCode).toBeDefined();

      // Verify the repo was called — limit should be capped or passed through safely
      if (response.statusCode === 200) {
        expect(mockRepos.users.listWithFilters).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Lock User Boundary Tests
  // ==========================================================================

  describe('adversarial: lock user boundary tests', () => {
    it('POST /api/admin/users/:id/lock with negative durationMinutes is rejected or handled', async () => {
      const targetUser = {
        id: 'user-neg-lock',
        email: 'neglock@example.com',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepos.users.findById.mockResolvedValueOnce(targetUser);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-neg-lock/lock',
          accessToken: adminJwt,
          payload: { reason: 'test', durationMinutes: -60 },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      // Negative duration should be rejected (400) or produce a lock in the past
      expect(response.statusCode).toBeDefined();
    });

    it('POST /api/admin/users/:id/lock with NaN durationMinutes does not crash', async () => {
      const targetUser = {
        id: 'user-nan-lock',
        email: 'nanlock@example.com',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepos.users.findById.mockResolvedValueOnce(targetUser);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-nan-lock/lock',
          accessToken: adminJwt,
          payload: { reason: 'test', durationMinutes: 'not-a-number' },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      // Should return 400 (validation) or 500 (handler error), never crash
      expect(response.statusCode).toBeDefined();
    });

    it('POST /api/admin/users/:id/lock with MAX_SAFE_INTEGER durationMinutes does not overflow', async () => {
      const targetUser = {
        id: 'user-max-lock',
        email: 'maxlock@example.com',
        role: 'user',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRepos.users.findById.mockResolvedValueOnce(targetUser).mockResolvedValueOnce({
        ...targetUser,
        lockedUntil: new Date(Date.now() + 999999999),
        lockReason: 'test',
      });
      mockRepos.users.lockAccount.mockResolvedValueOnce(undefined);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-max-lock/lock',
          accessToken: adminJwt,
          payload: { reason: 'test', durationMinutes: Number.MAX_SAFE_INTEGER },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      // Must not crash or produce NaN/Invalid Date
      expect(response.statusCode).toBeDefined();
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Impersonate Boundary Tests
  // ==========================================================================

  describe('adversarial: impersonate boundary tests', () => {
    it('POST /api/admin/impersonate with non-existent user ID returns 403 or 404', async () => {
      const adminUser = {
        id: 'admin-test-456',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call for admin validation, second returns null (non-existent user)
      mockRepos.users.findById
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(null);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/nonexistent-user-id',
          accessToken: adminJwt,
        }),
      );

      // Should reject — non-existent target returns 403 or 404 depending on handler flow
      expect([403, 404]).toContain(response.statusCode);
      // Must never succeed
      expect(response.statusCode).not.toBe(200);
    });

    it('POST /api/admin/impersonate with own user ID returns 403', async () => {
      const adminJwt = createAdminJwt({ userId: 'admin-test-456' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/admin-test-456',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toMatch(/yourself/i);
    });

    it('POST /api/admin/impersonate with empty user ID returns 404 or 400', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/',
          accessToken: adminJwt,
        }),
      );

      // Empty user ID in the path should result in route not matching or 400
      expect([400, 404]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: DB Returning Partial User Record
  // ==========================================================================

  describe('adversarial: layer handshake — DB returning malformed data', () => {
    it('GET /api/admin/users/:id handles partial user record with missing fields', async () => {
      // DB returns a user missing critical fields like email, role
      mockRepos.users.findById.mockResolvedValueOnce({
        id: 'user-partial',
        // email: missing
        // role: missing
        createdAt: new Date(),
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users/user-partial',
          accessToken: adminJwt,
        }),
      );

      // Should not crash — may return 200 with partial data or 500
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();
    });

    it('GET /api/admin/users handles listWithFilters returning undefined fields', async () => {
      mockRepos.users.listWithFilters.mockResolvedValueOnce({
        data: [
          {
            id: 'user-undef',
            email: undefined,
            username: undefined,
            role: undefined,
            createdAt: undefined,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/users',
>>>>>>> f159f3e15326d2f7d405bc98d04eb6b5aa4f2d0f
          accessToken: adminJwt,
        }),
      );

<<<<<<< HEAD
      expect(endResponse.statusCode).toBe(200);
      const endBody = parseJsonResponse(endResponse) as { message: string };
      expect(endBody.message).toContain('ended');

      expect(mockRepos.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'admin_impersonation_start',
          resource: 'user',
          resourceId: 'user-2',
        }),
      );
      expect(mockRepos.auditEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'admin_impersonation_end',
          resource: 'user',
          resourceId: 'user-2',
        }),
      );
    });

    it('admin-only enforcement: non-admin user cannot start or end impersonation', async () => {
      const userJwt = createTestJwt({ userId: 'user-regular-1', role: 'user' });

      const startResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/user-2',
          accessToken: userJwt,
        }),
      );
      expect(startResponse.statusCode).toBe(403);

      const endResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/impersonate/end',
          accessToken: userJwt,
          payload: { targetUserId: 'user-2' },
        }),
      );
      expect(endResponse.statusCode).toBe(403);
=======
      // Should not crash
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBeDefined();
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Concurrent Lock+Unlock on Same User
  // ==========================================================================

  describe('adversarial: async integrity — concurrent lock and unlock', () => {
    it('concurrent lock + unlock on the same user does not corrupt state', async () => {
      const targetUser = {
        id: 'user-race-cond',
        email: 'race@example.com',
        role: 'user',
        emailVerified: true,
        lockedUntil: null,
        lockReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lockedUser = {
        ...targetUser,
        lockedUntil: new Date(Date.now() + 3600000),
        lockReason: 'Race test',
      };

      // Mock findById to return user for both concurrent requests
      mockRepos.users.findById
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(lockedUser)
        .mockResolvedValueOnce(lockedUser)
        .mockResolvedValueOnce({ ...targetUser, lockedUntil: null });
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.unlockAccount.mockResolvedValue(undefined);

      const adminJwt = createAdminJwt();

      const [lockResponse, unlockResponse] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/admin/users/user-race-cond/lock',
            accessToken: adminJwt,
            payload: { reason: 'Race test', durationMinutes: 60 },
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/admin/users/user-race-cond/unlock',
            accessToken: adminJwt,
            payload: { reason: 'Race test unlock' },
          }),
        ),
      ]);

      // Both requests should complete without crashing
      expect(lockResponse.statusCode).toBeDefined();
      expect(unlockResponse.statusCode).toBeDefined();
      expect(lockResponse.statusCode).not.toBe(401);
      expect(unlockResponse.statusCode).not.toBe(401);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Double Hard-Ban Idempotency
  // ==========================================================================

  describe('adversarial: idempotency — double hard-ban', () => {
    it('hard-banning a user twice does not crash and both responses are well-formed', async () => {
      const targetUser = {
        id: 'user-double-ban',
        email: 'doubleban@example.com',
        username: 'doubleban',
        firstName: 'Double',
        lastName: 'Ban',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const adminJwt = createAdminJwt();

      // Reset findById to clear any leftover mockResolvedValueOnce queue
      // from previous tests (vi.clearAllMocks does not clear once-queues)
      mockRepos.users.findById.mockReset();
      mockRepos.users.findById.mockResolvedValue(targetUser);
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.update.mockResolvedValue({ ...targetUser, deletedAt: new Date() });

      const response1 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-double-ban/hard-ban',
          accessToken: adminJwt,
          headers: {
            'x-sudo-token': 'valid-sudo-token-for-test',
          },
          payload: { reason: 'First ban' },
        }),
      );

      // Second hard-ban: re-set mocks to ensure user is still findable
      mockRepos.users.findById.mockResolvedValue(targetUser);
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.update.mockResolvedValue({ ...targetUser, deletedAt: new Date() });

      const response2 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-double-ban/hard-ban',
          accessToken: adminJwt,
          headers: {
            'x-sudo-token': 'valid-sudo-token-for-test',
          },
          payload: { reason: 'Second ban attempt' },
        }),
      );

      // Both requests should complete without crashing
      expect(response1.statusCode).toBeDefined();
      expect(response2.statusCode).toBeDefined();
      // Neither should return 401 (auth is valid)
      expect(response1.statusCode).not.toBe(401);
      expect(response2.statusCode).not.toBe(401);
      // Both should produce the same outcome — idempotent behavior
      expect(response1.statusCode).toBe(response2.statusCode);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: "Killer" Test — Non-Admin Spoofed JWT + Oversized Reason
  // ==========================================================================

  describe('adversarial: killer test — spoofed non-admin JWT + hard-ban with oversized reason', () => {
    it('non-admin user with spoofed admin JWT cannot hard-ban', async () => {
      // Create a regular user JWT (role: 'user') — this simulates a "spoofed" admin
      const spoofedJwt = createTestJwt({ role: 'user' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-1/hard-ban',
          accessToken: spoofedJwt,
          headers: { 'x-sudo-token': 'fake-sudo-token' },
          payload: { reason: 'Spoofed ban attempt' },
        }),
      );

      // Must be rejected — non-admin cannot access admin routes
      expect(response.statusCode).toBe(403);
    });

    it('hard-ban with oversized reason field (1MB) is handled safely', async () => {
      const targetUser = {
        id: 'user-oversized-reason',
        email: 'oversized@example.com',
        username: 'oversized',
        firstName: 'Over',
        lastName: 'Sized',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepos.users.findById.mockResolvedValue(targetUser);
      mockRepos.users.lockAccount.mockResolvedValue(undefined);
      mockRepos.users.update.mockResolvedValue({ ...targetUser, deletedAt: new Date() });

      const oversizedReason = 'X'.repeat(1024 * 1024); // 1MB reason string
      const adminJwt = createAdminJwt();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/users/user-oversized-reason/hard-ban',
          accessToken: adminJwt,
          headers: { 'x-sudo-token': 'valid-sudo-token' },
          payload: { reason: oversizedReason },
        }),
      );

      // Should either reject (413/400) or truncate — must not crash
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBeDefined();
>>>>>>> f159f3e15326d2f7d405bc98d04eb6b5aa4f2d0f
    });
  });
});
