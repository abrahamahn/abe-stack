// apps/server/src/modules/billing/handlers.test.ts
/**
 * Billing Handlers Unit Tests
 *
 * Tests the thin HTTP layer for billing operations.
 * Mocks all service dependencies and verifies response formatting.
 */

import {
  BillingProviderNotConfiguredError,
  BillingSubscriptionExistsError,
  BillingSubscriptionNotFoundError,
  CannotRemoveDefaultPaymentMethodError,
  CustomerNotFoundError,
  PaymentMethodNotFoundError,
  PlanNotActiveError,
  PlanNotFoundError,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
} from '@abe-stack/core';
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
import * as billingService from './service';

import type { BillingService } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '../../shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

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

// Create hoisted mock for billing provider
const { mockBillingProvider } = vi.hoisted(() => {
  return {
    mockBillingProvider: {
      provider: 'stripe' as const,
      createCustomer: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      resumeSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      createSetupIntent: vi.fn(),
      attachPaymentMethod: vi.fn(),
      detachPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      listPaymentMethods: vi.fn(),
    },
  };
});

vi.mock('@/infrastructure/billing', () => ({
  createBillingProvider: vi.fn(() => mockBillingProvider),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {
      plans: {} as AppContext['repos']['plans'],
      subscriptions: {} as AppContext['repos']['subscriptions'],
      customerMappings: {} as AppContext['repos']['customerMappings'],
      invoices: {} as AppContext['repos']['invoices'],
      paymentMethods: {} as AppContext['repos']['paymentMethods'],
    } as AppContext['repos'],
    config: {
      billing: {
        enabled: true,
        provider: 'stripe' as const,
        urls: {
          checkoutSuccessUrl: 'http://localhost:3000/billing/success',
          checkoutCancelUrl: 'http://localhost:3000/billing/cancel',
        },
      },
    } as AppContext['config'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    email: {} as AppContext['email'],
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    cache: {} as AppContext['cache'],
    billing: {} as BillingService,
    notifications: {} as AppContext['notifications'],
    queue: {} as AppContext['queue'],
    write: {} as AppContext['write'],
    search: {} as AppContext['search'],
    ...overrides,
  } as unknown as AppContext;
}

function createMockRequest(overrides?: Partial<RequestWithCookies>): RequestWithCookies {
  return {
    user: {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
      sessionId: 'session-123',
    },
    cookies: {},
    headers: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...overrides,
  } as RequestWithCookies;
}

function createMockPlan() {
  return {
    id: 'plan-123',
    name: 'Pro Plan',
    description: 'Professional plan',
    interval: 'month' as const,
    priceInCents: 1999,
    currency: 'usd',
    features: [{ name: 'Feature 1', included: true }],
    trialDays: 14,
    isActive: true,
    sortOrder: 1,
    stripePriceId: 'price_123',
    stripeProductId: 'prod_123',
    paypalPlanId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

function createMockSubscription() {
  const plan = createMockPlan();
  return {
    id: 'sub-123',
    userId: 'user-123',
    planId: 'plan-123',
    provider: 'stripe' as const,
    providerSubscriptionId: 'sub_stripe_123',
    providerCustomerId: 'cus_stripe_123',
    status: 'active' as const,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    metadata: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    plan,
  };
}

function createMockInvoice() {
  return {
    id: 'inv-123',
    userId: 'user-123',
    subscriptionId: 'sub-123',
    provider: 'stripe' as const,
    providerInvoiceId: 'in_stripe_123',
    status: 'paid' as const,
    amountDue: 1999,
    amountPaid: 1999,
    currency: 'usd',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-02-01'),
    paidAt: new Date('2026-01-01'),
    invoicePdfUrl: 'https://example.com/invoice.pdf',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

function createMockPaymentMethod() {
  return {
    id: 'pm-123',
    userId: 'user-123',
    provider: 'stripe' as const,
    providerPaymentMethodId: 'pm_stripe_123',
    type: 'card' as const,
    isDefault: true,
    cardDetails: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2027,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

// ============================================================================
// Tests: handleListPlans
// ============================================================================

describe('handleListPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with list of active plans', async () => {
    const ctx = createMockContext();
    const mockPlans = [createMockPlan(), { ...createMockPlan(), id: 'plan-456' }];

    vi.mocked(billingService.getActivePlans).mockResolvedValue(mockPlans);

    const result = await handleListPlans(ctx);

    expect(result.status).toBe(200);
    expect(result.body.plans).toHaveLength(2);
    expect(result.body.plans[0].id).toBe('plan-123');
    expect(result.body.plans[0].priceInCents).toBe(1999);
    expect(billingService.getActivePlans).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no active plans exist', async () => {
    const ctx = createMockContext();

    vi.mocked(billingService.getActivePlans).mockResolvedValue([]);

    const result = await handleListPlans(ctx);

    expect(result.status).toBe(200);
    expect(result.body.plans).toEqual([]);
  });
});

// ============================================================================
// Tests: handleGetSubscription
// ============================================================================

describe('handleGetSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 200 with subscription when user has active subscription', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockSubscription = createMockSubscription();

    vi.mocked(billingService.getUserSubscription).mockResolvedValue(mockSubscription);

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.subscription).toBeDefined();
    expect(result.body.subscription?.id).toBe('sub-123');
    expect(result.body.subscription?.status).toBe('active');
    expect(result.body.subscription?.plan.name).toBe('Pro Plan');
    expect(billingService.getUserSubscription).toHaveBeenCalledWith(expect.anything(), 'user-123');
  });

  it('should return 200 with null subscription when user has no subscription', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserSubscription).mockResolvedValue(null);

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.subscription).toBeNull();
  });

  it('should return 404 when subscription not found error is thrown', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserSubscription).mockRejectedValue(
      new BillingSubscriptionNotFoundError(),
    );

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Subscription');
  });

  it('should return 500 and log error for unknown errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserSubscription).mockRejectedValue(new Error('Database error'));

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('An error occurred processing your request');
    expect(ctx.log.error).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Tests: handleCreateCheckout
// ============================================================================

describe('handleCreateCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-123' };
    const request = createMockRequest({ user: undefined });

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const body = { planId: 'plan-123' };
    const request = createMockRequest();

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 with checkout session on success', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-123' };
    const request = createMockRequest();
    const mockSession = {
      sessionId: 'cs-123',
      url: 'https://checkout.stripe.com/cs-123',
    };

    vi.mocked(billingService.createCheckoutSession).mockResolvedValue(mockSession);

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.sessionId).toBe('cs-123');
    expect(result.body.url).toContain('checkout.stripe.com');
    expect(billingService.createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        userId: 'user-123',
        email: 'user@example.com',
        planId: 'plan-123',
      }),
    );
  });

  it('should use custom success and cancel URLs when provided', async () => {
    const ctx = createMockContext();
    const body = {
      planId: 'plan-123',
      successUrl: 'https://custom.com/success',
      cancelUrl: 'https://custom.com/cancel',
    };
    const request = createMockRequest();
    const mockSession = { sessionId: 'cs-123', url: 'https://checkout.com' };

    vi.mocked(billingService.createCheckoutSession).mockResolvedValue(mockSession);

    await handleCreateCheckout(ctx, body, request);

    expect(billingService.createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel',
      }),
    );
  });

  it('should use default URLs when empty strings provided', async () => {
    const ctx = createMockContext();
    const body = {
      planId: 'plan-123',
      successUrl: '',
      cancelUrl: '',
    };
    const request = createMockRequest();
    const mockSession = { sessionId: 'cs-123', url: 'https://checkout.com' };

    vi.mocked(billingService.createCheckoutSession).mockResolvedValue(mockSession);

    await handleCreateCheckout(ctx, body, request);

    expect(billingService.createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        successUrl: 'http://localhost:3000/billing/success',
        cancelUrl: 'http://localhost:3000/billing/cancel',
      }),
    );
  });

  it('should return 404 when plan not found', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-999' };
    const request = createMockRequest();

    vi.mocked(billingService.createCheckoutSession).mockRejectedValue(
      new PlanNotFoundError('plan-999'),
    );

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('plan');
  });

  it('should return 400 when plan is not active', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-123' };
    const request = createMockRequest();

    vi.mocked(billingService.createCheckoutSession).mockRejectedValue(
      new PlanNotActiveError('plan-123'),
    );

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(400);
    expect(result.body.message).toContain('active');
  });

  it('should return 409 when user already has subscription', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-123' };
    const request = createMockRequest();

    vi.mocked(billingService.createCheckoutSession).mockRejectedValue(
      new BillingSubscriptionExistsError(),
    );

    const result = await handleCreateCheckout(ctx, body, request);

    expect(result.status).toBe(409);
    expect(result.body.message).toContain('subscription');
  });
});

// ============================================================================
// Tests: handleCancelSubscription
// ============================================================================

describe('handleCancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const body = { immediately: false };
    const request = createMockRequest({ user: undefined });

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const body = { immediately: false };
    const request = createMockRequest();

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 when canceling at period end', async () => {
    const ctx = createMockContext();
    const body = { immediately: false };
    const request = createMockRequest();

    vi.mocked(billingService.cancelSubscription).mockResolvedValue(undefined);

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toContain('end of the billing period');
    expect(billingService.cancelSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      false,
    );
  });

  it('should return 200 when canceling immediately', async () => {
    const ctx = createMockContext();
    const body = { immediately: true };
    const request = createMockRequest();

    vi.mocked(billingService.cancelSubscription).mockResolvedValue(undefined);

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toContain('canceled immediately');
    expect(billingService.cancelSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      true,
    );
  });

  it('should return 404 when subscription not found', async () => {
    const ctx = createMockContext();
    const body = { immediately: false };
    const request = createMockRequest();

    vi.mocked(billingService.cancelSubscription).mockRejectedValue(
      new BillingSubscriptionNotFoundError(),
    );

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Subscription');
  });

  it('should return 400 when subscription is already canceled', async () => {
    const ctx = createMockContext();
    const body = { immediately: false };
    const request = createMockRequest();

    vi.mocked(billingService.cancelSubscription).mockRejectedValue(
      new SubscriptionAlreadyCanceledError(),
    );

    const result = await handleCancelSubscription(ctx, body, request);

    expect(result.status).toBe(400);
    expect(result.body.message).toContain('canceled');
  });
});

// ============================================================================
// Tests: handleResumeSubscription
// ============================================================================

describe('handleResumeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const request = createMockRequest();

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 when subscription is resumed successfully', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.resumeSubscription).mockResolvedValue(undefined);

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('Subscription resumed');
    expect(billingService.resumeSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
    );
  });

  it('should return 404 when subscription not found', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.resumeSubscription).mockRejectedValue(
      new BillingSubscriptionNotFoundError(),
    );

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Subscription');
  });

  it('should return 400 when subscription is not canceling', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.resumeSubscription).mockRejectedValue(
      new SubscriptionNotCancelingError(),
    );

    const result = await handleResumeSubscription(ctx, request);

    expect(result.status).toBe(400);
    expect(result.body.message).toContain('cancell');
  });
});

// ============================================================================
// Tests: handleUpdateSubscription
// ============================================================================

describe('handleUpdateSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-456' };
    const request = createMockRequest({ user: undefined });

    const result = await handleUpdateSubscription(ctx, body, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const body = { planId: 'plan-456' };
    const request = createMockRequest();

    const result = await handleUpdateSubscription(ctx, body, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 when subscription is updated successfully', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-456' };
    const request = createMockRequest();

    vi.mocked(billingService.updateSubscription).mockResolvedValue(undefined);

    const result = await handleUpdateSubscription(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('Subscription updated');
    expect(billingService.updateSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      'plan-456',
    );
  });

  it('should return 404 when new plan not found', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-999' };
    const request = createMockRequest();

    vi.mocked(billingService.updateSubscription).mockRejectedValue(
      new PlanNotFoundError('plan-999'),
    );

    const result = await handleUpdateSubscription(ctx, body, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('plan');
  });

  it('should return 400 when subscription is not active', async () => {
    const ctx = createMockContext();
    const body = { planId: 'plan-456' };
    const request = createMockRequest();

    vi.mocked(billingService.updateSubscription).mockRejectedValue(
      new SubscriptionNotActiveError(),
    );

    const result = await handleUpdateSubscription(ctx, body, request);

    expect(result.status).toBe(400);
    expect(result.body.message).toContain('active');
  });
});

// ============================================================================
// Tests: handleListInvoices
// ============================================================================

describe('handleListInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 200 with list of invoices', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockInvoices = [createMockInvoice(), { ...createMockInvoice(), id: 'inv-456' }];

    vi.mocked(billingService.getUserInvoices).mockResolvedValue({
      invoices: mockInvoices,
      hasMore: false,
    });

    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.invoices).toHaveLength(2);
    expect(result.body.invoices[0].id).toBe('inv-123');
    expect(result.body.invoices[0].status).toBe('paid');
    expect(result.body.hasMore).toBe(false);
    expect(billingService.getUserInvoices).toHaveBeenCalledWith(expect.anything(), 'user-123');
  });

  it('should return 200 with empty array when no invoices exist', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserInvoices).mockResolvedValue({
      invoices: [],
      hasMore: false,
    });

    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.invoices).toEqual([]);
    expect(result.body.hasMore).toBe(false);
  });

  it('should return hasMore flag when more invoices exist', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockInvoices = [createMockInvoice()];

    vi.mocked(billingService.getUserInvoices).mockResolvedValue({
      invoices: mockInvoices,
      hasMore: true,
    });

    const result = await handleListInvoices(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.hasMore).toBe(true);
  });
});

// ============================================================================
// Tests: handleListPaymentMethods
// ============================================================================

describe('handleListPaymentMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleListPaymentMethods(ctx, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 200 with list of payment methods', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockPaymentMethods = [
      createMockPaymentMethod(),
      { ...createMockPaymentMethod(), id: 'pm-456', isDefault: false },
    ];

    vi.mocked(billingService.getUserPaymentMethods).mockResolvedValue(mockPaymentMethods);

    const result = await handleListPaymentMethods(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.paymentMethods).toHaveLength(2);
    expect(result.body.paymentMethods[0].id).toBe('pm-123');
    expect(result.body.paymentMethods[0].type).toBe('card');
    expect(result.body.paymentMethods[0].cardDetails?.last4).toBe('4242');
    expect(billingService.getUserPaymentMethods).toHaveBeenCalledWith(expect.anything(), 'user-123');
  });

  it('should return 200 with empty array when no payment methods exist', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserPaymentMethods).mockResolvedValue([]);

    const result = await handleListPaymentMethods(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.paymentMethods).toEqual([]);
  });
});

// ============================================================================
// Tests: handleAddPaymentMethod
// ============================================================================

describe('handleAddPaymentMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const body = { paymentMethodId: 'pm-stripe-123' };
    const request = createMockRequest({ user: undefined });

    const result = await handleAddPaymentMethod(ctx, body, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const body = { paymentMethodId: 'pm-stripe-123' };
    const request = createMockRequest();

    const result = await handleAddPaymentMethod(ctx, body, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 with payment method when added successfully', async () => {
    const ctx = createMockContext();
    const body = { paymentMethodId: 'pm-stripe-123' };
    const request = createMockRequest();
    const mockPaymentMethod = createMockPaymentMethod();

    vi.mocked(billingService.addPaymentMethod).mockResolvedValue(mockPaymentMethod);

    const result = await handleAddPaymentMethod(ctx, body, request);

    expect(result.status).toBe(200);
    expect(result.body.paymentMethod.id).toBe('pm-123');
    expect(result.body.paymentMethod.type).toBe('card');
    expect(billingService.addPaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      'user@example.com',
      'pm-stripe-123',
    );
  });

  it('should return 404 when payment method not found in provider', async () => {
    const ctx = createMockContext();
    const body = { paymentMethodId: 'pm-invalid' };
    const request = createMockRequest();

    vi.mocked(billingService.addPaymentMethod).mockRejectedValue(
      new PaymentMethodNotFoundError('pm-invalid'),
    );

    const result = await handleAddPaymentMethod(ctx, body, request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Payment method');
  });
});

// ============================================================================
// Tests: handleRemovePaymentMethod
// ============================================================================

describe('handleRemovePaymentMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleRemovePaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const request = createMockRequest();

    const result = await handleRemovePaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 when payment method is removed successfully', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.removePaymentMethod).mockResolvedValue(undefined);

    const result = await handleRemovePaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('Payment method removed');
    expect(billingService.removePaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      'pm-123',
    );
  });

  it('should return 404 when payment method not found', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.removePaymentMethod).mockRejectedValue(
      new PaymentMethodNotFoundError('pm-999'),
    );

    const result = await handleRemovePaymentMethod(ctx, 'pm-999', request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Payment method');
  });

  it('should return 400 when trying to remove default payment method with active subscription', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.removePaymentMethod).mockRejectedValue(
      new CannotRemoveDefaultPaymentMethodError(),
    );

    const result = await handleRemovePaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(400);
    expect(result.body.message).toContain('default');
  });
});

// ============================================================================
// Tests: handleSetDefaultPaymentMethod
// ============================================================================

describe('handleSetDefaultPaymentMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const request = createMockRequest();

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 with updated payment method when set as default successfully', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockPaymentMethod = createMockPaymentMethod();

    vi.mocked(billingService.setDefaultPaymentMethod).mockResolvedValue(mockPaymentMethod);

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(200);
    expect(result.body.paymentMethod.id).toBe('pm-123');
    expect(result.body.paymentMethod.isDefault).toBe(true);
    expect(billingService.setDefaultPaymentMethod).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      'pm-123',
    );
  });

  it('should return 404 when payment method not found', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.setDefaultPaymentMethod).mockRejectedValue(
      new PaymentMethodNotFoundError('pm-999'),
    );

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-999', request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('Payment method');
  });

  it('should return 404 when customer not found', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.setDefaultPaymentMethod).mockRejectedValue(
      new CustomerNotFoundError('user-123'),
    );

    const result = await handleSetDefaultPaymentMethod(ctx, 'pm-123', request);

    expect(result.status).toBe(404);
    expect(result.body.message).toContain('customer');
  });
});

// ============================================================================
// Tests: handleCreateSetupIntent
// ============================================================================

describe('handleCreateSetupIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ user: undefined });

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(401);
    expect(result.body.message).toBe('Unauthorized');
  });

  it('should return 500 when billing is not enabled', async () => {
    const ctx = createMockContext({
      config: { billing: { enabled: false } } as AppContext['config'],
    });
    const request = createMockRequest();

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing is not enabled');
  });

  it('should return 200 with setup intent client secret on success', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const mockSetupIntent = { clientSecret: 'seti_123_secret_456' };

    vi.mocked(billingService.createSetupIntent).mockResolvedValue(mockSetupIntent);

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(200);
    expect(result.body.clientSecret).toBe('seti_123_secret_456');
    expect(billingService.createSetupIntent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'user-123',
      'user@example.com',
    );
  });

  it('should return 500 when provider is not configured', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.createSetupIntent).mockRejectedValue(
      new BillingProviderNotConfiguredError('stripe'),
    );

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing service is not configured');
  });
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

describe('error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle non-Error thrown values', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.getUserSubscription).mockRejectedValue('string error');

    const result = await handleGetSubscription(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('An error occurred processing your request');
    expect(ctx.log.error).toHaveBeenCalledTimes(1);
  });

  it('should map BillingProviderNotConfiguredError to 500', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    vi.mocked(billingService.createSetupIntent).mockRejectedValue(
      new BillingProviderNotConfiguredError('stripe'),
    );

    const result = await handleCreateSetupIntent(ctx, request);

    expect(result.status).toBe(500);
    expect(result.body.message).toBe('Billing service is not configured');
  });

  it('should map multiple error types to 400', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    const errors = [
      new PlanNotActiveError('plan-123'),
      new SubscriptionAlreadyCanceledError(),
      new SubscriptionNotCancelingError(),
      new SubscriptionNotActiveError(),
      new CannotRemoveDefaultPaymentMethodError(),
    ];

    for (const error of errors) {
      vi.mocked(billingService.getUserSubscription).mockRejectedValue(error);

      const result = await handleGetSubscription(ctx, request);

      expect(result.status).toBe(400);
    }
  });

  it('should map multiple error types to 404', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();

    const errors = [
      new PlanNotFoundError('plan-123'),
      new BillingSubscriptionNotFoundError(),
      new PaymentMethodNotFoundError('pm-123'),
      new CustomerNotFoundError('user-123'),
    ];

    for (const error of errors) {
      vi.mocked(billingService.getUserSubscription).mockRejectedValue(error);

      const result = await handleGetSubscription(ctx, request);

      expect(result.status).toBe(404);
    }
  });
});
