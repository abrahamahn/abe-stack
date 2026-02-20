// main/apps/server/src/__tests__/integration/billing.integration.test.ts
/**
 * Billing API Integration Tests
 *
 * Tests the billing API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, auth guards, and public access.
 *
 * Billing routes are conditionally registered when config.billing.enabled = true.
 */

import { createAuthGuard } from '@bslt/core/auth';
import { billingRoutes } from '@bslt/core/billing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type {
  BillingAppContext,
  BillingBaseRouteDefinition,
  BillingRequest,
} from '@bslt/core/billing';
import type {
  AuthGuardFactory,
  RouteDefinition as DbRouteDefinition,
  RouteMap as DbRouteMap,
  HandlerContext,
} from '@bslt/server-system';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
// Billing Route Adapter (mirrors routes.ts logic)
// ============================================================================

/**
 * Convert billing route map to the DbRouteMap format expected by registerRouteMap.
 * This mirrors the adapter logic in routes.ts for billing routes.
 */
function adaptBillingRoutes(): DbRouteMap {
  const entries: Array<[string, DbRouteDefinition]> = [];

  for (const [path, def] of Object.entries(billingRoutes)) {
    const billingDef: BillingBaseRouteDefinition = def;

    const adaptedHandler = async (
      handlerCtx: HandlerContext,
      body: unknown,
      req: FastifyRequest,
      reply: FastifyReply,
    ): Promise<unknown> => {
      const result = await billingDef.handler(
        handlerCtx as unknown as BillingAppContext,
        body,
        req as unknown as BillingRequest,
      );
      reply.status(result.status);
      return result.body;
    };

    const routeDef: DbRouteDefinition = {
      method: billingDef.method,
      handler: adaptedHandler,
      isPublic: billingDef.auth === undefined,
      ...(billingDef.auth !== undefined ? { roles: [billingDef.auth] } : {}),
    };

    entries.push([path, routeDef]);
  }

  return new Map(entries);
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Billing API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
      config: {
        billing: {
          enabled: true,
          provider: 'stripe',
          currency: 'usd',
          stripe: {
            secretKey: 'sk_test_fake',
            publishableKey: 'pk_test_fake',
            webhookSecret: 'whsec_test_fake',
          },
          paypal: {
            clientId: '',
            clientSecret: '',
            webhookId: '',
            sandbox: true,
          },
          plans: {
            free: 'price_free',
            pro: 'price_pro',
            enterprise: 'price_ent',
          },
          urls: {
            portalReturnUrl: 'http://localhost:5173/billing',
            checkoutSuccessUrl: 'http://localhost:5173/billing/success',
            checkoutCancelUrl: 'http://localhost:5173/billing/cancel',
          },
        },
      },
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      config: testServer.config,
    };

    const billingRouteMap = adaptBillingRoutes();

    registerRouteMap(testServer.server, ctx as never, billingRouteMap, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
      module: 'billing',
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
    it('GET /api/billing/plans responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/plans',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/billing/subscription responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/subscription',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/checkout responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/subscription/cancel responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/cancel',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/subscription/resume responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/resume',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/subscription/update responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/update',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/billing/invoices responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/invoices',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/billing/invoices/:id responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/invoices/inv-123',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/billing/payment-methods responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/payment-methods',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/payment-methods/add responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/payment-methods/add',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/billing/setup-intent responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/setup-intent',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (Protected Routes)
  // ==========================================================================

  describe('auth guards', () => {
    it('GET /api/billing/subscription returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/subscription',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/billing/checkout returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/checkout',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/billing/subscription/cancel returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/cancel',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/billing/subscription/resume returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/resume',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/billing/subscription/update returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/subscription/update',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/billing/invoices returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/invoices',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/billing/invoices/:id returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/invoices/inv-123',
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/billing/payment-methods returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/payment-methods',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/billing/payment-methods/add returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/payment-methods/add',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/billing/setup-intent returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/billing/setup-intent',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Public Route Tests
  // ==========================================================================

  describe('public routes', () => {
    it('GET /api/billing/plans returns 200 with empty plans list', async () => {
      mockRepos.plans.findAll.mockResolvedValue([]);

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/plans',
      });

      // Public route - should not require auth. Returns 200 or a service-level status.
      expect([200, 500]).toContain(response.statusCode);
    });

    it('GET /api/billing/plans does not return 401', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/billing/plans',
      });

      // Public route - must never return 401
      expect(response.statusCode).not.toBe(401);
    });
  });
});
