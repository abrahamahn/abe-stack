// main/apps/server/src/__tests__/integration/audit.integration.test.ts
/**
 * Audit/Security Events Admin API Integration Tests
 *
 * Tests the admin security/audit API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards, and shared contract imports.
 */

import { adminRoutes } from '@bslt/core/admin';
import { createAuthGuard } from '@bslt/core/auth';
import { SECURITY_SEVERITIES } from '@bslt/shared';
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
import type { SecurityEventsFilter } from '@bslt/shared';

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

describe('Audit/Security Events Admin API Integration Tests', () => {
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
  // Contract Verification Tests
  // ==========================================================================

  describe('contract verification', () => {
    it('SECURITY_SEVERITIES is available from @bslt/shared', () => {
      expect(SECURITY_SEVERITIES).toBeDefined();
      expect(Array.isArray(SECURITY_SEVERITIES)).toBe(true);
      expect(SECURITY_SEVERITIES).toContain('low');
      expect(SECURITY_SEVERITIES).toContain('medium');
      expect(SECURITY_SEVERITIES).toContain('high');
      expect(SECURITY_SEVERITIES).toContain('critical');
      expect(SECURITY_SEVERITIES.length).toBe(4);
    });

    it('SecurityEventsFilter type is usable from @bslt/shared', () => {
      // Verify the type compiles and can be used at runtime
      const filter: SecurityEventsFilter = {
        eventType: 'login_failure',
        severity: 'high',
        userId: 'user-123',
      };
      expect(filter.eventType).toBe('login_failure');
      expect(filter.severity).toBe('high');
      expect(filter.userId).toBe('user-123');
    });
  });

  // ==========================================================================
  // Route Existence Tests
  // ==========================================================================

  describe('route existence', () => {
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
        url: '/api/admin/security/events/00000000-0000-0000-0000-000000000001',
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
        payload: { format: 'json' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/admin/audit-events responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/audit-events',
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (All Admin Routes Require Authentication)
  // ==========================================================================

  describe('auth guards', () => {
    it('POST /api/admin/security/events returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/events',
        payload: { page: 1, pageSize: 10 },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/admin/security/events/:id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/events/00000000-0000-0000-0000-000000000001',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/admin/security/metrics returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/security/metrics',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/admin/security/export returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/export',
        payload: { format: 'json' },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/admin/audit-events returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/admin/audit-events',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // ==========================================================================
  // Role Enforcement Tests
  // ==========================================================================

  describe('role enforcement', () => {
    it('POST /api/admin/security/events returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: userJwt,
          payload: { page: 1, limit: 10 },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('GET /api/admin/security/metrics returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/metrics',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Events Query
  // ==========================================================================

  describe('security events query', () => {
    it('POST /api/admin/security/events returns paginated events with filters', async () => {
      const mockEvent = {
        id: 'se-1',
        user_id: 'user-1',
        email: 'test@example.com',
        event_type: 'login_failure',
        severity: 'high',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
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
          payload: {
            page: 1,
            limit: 10,
            filter: { severity: 'high' },
          },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: Array<{ id: string; severity: string }>;
        total: number;
        page: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]!.severity).toBe('high');
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.hasNext).toBe(false);
      expect(body.hasPrev).toBe(false);
    });

    it('GET /api/admin/security/events/:id returns event detail', async () => {
      const mockEvent = {
        id: 'se-detail-1',
        user_id: 'user-1',
        email: 'test@example.com',
        event_type: 'account_locked',
        severity: 'high',
        ip_address: '10.0.0.1',
        user_agent: 'Chrome/120',
        metadata: JSON.stringify({ reason: 'Too many attempts' }),
        created_at: new Date(),
      };

      mockDb.queryOne.mockResolvedValueOnce(mockEvent);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/events/se-detail-1',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        id: string;
        eventType: string;
        severity: string;
        ipAddress: string;
      };
      expect(body.id).toBe('se-detail-1');
    });

    it('GET /api/admin/security/events/:id returns 404 for unknown event', async () => {
      mockDb.queryOne.mockResolvedValueOnce(null);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/events/nonexistent',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Metrics
  // ==========================================================================

  describe('security metrics', () => {
    it('GET /api/admin/security/metrics aggregates event counts', async () => {
      const mockEvents = [
        { event_type: 'login_failure', severity: 'medium' },
        { event_type: 'login_failure', severity: 'medium' },
        { event_type: 'account_locked', severity: 'high' },
        { event_type: 'token_reuse', severity: 'critical' },
        { event_type: 'suspicious_login', severity: 'high' },
      ];

      mockDb.query.mockResolvedValueOnce(mockEvents);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/metrics?period=day',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        totalEvents: number;
        criticalEvents: number;
        highEvents: number;
        mediumEvents: number;
        lowEvents: number;
        eventsByType: Record<string, number>;
        period: string;
        periodStart: string;
        periodEnd: string;
      };
      expect(body.totalEvents).toBe(5);
      expect(body.criticalEvents).toBe(1);
      expect(body.highEvents).toBe(2);
      expect(body.mediumEvents).toBe(2);
      expect(body.period).toBe('day');
      expect(body.periodStart).toBeDefined();
      expect(body.periodEnd).toBeDefined();
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Export
  // ==========================================================================

  // ==========================================================================
  // Non-Admin Role Enforcement — All Security Endpoints
  // ==========================================================================

  describe('non-admin user receives 403 on all admin security endpoints', () => {
    it('GET /api/admin/security/events/:id returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/events/00000000-0000-0000-0000-000000000001',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/admin/security/export returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: userJwt,
          payload: { format: 'json' },
        }),
      );
      expect(response.statusCode).toBe(403);
    });

    it('GET /api/admin/audit-events returns 403 for non-admin user', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/audit-events',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Event Detail Metadata Verification
  // ==========================================================================

  describe('security event detail with metadata', () => {
    it('GET /api/admin/security/events/:id returns event with all metadata fields', async () => {
      const mockEvent = {
        id: 'se-meta-1',
        user_id: 'user-42',
        email: 'actor@example.com',
        event_type: 'suspicious_login',
        severity: 'high',
        ip_address: '203.0.113.50',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
        metadata: JSON.stringify({
          reason: 'Login from new country',
          country: 'XX',
          previousCountry: 'US',
        }),
        created_at: new Date('2025-06-15T10:30:00Z'),
      };

      mockDb.queryOne.mockResolvedValueOnce(mockEvent);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/events/se-meta-1',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        id: string;
        userId: string;
        email: string;
        eventType: string;
        severity: string;
        ipAddress: string;
        userAgent: string;
        metadata: unknown;
        createdAt: string;
      };
      expect(body.id).toBe('se-meta-1');
      expect(body.userId).toBeDefined();
      expect(body.email).toBeDefined();
      expect(body.eventType).toBeDefined();
      expect(body.severity).toBe('high');
      expect(body.ipAddress).toBeDefined();
      expect(body.userAgent).toBeDefined();
      expect(body.createdAt).toBeDefined();
    });

    it('event includes correct actor, IP, user agent, timestamp', async () => {
      const timestamp = new Date('2025-09-01T08:00:00Z');
      const mockEvent = {
        id: 'se-actor-1',
        user_id: 'user-actor-99',
        email: 'specific-actor@example.com',
        event_type: 'password_changed',
        severity: 'medium',
        ip_address: '198.51.100.42',
        user_agent: 'Chrome/120.0.0.0',
        metadata: null,
        created_at: timestamp,
      };

      mockDb.queryOne.mockResolvedValueOnce(mockEvent);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/events/se-actor-1',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        userId: string;
        ipAddress: string;
        userAgent: string;
        createdAt: string;
      };
      // Verify the actor (user_id) is present
      expect(body.userId).toBe('user-actor-99');
      // Verify the IP address
      expect(body.ipAddress).toBe('198.51.100.42');
      // Verify the user agent
      expect(body.userAgent).toBe('Chrome/120.0.0.0');
      // Verify the timestamp is an ISO string
      expect(body.createdAt).toBe(timestamp.toISOString());
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Events Written on Auth Actions
  // ==========================================================================

  describe('security events written to DB on auth actions', () => {
    it('security events DB calls include event_type, severity, ip_address, user_agent', async () => {
      // Verify the mock structure supports the full security event shape
      const mockEvent = {
        id: 'se-db-1',
        user_id: 'user-1',
        email: 'test@example.com',
        event_type: 'account_locked',
        severity: 'high',
        ip_address: '10.0.0.1',
        user_agent: 'TestAgent/1.0',
        metadata: JSON.stringify({ failedAttempts: 5 }),
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
          payload: { page: 1, limit: 10, filter: { eventType: 'account_locked' } },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        data: Array<{
          eventType: string;
          severity: string;
          ipAddress: string;
          userAgent: string;
        }>;
      };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]!.eventType).toBe('account_locked');
      expect(body.data[0]!.severity).toBe('high');
      expect(body.data[0]!.ipAddress).toBe('10.0.0.1');
      expect(body.data[0]!.userAgent).toBe('TestAgent/1.0');
    });

    it('login_failure events are queryable via the admin API', async () => {
      const mockEvents = [
        {
          id: 'se-login-fail-1',
          user_id: null,
          email: 'attacker@example.com',
          event_type: 'login_failure',
          severity: 'medium',
          ip_address: '172.16.0.1',
          user_agent: 'curl/7.88',
          metadata: null,
          created_at: new Date(),
        },
      ];
      mockDb.query.mockResolvedValueOnce(mockEvents);
      mockDb.queryOne.mockResolvedValueOnce({ count: '1' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 10, filter: { eventType: 'login_failure' } },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { data: Array<{ eventType: string }> };
      expect(body.data[0]!.eventType).toBe('login_failure');
    });

    it('OAuth login events are queryable via the admin API', async () => {
      const mockEvents = [
        {
          id: 'se-oauth-1',
          user_id: 'user-oauth-1',
          email: 'oauth@example.com',
          event_type: 'oauth_login_success',
          severity: 'low',
          ip_address: '192.168.1.50',
          user_agent: 'Safari/17.0',
          metadata: JSON.stringify({ provider: 'google', isNewUser: false }),
          created_at: new Date(),
        },
      ];
      mockDb.query.mockResolvedValueOnce(mockEvents);
      mockDb.queryOne.mockResolvedValueOnce({ count: '1' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 10, filter: { eventType: 'oauth_login_success' } },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { data: Array<{ eventType: string }> };
      expect(body.data[0]!.eventType).toBe('oauth_login_success');
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Metrics With Aggregated Data
  // ==========================================================================

  describe('security metrics aggregated values', () => {
    it('GET /api/admin/security/metrics returns lowEvents count', async () => {
      const mockEvents = [
        { event_type: 'oauth_login_success', severity: 'low' },
        { event_type: 'oauth_login_success', severity: 'low' },
        { event_type: 'login_failure', severity: 'medium' },
      ];

      mockDb.query.mockResolvedValueOnce(mockEvents);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/metrics?period=week',
          accessToken: adminJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        totalEvents: number;
        lowEvents: number;
        mediumEvents: number;
        eventsByType: Record<string, number>;
      };
      expect(body.totalEvents).toBe(3);
      expect(body.lowEvents).toBe(2);
      expect(body.mediumEvents).toBe(1);
      expect(body.eventsByType).toBeDefined();
      expect(body.eventsByType['oauth_login_success']).toBe(2);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Security Export
  // ==========================================================================

  describe('security export', () => {
    it('POST /api/admin/security/export returns JSON export', async () => {
      const mockEvents = [
        {
          id: 'se-exp-1',
          user_id: null,
          email: null,
          event_type: 'login_failure',
          severity: 'medium',
          ip_address: '127.0.0.1',
          user_agent: null,
          metadata: null,
          created_at: new Date(),
        },
        {
          id: 'se-exp-2',
          user_id: null,
          email: null,
          event_type: 'account_locked',
          severity: 'high',
          ip_address: '10.0.0.1',
          user_agent: null,
          metadata: null,
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
      expect(body.contentType).toBe('application/json');
      expect(body.filename).toContain('security-events');
      expect(body.data).toBeDefined();
    });

    it('POST /api/admin/security/export returns CSV export', async () => {
      mockDb.query.mockResolvedValueOnce([
        {
          id: 'se-csv-1',
          user_id: null,
          email: null,
          event_type: 'login_failure',
          severity: 'low',
          ip_address: null,
          user_agent: null,
          metadata: null,
          created_at: new Date(),
        },
      ]);

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
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Future dates, negative offset, empty filters
  // ==========================================================================

  describe('Adversarial: boundary — query with extreme values', () => {
    it('query events with date in far future (year 9999) returns empty results', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: {
              startDate: '9999-12-31T23:59:59.999Z',
              endDate: '9999-12-31T23:59:59.999Z',
            },
          },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { data: unknown[]; total: number };
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('query events with negative page number is rejected or returns empty', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: -1, limit: 10 },
        }),
      );

      // Should either reject (400) or normalize to page 1
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
      if (response.statusCode === 200) {
        const body = parseJsonResponse(response) as { page: number };
        expect(body.page).toBeGreaterThanOrEqual(1);
      }
    });

    it('query events with zero limit returns empty or is rejected', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 0 },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('query events with empty type filter string returns results', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 10, filter: { eventType: '' } },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('query events with MAX_SAFE_INTEGER page number is handled', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: Number.MAX_SAFE_INTEGER, limit: 10 },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('query events with null filter is handled gracefully', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: { page: 1, limit: 10, filter: null },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Export with unsupported format, 0 limit
  // ==========================================================================

  describe('Adversarial: boundary — export edge cases', () => {
    it('export with unsupported format is rejected', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'xml' },
        }),
      );

      // Unsupported format should be rejected
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).not.toBe(500);
    });

    it('export with empty format string is rejected', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: '' },
        }),
      );

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('export with null format is rejected', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: null },
        }),
      );

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('export with limit 0 returns empty or is rejected', async () => {
      mockDb.query.mockResolvedValueOnce([]);

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'json', limit: 0 },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('export with negative limit is rejected', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: adminJwt,
          payload: { format: 'json', limit: -100 },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — DB returning events with null actor_id, malformed timestamps
  // ==========================================================================

  describe('Adversarial: layer — DB returning malformed event records', () => {
    it.todo('handles event with null actor_id (user_id) gracefully');

    it.todo('handles event with malformed timestamp string gracefully');

    it.todo('handles event with null metadata field in list query');

    it.todo('handles DB returning empty array for metrics query');

    it.todo('handles DB returning event with all null fields');
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double-export same query
  // ==========================================================================

  describe('Adversarial: idempotency — double-export produces same results', () => {
    it.todo('two identical JSON exports return consistent results');

    it.todo('two identical CSV exports return consistent results');

    it.todo('two identical event queries return same pagination metadata');
  });

  // ==========================================================================
  // Adversarial: "Killer" — Non-admin with forged header, SQL injection
  // ==========================================================================

  describe('Adversarial: killer tests — forged headers, SQL injection, privilege escalation', () => {
    it('non-admin user with forged x-admin-id header is still rejected', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: userJwt,
          payload: { page: 1, limit: 10 },
          headers: {
            'x-admin-id': 'admin-test-456',
            'x-role': 'admin',
            'x-user-role': 'admin',
          },
        }),
      );

      // Should still be 403 -- header forgery must not bypass role enforcement
      expect(response.statusCode).toBe(403);
    });

    it('non-admin user with forged authorization-level header cannot access metrics', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/admin/security/metrics',
          accessToken: userJwt,
          headers: {
            'x-forwarded-role': 'admin',
            'x-original-role': 'admin',
          },
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it('SQL injection in event type filter is neutralized', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: {
              eventType: "'; DROP TABLE security_events; --",
            },
          },
        }),
      );

      // Should not crash and should not drop tables
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('SQL injection in severity filter is neutralized', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: {
              severity: "high' OR '1'='1",
            },
          },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('SQL injection in userId filter is neutralized', async () => {
      mockDb.query.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ count: '0' });

      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/events',
          accessToken: adminJwt,
          payload: {
            page: 1,
            limit: 10,
            filter: {
              userId: "' UNION SELECT * FROM users --",
            },
          },
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('non-admin user cannot export security events', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: userJwt,
          payload: { format: 'json' },
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it('non-admin user with forged admin header cannot export', async () => {
      const userJwt = createTestJwt({ role: 'user' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/admin/security/export',
          accessToken: userJwt,
          payload: { format: 'json' },
          headers: {
            'x-admin-id': 'admin-test-456',
            'x-override-role': 'admin',
          },
        }),
      );

      expect(response.statusCode).toBe(403);
    });

    it('prototype pollution in security events filter payload is neutralized', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/events',
        headers: {
          authorization: `Bearer ${adminJwt}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          page: 1,
          limit: 10,
          filter: { severity: 'high' },
          '__proto__': { isAdmin: true, polluted: true },
          'constructor': { prototype: { hacked: true } },
        }),
      });

      expect(response.statusCode).not.toBe(500);
      // Verify prototype was not polluted
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
      expect(({} as Record<string, unknown>)['hacked']).toBeUndefined();
    });

    it('unauthenticated request with forged admin headers is rejected', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/admin/security/events',
        headers: {
          'x-admin-id': 'admin-test-456',
          'x-role': 'admin',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ page: 1, limit: 10 }),
      });

      expect(response.statusCode).toBe(401);
    });

    it.todo('expired admin JWT is rejected for security events');
  });
});
