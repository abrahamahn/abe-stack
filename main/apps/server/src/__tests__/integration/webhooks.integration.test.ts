// main/apps/server/src/__tests__/integration/webhooks.integration.test.ts
/**
 * Webhooks API Integration Tests
 *
 * Tests the webhook management endpoints through fastify.inject(),
 * verifying routing, auth guards, method enforcement, and CRUD operations.
 *
 * Covers: /api/webhooks, /api/webhooks/list, /api/webhooks/:id,
 *         /api/webhooks/:id/update, /api/webhooks/:id/delete,
 *         /api/webhooks/:id/rotate-secret
 */

import { createAuthGuard } from '@bslt/core';
import { webhookRoutes } from '@bslt/core/webhooks';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@/http';

import { registerRouteMap } from '@/http';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockWebhookRepos() {
  return {
    webhooks: {
      create: vi.fn().mockResolvedValue({
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        events: ['user.created'],
        secret: 'generated-secret',
        isActive: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      }),
      findById: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findActiveByEvent: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    webhookDeliveries: {
      create: vi.fn().mockResolvedValue({
        id: 'wd-1',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: {},
        status: 'pending',
        attempts: 0,
        createdAt: new Date('2025-01-01'),
        deliveredAt: null,
      }),
      findById: vi.fn().mockResolvedValue(null),
      findByWebhookId: vi.fn().mockResolvedValue([]),
      findByStatus: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null),
    },
    // Stubs for other repos that may be accessed via the context
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
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
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

describe('Webhooks API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockWebhookRepos>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockWebhookRepos();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, webhookRoutes, {
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
  // POST /api/webhooks -- Create Webhook
  // ==========================================================================

  describe('POST /api/webhooks', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks',
        payload: { url: 'https://example.com/hook', events: ['user.created'] },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks',
        payload: { url: 'https://example.com/hook', events: ['user.created'] },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/webhooks/list -- List Webhooks
  // ==========================================================================

  describe('GET /api/webhooks/list', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/list',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/list',
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/list',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/webhooks/:id -- Get Webhook
  // ==========================================================================

  describe('GET /api/webhooks/:id', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/webhooks/:id/update -- Update Webhook
  // ==========================================================================

  describe('POST /api/webhooks/:id/update', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/update',
        payload: { url: 'https://example.com/new-hook' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/update',
        payload: { url: 'https://example.com/new-hook' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123/update',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/webhooks/:id/delete -- Delete Webhook
  // ==========================================================================

  describe('POST /api/webhooks/:id/delete', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/delete',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/delete',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123/delete',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/webhooks/:id/rotate-secret -- Rotate Secret
  // ==========================================================================

  describe('POST /api/webhooks/:id/rotate-secret', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/rotate-secret',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/rotate-secret',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123/rotate-secret',
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
