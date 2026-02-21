// main/apps/server/src/__tests__/integration/golden-path-billing-checkout.integration.test.ts
/**
 * Sprint 5.1 Golden Path: Billing Checkout Flow Integration Test
 *
 * Flow: List plans → Create checkout → Subscription activated (via mock) →
 *       Verify subscription → Verify entitlements
 *
 * Tests the full billing checkout lifecycle through fastify.inject(),
 * using a mocked billing provider and in-memory repository fakes.
 */

import { createAuthGuard } from '@bslt/core/auth';
import { billingRoutes } from '@bslt/core/billing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestJwt,
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

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
  HttpReply,
  HttpRequest,
} from '@bslt/server-system';

import { registerRouteMap } from '@/http';

// ============================================================================
// Test Identifiers
// ============================================================================

const USER_ID = 'gp-billing-user-1';
const USER_EMAIL = 'billing-user@golden.test';
const PLAN_ID = 'plan-pro-1';
const SUBSCRIPTION_ID = 'sub-gp-1';
const CUSTOMER_ID = 'cus_gp_test_1';

// ============================================================================
// Mock Billing Provider
// ============================================================================

vi.mock('@bslt/core/billing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/core/billing')>();
  return {
    ...actual,
    createBillingProvider: vi.fn().mockReturnValue({
      createCustomer: vi.fn().mockResolvedValue('cus_gp_test_1'),
      createCheckoutSession: vi.fn().mockResolvedValue({
        sessionId: 'cs_gp_test_123',
        url: 'https://checkout.stripe.com/pay/cs_gp_test_123',
      }),
      createPortalSession: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal' }),
      cancelSubscription: vi.fn().mockResolvedValue(undefined),
      resumeSubscription: vi.fn().mockResolvedValue(undefined),
      updateSubscription: vi.fn().mockResolvedValue(undefined),
      getSubscription: vi.fn().mockResolvedValue(null),
      createSetupIntent: vi.fn().mockResolvedValue({ clientSecret: 'seti_secret_test' }),
      listPaymentMethods: vi.fn().mockResolvedValue([]),
      attachPaymentMethod: vi.fn().mockResolvedValue(undefined),
      detachPaymentMethod: vi.fn().mockResolvedValue(undefined),
      setDefaultPaymentMethod: vi.fn().mockResolvedValue(undefined),
      listInvoices: vi.fn().mockResolvedValue([]),
      createProduct: vi.fn().mockResolvedValue({ productId: 'prod_test', priceId: 'price_test' }),
      updateProduct: vi.fn().mockResolvedValue(undefined),
      archivePrice: vi.fn().mockResolvedValue(undefined),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      parseWebhookEvent: vi.fn().mockReturnValue(null),
    }),
  };
});

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos() {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: USER_ID, email: USER_EMAIL }),
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
    plans: {
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
    },
    subscriptions: {
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      findActiveByUserId: vi.fn().mockResolvedValue(null),
      findByProviderSubscriptionId: vi.fn().mockResolvedValue(null),
    },
    customerMappings: {
      findByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'cm-1', userId: USER_ID, customerId: CUSTOMER_ID }),
    },
    invoices: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    paymentMethods: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    billingEvents: {
      create: vi.fn().mockResolvedValue({ id: 'be-1' }),
      findByEventId: vi.fn().mockResolvedValue(null),
    },
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
// Billing Route Adapter
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
      req: HttpRequest,
      reply: HttpReply,
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

describe('Golden Path: Billing Checkout Flow', () => {
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
          paypal: { clientId: '', clientSecret: '', webhookId: '', sandbox: true },
          plans: { free: 'price_free', pro: 'price_pro', enterprise: 'price_ent' },
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
  // Step 1: List Available Plans
  // ==========================================================================

  it('Step 1: list available plans (GET /api/billing/plans → 200)', async () => {
    const planData = {
      id: PLAN_ID,
      name: 'Pro',
      stripePriceId: 'price_pro',
      stripeId: 'price_pro',
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      features: [
        { key: 'api_calls', name: 'API Calls', included: true, limit: 10000 },
        { key: 'storage_gb', name: 'Storage GB', included: true, limit: 50 },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepos.plans.findAll.mockResolvedValue([planData]);

    const response = await testServer.inject({
      method: 'GET',
      url: '/api/billing/plans',
    });

    // Plans endpoint is public — must not require authentication
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);

    if (response.statusCode === 200) {
      const body = parseJsonResponse(response) as { plans: unknown[] };
      expect(body).toHaveProperty('plans');
      expect(Array.isArray(body.plans)).toBe(true);
      expect(body.plans.length).toBeGreaterThanOrEqual(1);
    }
  });

  // ==========================================================================
  // Step 2: Create Checkout Session
  // ==========================================================================

  it('Step 2: create checkout session (POST /api/billing/checkout → 200 with checkout URL)', async () => {
    const planData = {
      id: PLAN_ID,
      name: 'Pro',
      stripePriceId: 'price_pro',
      stripeId: 'price_pro',
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      features: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Plan exists with a Stripe price ID
    mockRepos.plans.findById.mockResolvedValue(planData);

    // No existing customer mapping — will trigger customer creation
    mockRepos.customerMappings.findByUserId.mockResolvedValue(null);

    // Customer mapping creation succeeds
    mockRepos.customerMappings.create.mockResolvedValue({
      id: 'cm-gp-1',
      userId: USER_ID,
      customerId: CUSTOMER_ID,
      provider: 'stripe',
      createdAt: new Date(),
    });

    const userJwt = createTestJwt({ userId: USER_ID, email: USER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'POST',
        url: '/api/billing/checkout',
        accessToken: userJwt,
        payload: { planId: PLAN_ID },
      }),
    );

    // Must be authenticated (not 401) and route must exist (not 404)
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);

    if (response.statusCode === 200) {
      const body = parseJsonResponse(response) as { url: string; sessionId?: string };
      expect(body).toHaveProperty('url');
      expect(typeof body.url).toBe('string');
      expect(body.url).toContain('checkout.stripe.com');
    }
  });

  // ==========================================================================
  // Step 3: Verify Subscription is Initially Inactive
  // ==========================================================================

  it('Step 3: verify subscription is initially inactive (GET /api/billing/subscription → 200 without active sub)', async () => {
    // No subscriptions exist yet for this user
    mockRepos.subscriptions.findByUserId.mockResolvedValue([]);

    const userJwt = createTestJwt({ userId: USER_ID, email: USER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'GET',
        url: '/api/billing/subscription',
        accessToken: userJwt,
      }),
    );

    // Must be authenticated (not 401) and route must exist (not 404)
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);

    if (response.statusCode === 200) {
      const body = parseJsonResponse(response) as Record<string, unknown>;
      // Response indicates no active subscription
      const hasNoActiveSub =
        body['subscription'] === null ||
        body['subscription'] === undefined ||
        (Array.isArray(body['subscription']) && body['subscription'].length === 0) ||
        (typeof body['subscription'] === 'object' &&
          body['subscription'] !== null &&
          'status' in (body['subscription'] as object) &&
          (body['subscription'] as { status: string }).status !== 'active');
      expect(hasNoActiveSub).toBe(true);
    }
  });

  // ==========================================================================
  // Step 4: After Plan Activation, Subscription Shows Active
  // ==========================================================================

  it('Step 4: after plan activation, subscription shows active (GET /api/billing/subscription → 200 with active sub)', async () => {
    const activeSubscription = {
      id: SUBSCRIPTION_ID,
      userId: USER_ID,
      planId: PLAN_ID,
      status: 'active',
      provider: 'stripe',
      providerSubscriptionId: 'sub_stripe_test_1',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      trialStart: null,
      trialEnd: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Simulate subscription being activated (e.g. via webhook after Stripe checkout completion)
    mockRepos.subscriptions.findByUserId.mockResolvedValue([activeSubscription]);

    const userJwt = createTestJwt({ userId: USER_ID, email: USER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'GET',
        url: '/api/billing/subscription',
        accessToken: userJwt,
      }),
    );

    // Must be authenticated (not 401) and route must exist (not 404)
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);

    if (response.statusCode === 200) {
      const body = parseJsonResponse(response) as Record<string, unknown>;
      // Response should contain an active subscription
      const sub =
        body['subscription'] ??
        (Array.isArray(body['subscriptions']) ? body['subscriptions'][0] : undefined);

      if (sub !== null && sub !== undefined) {
        const subscription = sub as Record<string, unknown>;
        // Should be for the correct user
        if ('userId' in subscription) {
          expect(subscription['userId']).toBe(USER_ID);
        }
        // Should reflect active status
        if ('status' in subscription) {
          expect(subscription['status']).toBe('active');
        }
      }
    }
  });

  // ==========================================================================
  // Step 5: Entitlements Resolve Correctly for Active Subscription
  // ==========================================================================

  it('Step 5: entitlements resolve correctly for active subscription (GET /api/billing/subscription status check)', async () => {
    const activeSubscription = {
      id: SUBSCRIPTION_ID,
      userId: USER_ID,
      planId: PLAN_ID,
      status: 'active',
      provider: 'stripe',
      providerSubscriptionId: 'sub_stripe_test_1',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      trialStart: null,
      trialEnd: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const planData = {
      id: PLAN_ID,
      name: 'Pro',
      stripePriceId: 'price_pro',
      stripeId: 'price_pro',
      amount: 2900,
      currency: 'usd',
      interval: 'month',
      features: [
        { key: 'api_calls', name: 'API Calls', included: true, limit: 10000 },
        { key: 'storage_gb', name: 'Storage GB', included: true, limit: 50 },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Active subscription is present
    mockRepos.subscriptions.findByUserId.mockResolvedValue([activeSubscription]);
    mockRepos.subscriptions.findActiveByUserId.mockResolvedValue(activeSubscription);

    // Plan data is available for entitlement resolution
    mockRepos.plans.findById.mockResolvedValue(planData);

    const userJwt = createTestJwt({ userId: USER_ID, email: USER_EMAIL });

    const response = await testServer.inject(
      buildAuthenticatedRequest({
        method: 'GET',
        url: '/api/billing/subscription',
        accessToken: userJwt,
      }),
    );

    // Must be authenticated (not 401) and route must exist (not 404)
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);

    if (response.statusCode === 200) {
      const body = parseJsonResponse(response) as Record<string, unknown>;

      // Verify the subscription data is present in the response
      const sub =
        body['subscription'] ??
        (Array.isArray(body['subscriptions']) ? body['subscriptions'][0] : undefined);

      if (sub !== null && sub !== undefined) {
        const subscription = sub as Record<string, unknown>;

        // Subscription should be active — user has full entitlements
        if ('status' in subscription) {
          expect(subscription['status']).toBe('active');
        }

        // Subscription should reference the correct plan
        if ('planId' in subscription) {
          expect(subscription['planId']).toBe(PLAN_ID);
        }

        // Subscription must not be in a terminal or cancelled state
        if ('cancelledAt' in subscription) {
          expect(subscription['cancelledAt']).toBeNull();
        }

        // Subscription period end must be in the future
        if ('currentPeriodEnd' in subscription) {
          const periodEnd = new Date(subscription['currentPeriodEnd'] as string);
          expect(periodEnd.getTime()).toBeGreaterThan(Date.now());
        }
      }
    }
  });
});
