// src/apps/server/src/__tests__/integration/jobs-flow.integration.test.ts
/**
 * Job Operations Flow Integration Tests
 *
 * Flow: Operate jobs → list with status filter → get details →
 *       retry failed → cancel pending → verify queue stats
 *
 * Tests the admin job monitoring API through fastify.inject().
 * Uses mock DB to simulate PostgresQueueStore behavior.
 */

import { adminRoutes } from '@abe-stack/core/admin';
import { createAuthGuard } from '@abe-stack/core/auth';
import { registerRouteMap } from '@abe-stack/server-engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createAdminJwt,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory, RouteMap as DbRouteMap } from '@abe-stack/server-engine';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockRepos() {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user-1' }),
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

function createMockEmailTemplates() {
  const template = {
    subject: 'Test',
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
// Test Suite
// ============================================================================

describe('Job Operations Flow Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    const mockRepos = createMockRepos();
    const mockLogger = createMockLogger();
    const mockEmail = createMockEmailTemplates();

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
  // Auth Guards
  // ==========================================================================

  describe('auth guards for job routes', () => {
    it('GET /api/admin/jobs returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/jobs',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/admin/jobs returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/jobs',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
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
  });

  // ==========================================================================
  // Route Existence
  // ==========================================================================

  describe('route existence', () => {
    it('GET /api/admin/jobs responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/jobs',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/jobs/stats responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/jobs/stats',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/jobs/:jobId responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/jobs/test-job-id',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/jobs/:jobId/retry responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/test-job-id/retry',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/admin/jobs/:jobId/cancel responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/jobs/test-job-id/cancel',
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Flow: List jobs with status filter
  // ==========================================================================

  describe('list jobs', () => {
    it('lists jobs with default pagination', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          name: 'email.send',
          args: JSON.stringify({ to: 'user@test.com' }),
          status: 'pending',
          attempts: 0,
          max_attempts: 3,
          scheduled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          completed_at: null,
          duration_ms: null,
          error: null,
          dead_letter_reason: null,
        },
      ];

      // PostgresQueueStore.listJobs calls db.raw twice: count + data
      mockDb.raw.mockResolvedValueOnce([{ count: '1' }]);
      mockDb.raw.mockResolvedValueOnce(mockJobs);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/jobs',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: unknown[];
        total: number;
        page: number;
      };
      expect(body.data).toBeDefined();
      expect(body.total).toBeDefined();
    });
  });

  // ==========================================================================
  // Flow: Get queue stats
  // ==========================================================================

  describe('queue stats', () => {
    it('returns queue statistics with all status counts', async () => {
      // PostgresQueueStore.getQueueStats calls db.raw twice: status counts + recent stats
      mockDb.raw.mockResolvedValueOnce([
        { status: 'pending', count: '5' },
        { status: 'processing', count: '2' },
        { status: 'completed', count: '100' },
        { status: 'failed', count: '3' },
        { status: 'dead_letter', count: '1' },
      ]);
      mockDb.raw.mockResolvedValueOnce([{ completed: '10', failed: '1' }]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/jobs/stats',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        deadLetter: number;
        total: number;
      };
      expect(body.pending).toBeDefined();
      expect(body.total).toBeDefined();
    });
  });

  // ==========================================================================
  // Flow: Get job details
  // ==========================================================================

  describe('job details', () => {
    it('returns 200 with job details for existing job', async () => {
      const mockJob = {
        id: 'job-detail-1',
        name: 'email.send',
        args: JSON.stringify({ to: 'user@test.com' }),
        status: 'completed',
        attempts: 1,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 150,
        error: null,
        dead_letter_reason: null,
      };

      // PostgresQueueStore.getJobDetails calls db.raw → returns [row] or []
      mockDb.raw.mockResolvedValueOnce([mockJob]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/jobs/job-detail-1',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { id: string; name: string };
      expect(body.id).toBe('job-detail-1');
      expect(body.name).toBe('email.send');
    });

    it('returns 404 for non-existent job', async () => {
      // PostgresQueueStore.getJobDetails calls db.raw → empty array means not found
      mockDb.raw.mockResolvedValueOnce([]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/jobs/nonexistent',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Flow: Retry a failed job
  // ==========================================================================

  describe('retry job', () => {
    it('retries a failed job successfully', async () => {
      // PostgresQueueStore.retryJob calls db.execute (UPDATE) → 1 means success
      mockDb.execute.mockResolvedValueOnce(1);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/jobs/job-retry-1/retry',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { success: boolean; message: string };
      expect(body.success).toBeDefined();
      expect(body.message).toBeDefined();
    });

    it('returns 404 when retrying non-existent job', async () => {
      // retryJob: db.execute returns 0 (no rows updated) → store.getJobDetails → db.raw returns []
      mockDb.execute.mockResolvedValueOnce(0);
      mockDb.raw.mockResolvedValueOnce([]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/jobs/nonexistent/retry',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Flow: Cancel a pending job
  // ==========================================================================

  describe('cancel job', () => {
    it('cancels a pending job successfully', async () => {
      // PostgresQueueStore.cancelJob calls db.execute (UPDATE) → 1 means success
      mockDb.execute.mockResolvedValueOnce(1);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/jobs/job-cancel-1/cancel',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { success: boolean; message: string };
      expect(body.success).toBeDefined();
      expect(body.message).toBeDefined();
    });

    it('returns 404 when cancelling non-existent job', async () => {
      // cancelJob: db.execute returns 0 (no rows) → store.getJobDetails → db.raw returns []
      mockDb.execute.mockResolvedValueOnce(0);
      mockDb.raw.mockResolvedValueOnce([]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/jobs/nonexistent/cancel',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });
});
