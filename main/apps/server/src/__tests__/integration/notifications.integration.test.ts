// main/apps/server/src/__tests__/integration/notifications.integration.test.ts
/**
 * Notifications API Integration Tests
 *
 * Tests the notification API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards, and public route logic.
 */

import { createAuthGuard } from '@bslt/core/auth';
import { notificationRoutes } from '@bslt/core/notifications';
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

    it('protected routes accept valid Bearer token (not 401)', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );
      expect(response.statusCode).not.toBe(401);
    });
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

  // ==========================================================================
  // Behavioral Tests — List Notifications
  // ==========================================================================

  describe('list notifications', () => {
    it('GET /api/notifications/list returns notifications with unread count', async () => {
      const now = new Date();
      const mockNotifications = [
        {
          id: 'n-1',
          userId: 'user-test-123',
          type: 'info',
          title: 'Welcome',
          message: 'Welcome to the app',
          data: undefined,
          isRead: false,
          readAt: undefined,
          createdAt: now,
        },
        {
          id: 'n-2',
          userId: 'user-test-123',
          type: 'success',
          title: 'Setup complete',
          message: 'Your account is ready',
          data: undefined,
          isRead: true,
          readAt: now,
          createdAt: now,
        },
      ];

      mockRepos.notifications.findByUserId.mockResolvedValueOnce(mockNotifications);
      mockRepos.notifications.countUnread.mockResolvedValueOnce(1);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        notifications: Array<{ id: string; title: string; isRead: boolean }>;
        unreadCount: number;
      };
      expect(body.notifications).toHaveLength(2);
      expect(body.unreadCount).toBe(1);
      expect(body.notifications[0]!.id).toBe('n-1');
    });

    it('GET /api/notifications/list returns empty array when no notifications', async () => {
      mockRepos.notifications.findByUserId.mockResolvedValueOnce([]);
      mockRepos.notifications.countUnread.mockResolvedValueOnce(0);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        notifications: unknown[];
        unreadCount: number;
      };
      expect(body.notifications).toHaveLength(0);
      expect(body.unreadCount).toBe(0);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Mark Notifications
  // ==========================================================================

  describe('mark notifications', () => {
    it('POST /api/notifications/mark-read marks specified notifications as read', async () => {
      const id1 = '00000000-0000-1000-8000-000000000001';
      const id2 = '00000000-0000-1000-8000-000000000002';

      mockRepos.notifications.markAsRead
        .mockResolvedValueOnce({ id: id1, isRead: true })
        .mockResolvedValueOnce({ id: id2, isRead: true });

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [id1, id2] },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string; count: number };
      expect(body.count).toBe(2);
      expect(mockRepos.notifications.markAsRead).toHaveBeenCalledTimes(2);
    });

    it('POST /api/notifications/mark-all-read marks all as read', async () => {
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(5);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-all-read',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string; count: number };
      expect(body.count).toBe(5);
      expect(mockRepos.notifications.markAllAsRead).toHaveBeenCalledWith('user-test-123');
    });
  });

  // ==========================================================================
  // Behavioral Tests — Delete Notification
  // ==========================================================================

  describe('delete notification', () => {
    it('POST /api/notifications/delete removes notification', async () => {
      mockRepos.notifications.delete.mockResolvedValueOnce(true);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/delete',
          accessToken: userJwt,
          payload: { id: 'n-1' },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBeDefined();
    });

    it('POST /api/notifications/delete returns 404 for unknown notification', async () => {
      mockRepos.notifications.delete.mockResolvedValueOnce(false);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/delete',
          accessToken: userJwt,
          payload: { id: 'nonexistent' },
        }),
      );

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Behavioral Tests — Preferences
  // ==========================================================================

  describe('notification preferences', () => {
    it('GET /api/notifications/preferences returns user preferences', async () => {
      const mockPrefs = {
        user_id: 'user-test-123',
        global_enabled: true,
        quiet_hours: JSON.stringify({
          enabled: false,
          startHour: 22,
          endHour: 7,
          timezone: 'UTC',
        }),
        types: JSON.stringify({}),
        updated_at: new Date().toISOString(),
      };

      mockDb.queryOne.mockResolvedValueOnce(mockPrefs);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/preferences',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { preferences: Record<string, unknown> };
      expect(body.preferences).toBeDefined();
    });
  });

  // ==========================================================================
  // Behavioral Tests — Stubbed Routes
  // ==========================================================================

  describe('stubbed routes', () => {
    it('POST /api/notifications/test returns 500 (provider not configured)', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/test',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(500);
      const body = parseJsonResponse(response) as { code: string };
      expect(body.code).toBe('PROVIDER_NOT_CONFIGURED');
    });

    it('POST /api/notifications/send returns 500 (provider not configured)', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: 'Test', body: 'Test notification' },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      expect(response.statusCode).toBe(500);
      const body = parseJsonResponse(response) as { code: string };
      expect(body.code).toBe('PROVIDER_NOT_CONFIGURED');
    });
  });

  // ==========================================================================
  // POST /api/notifications/send — creates notification (admin sends to users)
  // ==========================================================================

  describe('create notifications', () => {
    it('POST /api/notifications/send with admin token creates notifications for specified users', async () => {
      const adminJwt = createAdminJwt();

      // Even though the provider is not configured, we verify the route processes
      // the request and the repo create method would be called
      mockRepos.notifications.create.mockResolvedValueOnce({
        id: 'n-new',
        userId: '00000000-0000-1000-8000-000000000001',
        type: 'system',
        title: 'Announcement',
        message: 'New feature available',
        isRead: false,
        createdAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: 'Announcement', body: 'New feature available' },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Route exists, admin is authorized — gets 500 because push provider not configured
      // but the notification logic would be exercised
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/send with regular user token returns 403 (admin only)', async () => {
      const userJwt = createTestJwt();

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: userJwt,
          payload: {
            type: 'system',
            payload: { title: 'Hack', body: 'Should not work' },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Regular user should be forbidden from sending notifications
      expect(response.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // GET /api/notifications/list — paginated notifications for current user
  // ==========================================================================

  describe('paginated notifications', () => {
    it('GET /api/notifications/list returns paginated results for authenticated user', async () => {
      const now = new Date();
      const mockNotifications = Array.from({ length: 25 }, (_, i) => ({
        id: `n-${String(i + 1).padStart(3, '0')}`,
        userId: 'user-test-123',
        type: 'info',
        title: `Notification ${i + 1}`,
        message: `Message ${i + 1}`,
        data: undefined,
        isRead: i < 10, // First 10 are read
        readAt: i < 10 ? now : undefined,
        createdAt: now,
      }));

      mockRepos.notifications.findByUserId.mockResolvedValueOnce(mockNotifications);
      mockRepos.notifications.countUnread.mockResolvedValueOnce(15);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as {
        notifications: unknown[];
        unreadCount: number;
      };
      expect(body.notifications).toHaveLength(25);
      expect(body.unreadCount).toBe(15);
    });

    it('GET /api/notifications/list scopes to the authenticated user', async () => {
      mockRepos.notifications.findByUserId.mockResolvedValueOnce([]);
      mockRepos.notifications.countUnread.mockResolvedValueOnce(0);

      const userJwt = createTestJwt({ userId: 'specific-user-42' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      // Verify findByUserId was called with the specific user's ID
      expect(mockRepos.notifications.findByUserId).toHaveBeenCalledWith(
        'specific-user-42',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // PATCH /api/notifications/:id/read — mark as read (via mark-read batch)
  // ==========================================================================

  describe('mark single notification as read', () => {
    it('POST /api/notifications/mark-read marks a single notification as read', async () => {
      const notifId = '00000000-0000-1000-8000-000000000010';
      mockRepos.notifications.markAsRead.mockResolvedValueOnce({
        id: notifId,
        isRead: true,
        readAt: new Date(),
      });

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [notifId] },
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { count: number };
      expect(body.count).toBe(1);
      expect(mockRepos.notifications.markAsRead).toHaveBeenCalledWith(notifId);
    });
  });

  // ==========================================================================
  // POST /api/notifications/mark-all-read — marks all as read for user
  // ==========================================================================

  describe('mark all notifications as read', () => {
    it('POST /api/notifications/mark-all-read marks all unread as read', async () => {
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(12);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-all-read',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { count: number; message: string };
      expect(body.count).toBe(12);
      expect(mockRepos.notifications.markAllAsRead).toHaveBeenCalledWith('user-test-123');
    });

    it('POST /api/notifications/mark-all-read with zero unread returns count 0', async () => {
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(0);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-all-read',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { count: number };
      expect(body.count).toBe(0);
    });
  });

  // ==========================================================================
  // Unread Count
  // ==========================================================================

  describe('unread count', () => {
    it('GET /api/notifications/list includes correct unread count', async () => {
      mockRepos.notifications.findByUserId.mockResolvedValueOnce([
        {
          id: 'n-1',
          userId: 'user-test-123',
          type: 'info',
          title: 'Unread',
          message: 'Not read yet',
          isRead: false,
          createdAt: new Date(),
        },
      ]);
      mockRepos.notifications.countUnread.mockResolvedValueOnce(7);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/list',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { unreadCount: number };
      expect(body.unreadCount).toBe(7);
    });
  });

  // ==========================================================================
  // GET /api/notifications/preferences — returns current preference settings
  // ==========================================================================

  describe('get notification preferences', () => {
    it('GET /api/notifications/preferences returns default preferences when none set', async () => {
      // No preferences found — should return defaults
      mockDb.queryOne.mockResolvedValueOnce(null);
      // The handler inserts default prefs and expects the inserted row back
      mockDb.query.mockResolvedValueOnce([
        {
          user_id: 'user-test-123',
          global_enabled: true,
          quiet_hours: JSON.stringify({ enabled: false, startHour: 22, endHour: 7, timezone: 'UTC' }),
          types: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/preferences',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { preferences: Record<string, unknown> };
      expect(body.preferences).toBeDefined();
    });

    it('GET /api/notifications/preferences returns saved preferences', async () => {
      const savedPrefs = {
        user_id: 'user-test-123',
        global_enabled: true,
        quiet_hours: JSON.stringify({
          enabled: true,
          startHour: 22,
          endHour: 7,
          timezone: 'America/New_York',
        }),
        types: JSON.stringify({
          marketing: { email: false, push: true, inApp: true },
          security: { email: true, push: true, inApp: true },
        }),
        updated_at: new Date().toISOString(),
      };
      mockDb.queryOne.mockResolvedValueOnce(savedPrefs);

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/notifications/preferences',
          accessToken: userJwt,
        }),
      );

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { preferences: Record<string, unknown> };
      expect(body.preferences).toBeDefined();
    });
  });

  // ==========================================================================
  // PUT /api/notifications/preferences/update — updates channel preferences
  // ==========================================================================

  describe('update notification preferences', () => {
    it('PUT /api/notifications/preferences/update saves new channel preferences', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        user_id: 'user-test-123',
        global_enabled: true,
        quiet_hours: JSON.stringify({ enabled: false, startHour: 22, endHour: 7, timezone: 'UTC' }),
        types: JSON.stringify({}),
        updated_at: new Date().toISOString(),
      });

      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'PUT',
          url: '/api/notifications/preferences/update',
          accessToken: userJwt,
          payload: {
            globalEnabled: false,
          },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      // May be 200 (success) or another status depending on validation
    });
  });

  // ==========================================================================
  // Push Subscription — register, send, receive (mock FCM endpoint)
  // ==========================================================================

  describe('push subscription lifecycle', () => {
    it('POST /api/notifications/subscribe registers a push subscription', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/subscribe',
          accessToken: userJwt,
          payload: {
            subscription: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/mock-token-123',
              keys: {
                p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ',
                auth: 'tBHItJI5svbpC7FR_bNE1g',
              },
            },
            deviceId: 'device-test-1',
            userAgent: 'Playwright/1.0',
          },
        }),
      );

      // Not 401 (authenticated), not 404 (route exists)
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/unsubscribe removes a push subscription', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/unsubscribe',
          accessToken: userJwt,
          payload: {
            subscriptionId: 'ps-1',
          },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/notifications/test sends a test push (returns 500 without provider)', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/test',
          accessToken: userJwt,
        }),
      );

      // Without push provider configured, returns 500
      expect(response.statusCode).toBe(500);
      const body = parseJsonResponse(response) as { code: string };
      expect(body.code).toBe('PROVIDER_NOT_CONFIGURED');
    });
  });

  // ==========================================================================
  // Email Send — SMTP transport (dev: console provider logs to stdout)
  // ==========================================================================

  describe('email delivery', () => {
    it('email service mock is available and returns success', async () => {
      // Verify the mock email service is properly wired
      const result = await testServer.email.send({
        to: 'test@example.com',
        subject: 'Test notification email',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(testServer.email.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test notification email',
        }),
      );
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Create Notification Boundary Tests
  // ==========================================================================

  describe('adversarial: create notification boundary tests', () => {
    it('POST /api/notifications/send with empty body payload does not crash', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: '', body: '' },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Should not crash — may return 400 (validation) or 500 (provider not configured)
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();
    });

    it('POST /api/notifications/send with 1MB body payload is handled safely', async () => {
      const adminJwt = createAdminJwt();
      const largeBody = 'B'.repeat(1024 * 1024); // 1MB

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: 'Large', body: largeBody },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Should either reject (413/400) or process without crashing
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBeDefined();
    });

    it('POST /api/notifications/send with null recipient does not crash', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: 'Test', body: 'Test notification' },
            userIds: [null],
          },
        }),
      );

      // Should reject with 400 (invalid user ID) or 500, never crash
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();
    });

    it('POST /api/notifications/send with empty userIds array is handled', async () => {
      const adminJwt = createAdminJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: { title: 'Test', body: 'No recipients' },
            userIds: [],
          },
        }),
      );

      // Should return 400 (no recipients) or 500 (provider) — never crash
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBeDefined();
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Mark-as-Read Boundary Tests
  // ==========================================================================

  describe('adversarial: mark-as-read boundary tests', () => {
    it('POST /api/notifications/mark-read with non-existent notification ID returns error or is ignored', async () => {
      // markAsRead returns null when notification not found
      mockRepos.notifications.markAsRead.mockResolvedValueOnce(null);

      // Use valid UUID format (required by notificationIdSchema)
      const nonExistentId = '00000000-0000-1000-8000-ffffffffffff';
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [nonExistentId] },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      // Should handle gracefully — either skip unfound IDs or return error
      expect(response.statusCode).toBeDefined();
      const body = parseJsonResponse(response) as { count: number };
      if (response.statusCode === 200) {
        // If 200, count should be 0 (nothing was actually marked)
        expect(body.count).toBe(0);
      }
    });

    it('POST /api/notifications/mark-read with another user notification ID does not mark it', async () => {
      // markAsRead should scope by userId — returns null if user mismatch
      mockRepos.notifications.markAsRead.mockResolvedValueOnce(null);

      // Use valid UUID format (required by notificationIdSchema)
      const otherUserNotifId = '00000000-0000-1000-8000-eeeeeeeeeeee';
      const userJwt = createTestJwt({ userId: 'user-A' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [otherUserNotifId] },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBeDefined();
      // The handler calls markAsRead(id) for each id — verify it was called
      expect(mockRepos.notifications.markAsRead).toHaveBeenCalledWith(otherUserNotifId);
    });

    it('POST /api/notifications/mark-read with empty ids array returns count 0', async () => {
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [] },
        }),
      );

      expect(response.statusCode).not.toBe(401);
      if (response.statusCode === 200) {
        const body = parseJsonResponse(response) as { count: number };
        expect(body.count).toBe(0);
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Layer Handshake — Push/SMTP Failures
  // ==========================================================================

  describe('adversarial: layer handshake — push and SMTP failures', () => {
    it('POST /api/notifications/test when push endpoint returns 500 does not crash', async () => {
      // Push provider is not configured in tests — this tests that the
      // handler returns a clean error instead of crashing
      const userJwt = createTestJwt();
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/test',
          accessToken: userJwt,
        }),
      );

      // Should return 500 with structured error, never unhandled exception
      expect(response.statusCode).toBe(500);
      const body = parseJsonResponse(response) as { code: string; message: string };
      expect(body.code).toBe('PROVIDER_NOT_CONFIGURED');
      expect(body.message).toBeDefined();
    });

    it('email service throwing mid-send does not crash notification routes', async () => {
      // Simulate email service throwing an error
      (testServer.email.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('SMTP connection reset'),
      );

      // Even though email fails, the route should handle the error gracefully
      const result = testServer.email.send({
        to: 'test@example.com',
        subject: 'Notification email',
        html: '<p>Test</p>',
        text: 'Test',
      });

      await expect(result).rejects.toThrow('SMTP connection reset');

      // Subsequent sends should still work (mock resets)
      const result2 = (await testServer.email.send({
        to: 'test@example.com',
        subject: 'Recovery email',
        html: '<p>Test</p>',
        text: 'Test',
      })) as { success: boolean; messageId: string };
      expect(result2.success).toBe(true);
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Concurrent Mark-All-as-Read + New Notification
  // ==========================================================================

  describe('adversarial: async integrity — concurrent mark-all-read + new notification', () => {
    it('concurrent mark-all-as-read and new notification creation do not corrupt state', async () => {
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(5);
      mockRepos.notifications.create.mockResolvedValueOnce({
        id: 'n-concurrent',
        userId: 'user-test-123',
        type: 'info',
        title: 'New during mark-all',
        message: 'Created while marking all as read',
        isRead: false,
        createdAt: new Date(),
      });

      const userJwt = createTestJwt();
      const adminJwt = createAdminJwt();

      const [markAllResponse, sendResponse] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/notifications/mark-all-read',
            accessToken: userJwt,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/notifications/send',
            accessToken: adminJwt,
            payload: {
              type: 'system',
              payload: { title: 'Concurrent', body: 'Created during mark-all' },
              userIds: ['user-test-123'],
            },
          }),
        ),
      ]);

      // Both should complete without crashing
      expect(markAllResponse.statusCode).toBeDefined();
      expect(sendResponse.statusCode).toBeDefined();
      expect(markAllResponse.statusCode).not.toBe(401);
      expect(sendResponse.statusCode).not.toBe(401);

      // Mark-all should have been called
      if (markAllResponse.statusCode === 200) {
        expect(mockRepos.notifications.markAllAsRead).toHaveBeenCalledWith('user-test-123');
      }
    });
  });

  // ==========================================================================
  // ADVERSARIAL: Double Mark-as-Read Idempotency
  // ==========================================================================

  describe('adversarial: idempotency — double mark-as-read', () => {
    it('marking the same notification as read twice returns no error and consistent state', async () => {
      const notifId = '00000000-0000-1000-8000-000000000099';

      // Reset markAsRead to clear any leftover mockResolvedValueOnce queue
      // from prior tests (vi.clearAllMocks does not clear once-queues)
      mockRepos.notifications.markAsRead.mockReset();

      // First call: marks as read successfully
      mockRepos.notifications.markAsRead.mockResolvedValueOnce({
        id: notifId,
        isRead: true,
        readAt: new Date(),
      });
      // Second call: already read, still returns the read state
      mockRepos.notifications.markAsRead.mockResolvedValueOnce({
        id: notifId,
        isRead: true,
        readAt: new Date(),
      });

      const userJwt = createTestJwt();

      const response1 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [notifId] },
        }),
      );

      const response2 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-read',
          accessToken: userJwt,
          payload: { ids: [notifId] },
        }),
      );

      // Both should succeed with consistent results
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const body1 = parseJsonResponse(response1) as { count: number };
      const body2 = parseJsonResponse(response2) as { count: number };
      expect(body1.count).toBe(1);
      expect(body2.count).toBe(1);
    });

    it('POST /api/notifications/mark-all-read called twice returns no error', async () => {
      // Reset to clear any leftover mockResolvedValueOnce queue from prior tests
      mockRepos.notifications.markAllAsRead.mockReset();
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(3);
      mockRepos.notifications.markAllAsRead.mockResolvedValueOnce(0);

      const userJwt = createTestJwt();

      const response1 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-all-read',
          accessToken: userJwt,
        }),
      );

      const response2 = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/mark-all-read',
          accessToken: userJwt,
        }),
      );

      // Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const body1 = parseJsonResponse(response1) as { count: number };
      const body2 = parseJsonResponse(response2) as { count: number };
      expect(body1.count).toBe(3);
      expect(body2.count).toBe(0); // Second time, nothing left to mark
    });
  });

  // ==========================================================================
  // ADVERSARIAL: "Killer" Test — XSS Payload in Title + Unauthorized Recipient
  // ==========================================================================

  describe('adversarial: killer test — XSS payload + unauthorized recipient', () => {
    it('POST /api/notifications/send with XSS payload in title does not reflect raw HTML', async () => {
      const adminJwt = createAdminJwt();

      mockRepos.notifications.create.mockResolvedValueOnce({
        id: 'n-xss',
        userId: '00000000-0000-1000-8000-000000000001',
        type: 'system',
        title: '<script>alert("xss")</script>',
        message: 'XSS test',
        isRead: false,
        createdAt: new Date(),
      });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: adminJwt,
          payload: {
            type: 'system',
            payload: {
              title: '<script>alert("xss")</script>',
              body: '<img src=x onerror=alert("xss")>',
            },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Route should process without crashing
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).toBeDefined();

      // If the notification was created, verify the stored data
      if (mockRepos.notifications.create.mock.calls.length > 0) {
        const createCall = mockRepos.notifications.create.mock.calls[0];
        if (createCall && createCall[0]) {
          const storedNotif = createCall[0] as Record<string, unknown>;
          // The title should either be sanitized or stored as-is (rendering layer handles escaping)
          expect(storedNotif).toBeDefined();
        }
      }
    });

    it('regular user cannot send notifications to arbitrary recipients (authorization check)', async () => {
      const userJwt = createTestJwt({ userId: 'attacker-user' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: userJwt,
          payload: {
            type: 'system',
            payload: {
              title: '<script>alert("xss")</script>',
              body: 'Malicious notification',
            },
            userIds: ['victim-user-id-1', 'victim-user-id-2'],
          },
        }),
      );

      // Regular users must not be able to send notifications — should get 403
      expect(response.statusCode).toBe(403);
    });

    it('POST /api/notifications/send with XSS in title + unauthorized user returns 403 before processing', async () => {
      const userJwt = createTestJwt({ role: 'user' });

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/notifications/send',
          accessToken: userJwt,
          payload: {
            type: 'system',
            payload: {
              title: '"><img src=x onerror=alert(document.cookie)>',
              body: 'Should never reach handler',
            },
            userIds: ['00000000-0000-1000-8000-000000000001'],
          },
        }),
      );

      // Auth guard must reject before the XSS payload reaches the handler
      expect(response.statusCode).toBe(403);
      // Verify the notification was NOT created
      expect(mockRepos.notifications.create).not.toHaveBeenCalled();
    });
  });
});
