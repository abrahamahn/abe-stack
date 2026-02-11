// src/apps/server/src/__tests__/integration/notifications.integration.test.ts
/**
 * Notifications API Integration Tests
 *
 * Tests the notification API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards, and public route logic.
 */

import { createAuthGuard } from '@abe-stack/core/auth';
import { notificationRoutes } from '@abe-stack/core/notifications';
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
    notifications: {
      create: vi.fn().mockResolvedValue({ id: 'n-1' }),
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      countUnread: vi.fn().mockResolvedValue(0),
      markAsRead: vi.fn().mockResolvedValue(null),
      markAllAsRead: vi.fn().mockResolvedValue(0),
      delete: vi.fn().mockResolvedValue(true),
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

describe('Notifications API Integration Tests', () => {
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

    registerRouteMap(testServer.server, ctx as never, notificationRoutes, {
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
    it('GET /api/notifications/vapid-key responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/vapid-key',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/subscribe responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/subscribe',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/unsubscribe responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/unsubscribe',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/notifications/preferences responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/preferences',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('PUT /api/notifications/preferences/update responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'PUT',
        url: '/api/notifications/preferences/update',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/test responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/test',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/send responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/notifications/list responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/list',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/mark-read responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/mark-read',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/mark-all-read responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/mark-all-read',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/delete responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (Protected Routes)
  // ==========================================================================

  describe('auth guards', () => {
    it('POST /api/notifications/subscribe returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/subscribe',
        payload: {
          subscription: {
            endpoint: 'https://push.example.com/sub1',
            keys: { p256dh: 'key1', auth: 'auth1' },
          },
          deviceId: 'device-1',
          userAgent: 'test-agent',
        },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/unsubscribe returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/unsubscribe',
        payload: { subscriptionId: 'sub-1' },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/notifications/preferences returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/preferences',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('PUT /api/notifications/preferences/update returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'PUT',
        url: '/api/notifications/preferences/update',
        payload: { pushEnabled: true },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/test returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/test',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/send returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {
          title: 'Test',
          body: 'Test notification',
          userIds: ['user-1'],
        },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('GET /api/notifications/list returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/list',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/mark-read returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/mark-read',
        payload: { ids: ['notif-1'] },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/mark-all-read returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/mark-all-read',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/notifications/delete returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/notifications/delete',
        payload: { id: 'notif-1' },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it.todo('protected routes accept valid Bearer token');
  });

  // ==========================================================================
  // Public Route Tests
  // ==========================================================================

  describe('public routes', () => {
    it('GET /api/notifications/vapid-key returns 501 (web push not configured)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/vapid-key',
      });

      // VAPID keys are not configured, handler returns 501
      expect(response.statusCode).toBe(501);
      const body = parseJsonResponse(response) as { message: string; code: string };
      expect(body.message).toBeDefined();
      expect(body.code).toBe('VAPID_NOT_CONFIGURED');
    });

    it('GET /api/notifications/vapid-key does not require authentication', async () => {
      // No auth header — should still respond (not 401)
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/notifications/vapid-key',
      });

      // Public route: should NOT return 401
      expect(response.statusCode).not.toBe(401);
    });
  });
});
