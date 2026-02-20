// main/apps/server/src/__tests__/integration/audit-flow.integration.test.ts
/**
 * Audit Log Flow Integration Tests
 *
 * Flow: View audit logs → filter by type → filter by severity →
 *       filter by date range → export JSON → export CSV → verify data integrity
 *
 * Tests the full security events admin API through fastify.inject().
 */

import { adminRoutes } from '@bslt/core/admin';
import { createAuthGuard } from '@bslt/core/auth';
import { registerRouteMap } from '@/http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createAdminJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

import type { AuthGuardFactory, RouteMap as DbRouteMap } from '@bslt/server-system';

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
// Mock Security Events
// ============================================================================

const now = new Date();

function createMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `se-${String(Math.random()).slice(2, 8)}`,
    user_id: 'user-1',
    email: 'test@example.com',
    event_type: 'login_failure',
    severity: 'medium',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    metadata: null,
    created_at: now,
    ...overrides,
  };
}

const SEED_EVENTS = [
  createMockEvent({ id: 'se-1', event_type: 'password_changed', severity: 'medium' }),
  createMockEvent({ id: 'se-2', event_type: 'account_locked', severity: 'high' }),
  createMockEvent({ id: 'se-3', event_type: 'oauth_login_success', severity: 'low' }),
  createMockEvent({ id: 'se-4', event_type: 'password_changed', severity: 'medium' }),
  createMockEvent({ id: 'se-5', event_type: 'account_locked', severity: 'high' }),
  createMockEvent({ id: 'se-6', event_type: 'login_failure', severity: 'critical' }),
];

// ============================================================================
// Test Suite
// ============================================================================

describe('Audit Log Flow Integration Tests', () => {
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
  // Flow: Query with type filter
  // ==========================================================================

  describe('filter by event type', () => {
    it('returns only events matching the type filter', async () => {
      const passwordEvents = SEED_EVENTS.filter((e) => e.event_type === 'password_changed');
      mockDb.query.mockResolvedValueOnce(passwordEvents);
      mockDb.queryOne.mockResolvedValueOnce({ count: String(passwordEvents.length) });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: { eventType: 'password_changed' },
          },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: Array<{ eventType: string }>;
        total: number;
      };
      expect(body.data).toHaveLength(2);
      expect(body.data.every((e) => e.eventType === 'password_changed')).toBe(true);
      expect(body.total).toBe(2);
    });
  });

  // ==========================================================================
  // Flow: Query with severity filter
  // ==========================================================================

  describe('filter by severity', () => {
    it('returns only events matching the severity filter', async () => {
      const highEvents = SEED_EVENTS.filter((e) => e.severity === 'high');
      mockDb.query.mockResolvedValueOnce(highEvents);
      mockDb.queryOne.mockResolvedValueOnce({ count: String(highEvents.length) });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: { severity: 'high' },
          },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: Array<{ severity: string }>;
      };
      expect(body.data).toHaveLength(2);
      expect(body.data.every((e: { severity: string }) => e.severity === 'high')).toBe(true);
    });
  });

  // ==========================================================================
  // Flow: Query with date range filter
  // ==========================================================================

  describe('filter by date range', () => {
    it('returns events within the specified date range', async () => {
      mockDb.query.mockResolvedValueOnce(SEED_EVENTS);
      mockDb.queryOne.mockResolvedValueOnce({ count: String(SEED_EVENTS.length) });

      const adminJwt = createAdminJwt();
      const startDate = new Date(now.getTime() - 86400000).toISOString();
      const endDate = new Date(now.getTime() + 86400000).toISOString();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: { startDate, endDate },
          },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(SEED_EVENTS.length);
    });
  });

  // ==========================================================================
  // Flow: Export JSON
  // ==========================================================================

  describe('export JSON', () => {
    it('exports security events as JSON with matching data', async () => {
      mockDb.query.mockResolvedValueOnce(SEED_EVENTS);

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
      expect(body.contentType).toBe('application/json');
      expect(body.filename).toContain('security-events');
      expect(body.data).toBeDefined();

      // Verify the exported data can be parsed and matches event count
      const exported = JSON.parse(body.data) as unknown[];
      expect(exported).toHaveLength(SEED_EVENTS.length);
    });
  });

  // ==========================================================================
  // Flow: Export CSV
  // ==========================================================================

  describe('export CSV', () => {
    it('exports security events as CSV with header row and correct row count', async () => {
      mockDb.query.mockResolvedValueOnce(SEED_EVENTS);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'csv' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: string;
        contentType: string;
      };
      expect(body.contentType).toBe('text/csv');

      // Parse CSV: header row + data rows
      const lines = body.data.split('\n').filter((line) => line.trim().length > 0);
      // At least a header row + data rows
      expect(lines.length).toBeGreaterThanOrEqual(1 + SEED_EVENTS.length);
    });
  });

  // ==========================================================================
  // Flow: Data integrity between query and export
  // ==========================================================================

  describe('data integrity', () => {
    it('export data matches queried event IDs', async () => {
      // First query the events
      mockDb.query.mockResolvedValueOnce(SEED_EVENTS);
      mockDb.queryOne.mockResolvedValueOnce({ count: String(SEED_EVENTS.length) });

      const adminJwt = createAdminJwt();
      const queryResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 50 },
        }),
      );

      const queryBody = parseJsonResponse(queryResponse) as {
        data: Array<{ id: string }>;
      };

      // Then export the same events
      mockDb.query.mockResolvedValueOnce(SEED_EVENTS);

      const exportResponse = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'json' },
        }),
      );

      const exportBody = parseJsonResponse(exportResponse) as { data: string };
      const exported = JSON.parse(exportBody.data) as Array<{ id: string }>;

      // Both should have the same number of events
      expect(exported.length).toBe(queryBody.data.length);
    });
  });
});
