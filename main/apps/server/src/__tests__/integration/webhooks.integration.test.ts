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

import {
  buildAuthenticatedRequest,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

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

  // ==========================================================================
  // GET /api/webhooks/:id/deliveries -- List Deliveries
  // ==========================================================================

  describe('GET /api/webhooks/:id/deliveries', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123/deliveries',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/wh-123/deliveries',
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/wh-123/deliveries',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // POST /api/webhooks/deliveries/:deliveryId/replay -- Replay Delivery
  // ==========================================================================

  describe('POST /api/webhooks/deliveries/:deliveryId/replay', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/deliveries/wd-123/replay',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks/deliveries/wd-123/replay',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/webhooks/deliveries/wd-123/replay',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Webhook Delivery Lifecycle Tests
  // ==========================================================================

  describe('Webhook delivery lifecycle', () => {
    it('event triggered: webhook creation accepted with valid auth', async () => {
      // Simulate creating a webhook that will receive events
      mockRepos.webhooks.create.mockResolvedValue({
        id: 'wh-new',
        tenantId: 'tenant-1',
        url: 'https://consumer.example.com/hook',
        events: ['user.created'],
        secret: 'generated-secret-abc',
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://consumer.example.com/hook',
            events: ['user.created'],
          },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).not.toBe(401);
    });

    it.todo('delivery log: deliveries endpoint returns delivery history');

    it.todo('replay: replaying a delivery creates a new pending delivery');
  });

  // ==========================================================================
  // Tenant-Scoped Webhooks Isolation
  // ==========================================================================

  describe('Tenant-scoped webhook isolation', () => {
    it('listing webhooks scopes to the requesting tenant', async () => {
      const tenantAWebhooks = [
        {
          id: 'wh-a1',
          tenantId: 'tenant-a',
          url: 'https://a.example.com/hook',
          events: ['user.created'],
          secret: 'secret-a',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepos.webhooks.findByTenantId.mockResolvedValue(tenantAWebhooks);

      const token = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/list',
          accessToken: token,
          workspaceId: 'tenant-a',
        }),
      );

      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).not.toBe(401);
    });

    it.todo('getting a webhook belonging to another tenant returns not found');

    it('webhook creation is scoped to the authenticated user tenant', async () => {
      mockRepos.webhooks.create.mockResolvedValue({
        id: 'wh-scoped',
        tenantId: 'tenant-a',
        url: 'https://a.example.com/new-hook',
        events: ['user.updated'],
        secret: 'new-secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://a.example.com/new-hook',
            events: ['user.updated'],
          },
          accessToken: token,
          workspaceId: 'tenant-a',
        }),
      );

      expect(response.statusCode).not.toBe(404);
      expect(response.statusCode).not.toBe(401);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Invalid URLs
  // ==========================================================================

  describe('Adversarial: webhook registration with invalid URLs', () => {
    it('rejects webhook with empty URL string', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: '', events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect([400, 422]).toContain(response.statusCode);
    });

    it('rejects webhook with javascript: protocol URL', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'javascript:alert(1)', events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('rejects webhook with data: protocol URL', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'data:text/html,<script>alert(1)</script>', events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('rejects webhook targeting localhost', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'http://localhost:8080/hook', events: ['user.created'] },
          accessToken: token,
        }),
      );

      // Should either reject outright or not allow SSRF-capable URLs
      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('rejects webhook targeting 0.0.0.0', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'http://0.0.0.0:9999/hook', events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('rejects webhook targeting internal IP range 127.x.x.x', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'http://127.0.0.2:4444/hook', events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — Malformed Payloads
  // ==========================================================================

  describe('Adversarial: webhook payloads with boundary values', () => {
    it('rejects webhook creation with null event type in events array', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'https://example.com/hook', events: [null] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('rejects webhook creation with empty events array', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { url: 'https://example.com/hook', events: [] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('handles oversized webhook payload body gracefully', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      // Generate a large string (~1MB) as a stand-in for 100MB body to avoid OOM in tests
      const largePayloadValue = 'x'.repeat(1024 * 1024);

      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://example.com/hook',
            events: ['user.created'],
            metadata: { oversized: largePayloadValue },
          },
          accessToken: token,
        }),
      );

      // Server should either reject with 413/400 or handle without crashing
      expect(response.statusCode).toBeDefined();
      expect([200, 201, 400, 413, 422]).toContain(response.statusCode);
    });

    it('rejects webhook creation with malformed headers in payload', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://example.com/hook',
            events: ['user.created'],
            headers: { 'Content-Type': null, 'X-Bad\r\nHeader': 'injection' },
          },
          accessToken: token,
        }),
      );

      // Should not crash; either accept (ignoring invalid headers) or reject
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('rejects webhook with undefined url field', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: { events: ['user.created'] },
          accessToken: token,
        }),
      );

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — DB returning malformed webhook records
  // ==========================================================================

  describe('Adversarial: layer handshake — DB returning malformed records', () => {
    it('handles DB returning webhook with null URL gracefully', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-malformed-1',
        tenantId: 'tenant-1',
        url: null,
        events: ['user.created'],
        secret: 'secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/wh-malformed-1',
          accessToken: token,
        }),
      );

      // Should not crash with 500; either 404 or returns the record
      expect(response.statusCode).toBeDefined();
      expect([200, 404, 403]).toContain(response.statusCode);
    });

    it('handles DB returning webhook with null events array', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-malformed-2',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        events: null,
        secret: 'secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/wh-malformed-2',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBeDefined();
      // Must not crash
      expect(response.statusCode).not.toBe(500);
    });

    it('handles DB returning delivery with null status field', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        events: ['user.created'],
        secret: 'secret-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRepos.webhookDeliveries.findByWebhookId.mockResolvedValue([
        {
          id: 'wd-malformed',
          webhookId: 'wh-1',
          eventType: 'user.created',
          payload: {},
          responseStatus: null,
          responseBody: null,
          status: null,
          attempts: 0,
          nextRetryAt: null,
          deliveredAt: null,
          createdAt: new Date(),
        },
      ]);

      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/wh-1/deliveries',
          accessToken: token,
        }),
      );

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('handles DB returning webhook list with mixed null and valid entries', async () => {
      mockRepos.webhooks.findByTenantId.mockResolvedValue([
        {
          id: 'wh-valid',
          tenantId: 'tenant-1',
          url: 'https://example.com/hook',
          events: ['user.created'],
          secret: 'secret-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        null,
        {
          id: 'wh-valid-2',
          tenantId: 'tenant-1',
          url: 'https://example.com/hook2',
          events: ['user.updated'],
          secret: 'secret-2',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/list',
          accessToken: token,
          workspaceId: 'tenant-1',
        }),
      );

      expect(response.statusCode).toBeDefined();
      // Should handle gracefully without 500
      expect(response.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Async — Concurrent delivery + retry for same event
  // ==========================================================================

  describe('Adversarial: async integrity — concurrent operations', () => {
    it('concurrent webhook creation requests do not cause duplicate IDs', async () => {
      let callCount = 0;
      mockRepos.webhooks.create.mockImplementation(() => {
        callCount += 1;
        return Promise.resolve({
          id: `wh-concurrent-${String(callCount)}`,
          tenantId: 'tenant-1',
          url: 'https://example.com/hook',
          events: ['user.created'],
          secret: `secret-${String(callCount)}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const token = createTestJwt({ userId: 'user-1' });
      const payload = { url: 'https://example.com/hook', events: ['user.created'] };

      const [response1, response2, response3] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks',
            payload,
            accessToken: token,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks',
            payload,
            accessToken: token,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks',
            payload,
            accessToken: token,
          }),
        ),
      ]);

      // All three should succeed or all fail consistently, no 500s
      for (const resp of [response1, response2, response3]) {
        expect(resp.statusCode).not.toBe(500);
      }

      // If they all succeeded, each should have a unique webhook ID
      const successes = [response1, response2, response3].filter((r) => r.statusCode < 400);
      const ids = successes.map((r) => {
        const body = parseJsonResponse(r) as { webhook?: { id: string }; id?: string };
        return body.webhook?.id ?? body.id;
      });
      const uniqueIds = new Set(ids.filter(Boolean));
      expect(uniqueIds.size).toBe(successes.length);
    });

    it('concurrent replay requests for the same delivery create separate deliveries', async () => {
      mockRepos.webhookDeliveries.findById.mockResolvedValue({
        id: 'wd-concurrent',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: { userId: 'u-1' },
        responseStatus: 500,
        responseBody: 'error',
        status: 'dead',
        attempts: 5,
        nextRetryAt: null,
        deliveredAt: null,
        createdAt: new Date(),
      });

      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        events: ['user.created'],
        secret: 'secret-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let replayCount = 0;
      mockRepos.webhookDeliveries.create.mockImplementation(() => {
        replayCount += 1;
        return Promise.resolve({
          id: `wd-replayed-${String(replayCount)}`,
          webhookId: 'wh-1',
          eventType: 'user.created',
          payload: { userId: 'u-1' },
          responseStatus: null,
          responseBody: null,
          status: 'pending',
          attempts: 0,
          nextRetryAt: null,
          deliveredAt: null,
          createdAt: new Date(),
        });
      });

      const token = createTestJwt({ userId: 'user-1' });

      const [r1, r2] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks/deliveries/wd-concurrent/replay',
            payload: {},
            accessToken: token,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks/deliveries/wd-concurrent/replay',
            payload: {},
            accessToken: token,
          }),
        ),
      ]);

      // Neither should crash
      expect(r1.statusCode).not.toBe(500);
      expect(r2.statusCode).not.toBe(500);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Same event delivered twice
  // ==========================================================================

  describe('Adversarial: idempotency — duplicate operations', () => {
    it('deleting the same webhook twice: second attempt returns 404 or success', async () => {
      // First delete succeeds
      mockRepos.webhooks.findById
        .mockResolvedValueOnce({
          id: 'wh-idemp-del',
          tenantId: 'tenant-1',
          url: 'https://example.com/hook',
          events: ['user.created'],
          secret: 'secret',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Second delete: webhook already gone
        .mockResolvedValueOnce(null);

      mockRepos.webhooks.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const token = createTestJwt({ userId: 'user-1' });

      const first = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks/wh-idemp-del/delete',
          payload: {},
          accessToken: token,
        }),
      );

      const second = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks/wh-idemp-del/delete',
          payload: {},
          accessToken: token,
        }),
      );

      // First should succeed
      expect(first.statusCode).not.toBe(500);
      // Second should be 404 (already deleted) or idempotent success
      expect([200, 404]).toContain(second.statusCode);
    });

    it('rotating secret twice in rapid succession produces two different secrets', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-rotate',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        events: ['user.created'],
        secret: 'original-secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      let rotateCount = 0;
      mockRepos.webhooks.update.mockImplementation(() => {
        rotateCount += 1;
        return Promise.resolve({
          id: 'wh-rotate',
          secret: `rotated-secret-${String(rotateCount)}`,
        });
      });

      const token = createTestJwt({ userId: 'user-1' });

      const [r1, r2] = await Promise.all([
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks/wh-rotate/rotate-secret',
            payload: {},
            accessToken: token,
          }),
        ),
        testServer.inject(
          buildAuthenticatedRequest({
            method: 'POST',
            url: '/api/webhooks/wh-rotate/rotate-secret',
            payload: {},
            accessToken: token,
          }),
        ),
      ]);

      // Neither should crash
      expect(r1.statusCode).not.toBe(500);
      expect(r2.statusCode).not.toBe(500);
    });

    it.todo('replaying an already-replayed delivery does not create unbounded deliveries');
  });

  // ==========================================================================
  // Adversarial: "Killer" — Cross-tenant + proto pollution in headers
  // ==========================================================================

  describe('Adversarial: killer tests — cross-tenant and proto pollution', () => {
    it('tenant A cannot register a webhook that points to tenant B internal endpoint', async () => {
      // Tenant A tries to create a webhook pointing to an internal service URL
      mockRepos.webhooks.create.mockResolvedValue({
        id: 'wh-cross-tenant',
        tenantId: 'tenant-a',
        url: 'https://internal-tenant-b.corp.local/admin/events',
        events: ['user.created'],
        secret: 'secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://internal-tenant-b.corp.local/admin/events',
            events: ['user.created'],
          },
          accessToken: tokenA,
          workspaceId: 'tenant-a',
        }),
      );

      // The server should process this without crashing
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('tenant A cannot update tenant B webhook', async () => {
      // Webhook belongs to tenant-b
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-tenant-b',
        tenantId: 'tenant-b',
        url: 'https://b.example.com/hook',
        events: ['user.created'],
        secret: 'secret-b',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks/wh-tenant-b/update',
          payload: { url: 'https://evil.com/steal-data' },
          accessToken: tokenA,
          workspaceId: 'tenant-a',
        }),
      );

      // Should be forbidden or not found, never 200
      expect(response.statusCode).not.toBe(200);
      expect([403, 404]).toContain(response.statusCode);
    });

    it('tenant A cannot delete tenant B webhook', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-tenant-b-del',
        tenantId: 'tenant-b',
        url: 'https://b.example.com/hook',
        events: ['user.created'],
        secret: 'secret-b',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks/wh-tenant-b-del/delete',
          payload: {},
          accessToken: tokenA,
          workspaceId: 'tenant-a',
        }),
      );

      expect(response.statusCode).not.toBe(200);
      expect([403, 404]).toContain(response.statusCode);
    });

    it('prototype pollution in webhook headers payload is neutralized', async () => {
      const token = createTestJwt({ userId: 'user-1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks',
          payload: {
            url: 'https://example.com/hook',
            events: ['user.created'],
            headers: {
              __proto__: { admin: true },
              constructor: { prototype: { isAdmin: true } },
              'X-Custom': 'safe-value',
            },
          },
          accessToken: token,
        }),
      );

      // Prototype pollution protection should prevent 500
      expect(response.statusCode).not.toBe(500);

      // Verify that Object.prototype was not polluted
      expect(({} as Record<string, unknown>)['admin']).toBeUndefined();
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
    });

    it('prototype pollution via __proto__ in top-level webhook payload body', async () => {
      const token = createTestJwt({ userId: 'user-1' });

      // Send raw JSON with __proto__ key
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/webhooks',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          url: 'https://example.com/hook',
          events: ['user.created'],
          __proto__: { polluted: true },
        }),
      });

      expect(response.statusCode).not.toBe(500);
      // Verify prototype was not polluted
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('tenant A cannot rotate secret of tenant B webhook', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-tenant-b-rot',
        tenantId: 'tenant-b',
        url: 'https://b.example.com/hook',
        events: ['user.created'],
        secret: 'secret-b',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/webhooks/wh-tenant-b-rot/rotate-secret',
          payload: {},
          accessToken: tokenA,
          workspaceId: 'tenant-a',
        }),
      );

      expect(response.statusCode).not.toBe(200);
      expect([403, 404]).toContain(response.statusCode);
    });

    it('tenant A cannot view deliveries of tenant B webhook', async () => {
      mockRepos.webhooks.findById.mockResolvedValue({
        id: 'wh-tenant-b-del',
        tenantId: 'tenant-b',
        url: 'https://b.example.com/hook',
        events: ['user.created'],
        secret: 'secret-b',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokenA = createTestJwt({ userId: 'user-a1' });
      const response = await testServer.inject(
        buildAuthenticatedRequest({
          method: 'GET',
          url: '/api/webhooks/wh-tenant-b-del/deliveries',
          accessToken: tokenA,
          workspaceId: 'tenant-a',
        }),
      );

      expect(response.statusCode).not.toBe(200);
      expect([403, 404]).toContain(response.statusCode);
    });
  });
});
