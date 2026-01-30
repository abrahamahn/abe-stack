// packages/billing/src/handlers.test.ts
/**
 * Billing Handlers Unit Tests
 *
 * Tests for all billing HTTP handler functions including plan listing,
 * subscription management, checkout, invoices, and payment methods.
 * All service and factory dependencies are mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleAddPaymentMethod,
  handleCancelSubscription,
  handleCreateCheckout,
  handleCreateSetupIntent,
  handleGetSubscription,
  handleListInvoices,
  handleListPaymentMethods,
  handleListPlans,
  handleRemovePaymentMethod,
  handleResumeSubscription,
  handleSetDefaultPaymentMethod,
  handleUpdateSubscription,
} from './handlers';

import type { BillingAppContext, BillingRequest } from './types';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('./factory', () => ({
  createBillingProvider: vi.fn().mockReturnValue({
    provider: 'stripe',
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    createSetupIntent: vi.fn(),
    listPaymentMethods: vi.fn(),
    attachPaymentMethod: vi.fn(),
    detachPaymentMethod: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
  }),
}));

vi.mock('./service', () => ({
  getActivePlans: vi.fn(),
  getUserSubscription: vi.fn(),
  createCheckoutSession: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getUserInvoices: vi.fn(),
  getUserPaymentMethods: vi.fn(),
  addPaymentMethod: vi.fn(),
  removePaymentMethod: vi.fn(),
  setDefaultPaymentMethod: vi.fn(),
  createSetupIntent: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock BillingAppContext for testing.
 *
 * @returns Mock context with billing config, repos, and logger
 * @complexity O(1)
 */
function createMockContext(): BillingAppContext {
  return {
    config: {
      billing: {
        enabled: true,
        provider: 'stripe',
        currency: 'usd',
        plans: [],
        stripe: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_123',
          webhookSecret: 'whsec_test_123',
        },
        paypal: {
          clientId: '',
          clientSecret: '',
          webhookId: '',
        },
        urls: {
          checkoutSuccessUrl: 'https://example.com/success',
          checkoutCancelUrl: 'https://example.com/cancel',
          portalReturnUrl: 'https://example.com/portal',
        },
      },
    },
    repos: {
      plans: { listActive: vi.fn(), findById: vi.fn() },
      subscriptions: { findActiveByUserId: vi.fn(), create: vi.fn(), update: vi.fn() },
      customerMappings: { getOrCreate: vi.fn(), findByUserIdAndProvider: vi.fn() },
      invoices: { findByUserId: vi.fn() },
      paymentMethods: {
        findByUserId: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        setAsDefault: vi.fn(),
      },
      billingEvents: { wasProcessed: vi.fn(), recordEvent: vi.fn() },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as BillingAppContext;
}

/**
 * Create a mock authenticated BillingRequest.
 *
 * @param userId - User ID for the authenticated user
 * @param email - Email for the authenticated user
 * @returns Mock request with user info
 * @complexity O(1)
 */
function createAuthenticatedRequest(userId = 'user-1', email = 'user@example.com'): BillingRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId, email, role: 'user' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  };
}

/**
 * Create a mock unauthenticated BillingRequest.
 *
 * @returns Mock request without user info
 * @complexity O(1)
 */
function createUnauthenticatedRequest(): BillingRequest {
  return {
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  };
}

// ============================================================================
// Tests: Plan Handlers
// ============================================================================

describe('handleListPlans', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 200 with active plans', async () => {
    const { getActivePlans } = await import('./service');
    vi.mocked(getActivePlans).mockResolvedValue([
      {
        id: 'plan-1',
        name: 'Basic',
        description: 'Basic plan',
        priceInCents: 999,
        currency: 'usd',
        interval: 'month' as const,
        trialDays: 0,
        isActive: true,
        features: [],
        sortOrder: 0,
        stripePriceId: 'price_1',
        stripeProductId: 'prod_1',
        paypalPlanId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await handleListPlans(ctx);

    expect(result.status).toBe(200);
    expect(result.body.plans).toHaveLength(1);
    expect(result.body.plans[0]?.name).toBe('Basic');
  });

  it('should return 200 with empty plans array', async () => {
    const { getActivePlans } = await import('./service');
    vi.mocked(getActivePlans).mockResolvedValue([]);

    const result = await handleListPlans(ctx);

    expect(result.status).toBe(200);
    expect(result.body.plans).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Subscription Handlers
// ============================================================================

describe('handleGetSubscription', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with subscription data', async () => {
    const { getUserSubscription } = await import('./service');
    const now = new Date();
    vi.mocked(getUserSubscription).mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      provider: 'stripe' as const,
      providerSubscriptionId: 'sub_stripe_123',
      providerCustomerId: 'cus_stripe_123',
      status: 'active' as const,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      plan: {
        id: 'plan-1',
        name: 'Pro',
        description: 'Pro plan',
        priceInCents: 2999,
        currency: 'usd',
        interval: 'month' as const,
        trialDays: 0,
        isActive: true,
        features: [],
        sortOrder: 0,
        stripePriceId: 'price_1',
        stripeProductId: 'prod_1',
        paypalPlanId: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    const request = createAuthenticatedRequest();
    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(200);
  });

  it('should return 200 with null subscription when user has none', async () => {
    const { getUserSubscription } = await import('./service');
    vi.mocked(getUserSubscription).mockResolvedValue(null);

    const request = createAuthenticatedRequest();
    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ subscription: null });
  });
});

describe('handleCreateCheckout', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(result.status).toBe(401);
  });

  it('should return 500 when billing is not enabled', async () => {
    ctx = {
      ...ctx,
      config: {
        billing: { ...ctx.config.billing, enabled: false },
      },
    } as unknown as BillingAppContext;
    const request = createAuthenticatedRequest();

    const result = await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Billing is not enabled' });
  });

  it('should return 200 with checkout session', async () => {
    const { createCheckoutSession } = await import('./service');
    vi.mocked(createCheckoutSession).mockResolvedValue({
      sessionId: 'session_123',
      url: 'https://checkout.stripe.com/session_123',
    });

    const request = createAuthenticatedRequest();
    const result = await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      sessionId: 'session_123',
      url: 'https://checkout.stripe.com/session_123',
    });
  });

  it('should use default URLs when not provided in body', async () => {
    const { createCheckoutSession } = await import('./service');
    vi.mocked(createCheckoutSession).mockResolvedValue({
      sessionId: 'session_123',
      url: 'https://checkout.stripe.com/session_123',
    });

    const request = createAuthenticatedRequest();
    await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    );
  });

  it('should use provided URLs when included in body', async () => {
    const { createCheckoutSession } = await import('./service');
    vi.mocked(createCheckoutSession).mockResolvedValue({
      sessionId: 'session_123',
      url: 'https://checkout.stripe.com/session_123',
    });

    const request = createAuthenticatedRequest();
    await handleCreateCheckout(
      ctx,
      {
        planId: 'plan-1',
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
      },
      request,
    );

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
      }),
    );
  });
});

describe('handleCancelSubscription', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleCancelSubscription(ctx, {}, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 on successful cancellation at period end', async () => {
    const { cancelSubscription } = await import('./service');
    vi.mocked(cancelSubscription).mockResolvedValue(undefined);

    const request = createAuthenticatedRequest();
    const result = await handleCancelSubscription(ctx, {}, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  });

  it('should return 200 on successful immediate cancellation', async () => {
    const { cancelSubscription } = await import('./service');
    vi.mocked(cancelSubscription).mockResolvedValue(undefined);

    const request = createAuthenticatedRequest();
    const result = await handleCancelSubscription(ctx, { immediately: true }, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Subscription canceled immediately',
    });
  });
});

describe('handleResumeSubscription', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 on successful resume', async () => {
    const { resumeSubscription } = await import('./service');
    vi.mocked(resumeSubscription).mockResolvedValue(undefined);

    const request = createAuthenticatedRequest();
    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Subscription resumed',
    });
  });
});

describe('handleUpdateSubscription', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleUpdateSubscription(ctx, { planId: 'plan-2' }, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 on successful update', async () => {
    const { updateSubscription } = await import('./service');
    vi.mocked(updateSubscription).mockResolvedValue(undefined);

    const request = createAuthenticatedRequest();
    const result = await handleUpdateSubscription(ctx, { planId: 'plan-2' }, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Subscription updated',
    });
  });
});

// ============================================================================
// Tests: Invoice Handlers
// ============================================================================

describe('handleListInvoices', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with invoices', async () => {
    const { getUserInvoices } = await import('./service');
    const now = new Date();
    vi.mocked(getUserInvoices).mockResolvedValue({
      invoices: [
        {
          id: 'inv-1',
          userId: 'user-1',
          subscriptionId: 'sub-1',
          provider: 'stripe',
          providerInvoiceId: 'in_1',
          status: 'paid' as const,
          amountDue: 2999,
          amountPaid: 2999,
          currency: 'usd',
          periodStart: now,
          periodEnd: now,
          paidAt: now,
          invoicePdfUrl: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      hasMore: false,
    });

    const request = createAuthenticatedRequest();
    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(200);
  });
});

// ============================================================================
// Tests: Payment Method Handlers
// ============================================================================

describe('handleListPaymentMethods', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleListPaymentMethods(ctx, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with payment methods', async () => {
    const { getUserPaymentMethods } = await import('./service');
    vi.mocked(getUserPaymentMethods).mockResolvedValue([
      {
        id: 'pm-1',
        userId: 'user-1',
        provider: 'stripe',
        providerPaymentMethodId: 'pm_stripe_1',
        type: 'card' as const,
        isDefault: true,
        cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = createAuthenticatedRequest();
    const result = await handleListPaymentMethods(ctx, request);

    expect(result.status).toBe(200);
  });
});

describe('handleAddPaymentMethod', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleAddPaymentMethod(ctx, { paymentMethodId: 'pm_123' }, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with created payment method', async () => {
    const { addPaymentMethod } = await import('./service');
    vi.mocked(addPaymentMethod).mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      provider: 'stripe',
      providerPaymentMethodId: 'pm_stripe_123',
      type: 'card' as const,
      isDefault: true,
      cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createAuthenticatedRequest();
    const result = await handleAddPaymentMethod(ctx, { paymentMethodId: 'pm_stripe_123' }, request);

    expect(result.status).toBe(200);
  });
});

describe('handleRemovePaymentMethod', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleRemovePaymentMethod(ctx, 'pm-1', request);

    expect(result.status).toBe(401);
  });

  it('should return 200 on successful removal', async () => {
    const { removePaymentMethod } = await import('./service');
    vi.mocked(removePaymentMethod).mockResolvedValue(undefined);

    const request = createAuthenticatedRequest();
    const result = await handleRemovePaymentMethod(ctx, 'pm-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      message: 'Payment method removed',
    });
  });
});

describe('handleSetDefaultPaymentMethod', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-1', request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with updated payment method', async () => {
    const { setDefaultPaymentMethod } = await import('./service');
    vi.mocked(setDefaultPaymentMethod).mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      provider: 'stripe',
      providerPaymentMethodId: 'pm_stripe_123',
      type: 'card' as const,
      isDefault: true,
      cardDetails: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2025 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = createAuthenticatedRequest();
    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-1', request);

    expect(result.status).toBe(200);
  });
});

describe('handleCreateSetupIntent', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 for unauthenticated request', async () => {
    const request = createUnauthenticatedRequest();

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(401);
  });

  it('should return 200 with client secret', async () => {
    const { createSetupIntent } = await import('./service');
    vi.mocked(createSetupIntent).mockResolvedValue({ clientSecret: 'seti_secret_123' });

    const request = createAuthenticatedRequest();
    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ clientSecret: 'seti_secret_123' });
  });
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

describe('error handling', () => {
  let ctx: BillingAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 404 for PlanNotFoundError', async () => {
    const { getUserSubscription } = await import('./service');
    const error = new Error('Plan not found');
    error.name = 'PlanNotFoundError';
    vi.mocked(getUserSubscription).mockRejectedValue(error);

    const request = createAuthenticatedRequest();
    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(404);
  });

  it('should return 409 for SubscriptionExistsError', async () => {
    const { createCheckoutSession } = await import('./service');
    const error = new Error('Subscription exists');
    error.name = 'SubscriptionExistsError';
    vi.mocked(createCheckoutSession).mockRejectedValue(error);

    const request = createAuthenticatedRequest();
    const result = await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(result.status).toBe(409);
  });

  it('should return 400 for PlanNotActiveError', async () => {
    const { createCheckoutSession } = await import('./service');
    const error = new Error('Plan not active');
    error.name = 'PlanNotActiveError';
    vi.mocked(createCheckoutSession).mockRejectedValue(error);

    const request = createAuthenticatedRequest();
    const result = await handleCreateCheckout(ctx, { planId: 'plan-1' }, request);

    expect(result.status).toBe(400);
  });

  it('should return 500 for unknown errors', async () => {
    const { getUserSubscription } = await import('./service');
    vi.mocked(getUserSubscription).mockRejectedValue(new Error('Unknown database error'));

    const request = createAuthenticatedRequest();
    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'An error occurred processing your request' });
  });
});
