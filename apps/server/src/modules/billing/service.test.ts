// apps/server/src/modules/billing/service.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/billing/service.test.ts
/**
 * Billing Service Unit Tests
 *
 * Comprehensive tests for all billing operations including plan management,
 * subscription lifecycle, invoice retrieval, and payment method handling.
 * All external dependencies (billing providers, repositories) are mocked.
 */

import {
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
  addPaymentMethod,
  cancelSubscription,
  createCheckoutSession,
  createSetupIntent,
  getActivePlans,
  getCustomerId,
  getPlanById,
  getUserInvoices,
  getUserPaymentMethods,
  getUserSubscription,
  removePaymentMethod,
  resumeSubscription,
  setDefaultPaymentMethod,
  updateSubscription,
  type BillingRepositories,
  type CheckoutSessionParams,
} from './service';

import type { BillingService } from '@abe-stack/core';
import type {
  CustomerMapping,
  Invoice,
  PaymentMethod,
  Plan,
  Subscription,
} from '@abe-stack/db';

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockBillingRepos(): BillingRepositories {
  return {
    plans: {
      listActive: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    customerMappings: {
      getOrCreate: vi.fn(),
      findByUserIdAndProvider: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoices: {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentMethods: {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      setAsDefault: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as BillingRepositories;
}

function createMockBillingProvider(): BillingService {
  return {
    provider: 'stripe',
    createCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    getSubscription: vi.fn(),
    createSetupIntent: vi.fn(),
    listPaymentMethods: vi.fn(),
    attachPaymentMethod: vi.fn(),
    detachPaymentMethod: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
    listInvoices: vi.fn(),
    getInvoice: vi.fn(),
  } as unknown as BillingService;
}

function createMockPlan(overrides?: Partial<Plan>): Plan {
  return {
    id: 'plan-1',
    name: 'Pro Plan',
    description: 'Professional plan',
    priceAmount: 2999,
    priceCurrency: 'USD',
    billingPeriod: 'month',
    trialDays: 14,
    isActive: true,
    stripePriceId: 'price_stripe_123',
    paypalPlanId: null,
    features: ['feature1', 'feature2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockSubscription(overrides?: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-1',
    provider: 'stripe',
    providerSubscriptionId: 'sub_stripe_123',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockCustomerMapping(overrides?: Partial<CustomerMapping>): CustomerMapping {
  return {
    id: 'mapping-1',
    userId: 'user-1',
    provider: 'stripe',
    providerCustomerId: 'cus_stripe_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: 'inv-1',
    userId: 'user-1',
    subscriptionId: 'sub-1',
    provider: 'stripe',
    providerInvoiceId: 'in_stripe_123',
    amountDue: 2999,
    amountPaid: 2999,
    currency: 'USD',
    status: 'paid',
    invoiceUrl: 'https://example.com/invoice',
    pdfUrl: 'https://example.com/invoice.pdf',
    periodStart: new Date(),
    periodEnd: new Date(),
    dueDate: null,
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockPaymentMethod(overrides?: Partial<PaymentMethod>): PaymentMethod {
  return {
    id: 'pm-1',
    userId: 'user-1',
    provider: 'stripe',
    providerPaymentMethodId: 'pm_stripe_123',
    type: 'card',
    isDefault: true,
    cardDetails: {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Tests: Plan Operations
// ============================================================================

describe('getActivePlans', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
  });

  it('should return all active plans', async () => {
    const plans = [
      createMockPlan({ id: 'plan-1', name: 'Basic' }),
      createMockPlan({ id: 'plan-2', name: 'Pro' }),
    ];
    vi.mocked(repos.plans.listActive).mockResolvedValue(plans);

    const result = await getActivePlans(repos);

    expect(result).toEqual(plans);
    expect(repos.plans.listActive).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no active plans', async () => {
    vi.mocked(repos.plans.listActive).mockResolvedValue([]);

    const result = await getActivePlans(repos);

    expect(result).toEqual([]);
    expect(repos.plans.listActive).toHaveBeenCalledTimes(1);
  });
});

describe('getPlanById', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
  });

  it('should return plan when found', async () => {
    const plan = createMockPlan();
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const result = await getPlanById(repos, 'plan-1');

    expect(result).toEqual(plan);
    expect(repos.plans.findById).toHaveBeenCalledWith('plan-1');
  });

  it('should return null when plan not found', async () => {
    vi.mocked(repos.plans.findById).mockResolvedValue(null);

    const result = await getPlanById(repos, 'nonexistent');

    expect(result).toBeNull();
    expect(repos.plans.findById).toHaveBeenCalledWith('nonexistent');
  });
});

// ============================================================================
// Tests: Subscription Operations
// ============================================================================

describe('getUserSubscription', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
  });

  it('should return subscription with plan for active user subscription', async () => {
    const subscription = createMockSubscription();
    const plan = createMockPlan();
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(plan);

    const result = await getUserSubscription(repos, 'user-1');

    expect(result).toEqual({ ...subscription, plan });
    expect(repos.subscriptions.findActiveByUserId).toHaveBeenCalledWith('user-1');
    expect(repos.plans.findById).toHaveBeenCalledWith(subscription.planId);
  });

  it('should return null when user has no subscription', async () => {
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    const result = await getUserSubscription(repos, 'user-1');

    expect(result).toBeNull();
    expect(repos.subscriptions.findActiveByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should return null when plan not found', async () => {
    const subscription = createMockSubscription();
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(null);

    const result = await getUserSubscription(repos, 'user-1');

    expect(result).toBeNull();
  });
});

describe('createCheckoutSession', () => {
  let repos: BillingRepositories;
  let provider: BillingService;
  let params: CheckoutSessionParams;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
    params = {
      userId: 'user-1',
      email: 'user@example.com',
      planId: 'plan-1',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };
  });

  describe('successful checkout session creation', () => {
    it('should create checkout session for new customer', async () => {
      const plan = createMockPlan();
      const customerMapping = createMockCustomerMapping();

      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(plan);
      vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
      vi.mocked(provider.createCheckoutSession).mockResolvedValue({
        sessionId: 'session_123',
        url: 'https://checkout.stripe.com/session_123',
      });

      const result = await createCheckoutSession(repos, provider, params);

      expect(result).toEqual({
        sessionId: 'session_123',
        url: 'https://checkout.stripe.com/session_123',
      });
      expect(repos.customerMappings.getOrCreate).toHaveBeenCalledWith(
        params.userId,
        provider.provider,
        expect.any(Function),
      );
      expect(provider.createCheckoutSession).toHaveBeenCalledWith({
        userId: customerMapping.providerCustomerId,
        email: params.email,
        planId: params.planId,
        priceId: plan.stripePriceId,
        trialDays: plan.trialDays,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        metadata: {
          userId: params.userId,
          planId: params.planId,
        },
      });
    });

    it('should include trial days when plan has trial period', async () => {
      const plan = createMockPlan({ trialDays: 30 });
      const customerMapping = createMockCustomerMapping();

      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(plan);
      vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
      vi.mocked(provider.createCheckoutSession).mockResolvedValue({
        sessionId: 'session_123',
        url: 'https://checkout.stripe.com/session_123',
      });

      await createCheckoutSession(repos, provider, params);

      expect(provider.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          trialDays: 30,
        }),
      );
    });
  });

  describe('error cases', () => {
    it('should throw BillingSubscriptionExistsError if user has active subscription', async () => {
      const subscription = createMockSubscription();
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(createCheckoutSession(repos, provider, params)).rejects.toMatchObject({
        name: 'SubscriptionExistsError',
      });
      expect(repos.plans.findById).not.toHaveBeenCalled();
    });

    it('should throw PlanNotFoundError if plan does not exist', async () => {
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(null);

      await expect(createCheckoutSession(repos, provider, params)).rejects.toMatchObject({
        name: 'PlanNotFoundError',
      });
    });

    it('should throw PlanNotActiveError if plan is not active', async () => {
      const plan = createMockPlan({ isActive: false });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(plan);

      await expect(createCheckoutSession(repos, provider, params)).rejects.toMatchObject({
        name: 'PlanNotActiveError',
      });
    });

    it('should throw error if plan has no Stripe price ID', async () => {
      const plan = createMockPlan({ stripePriceId: null });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(plan);

      await expect(createCheckoutSession(repos, provider, params)).rejects.toThrow(
        'Plan plan-1 has no Stripe price ID configured',
      );
    });

    it('should throw error if plan has empty Stripe price ID', async () => {
      const plan = createMockPlan({ stripePriceId: '' });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);
      vi.mocked(repos.plans.findById).mockResolvedValue(plan);

      await expect(createCheckoutSession(repos, provider, params)).rejects.toThrow(
        'Plan plan-1 has no Stripe price ID configured',
      );
    });
  });
});

describe('cancelSubscription', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  describe('cancel at period end', () => {
    it('should cancel subscription at period end by default', async () => {
      const subscription = createMockSubscription();
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await cancelSubscription(repos, provider, 'user-1');

      expect(provider.cancelSubscription).toHaveBeenCalledWith(
        subscription.providerSubscriptionId,
        false,
      );
      expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
        cancelAtPeriodEnd: true,
      });
    });

    it('should not update status when canceling at period end', async () => {
      const subscription = createMockSubscription();
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await cancelSubscription(repos, provider, 'user-1', false);

      expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
        cancelAtPeriodEnd: true,
      });
      expect(repos.subscriptions.update).not.toHaveBeenCalledWith(
        subscription.id,
        expect.objectContaining({ status: 'canceled' }),
      );
    });
  });

  describe('immediate cancellation', () => {
    it('should cancel subscription immediately when requested', async () => {
      const subscription = createMockSubscription();
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await cancelSubscription(repos, provider, 'user-1', true);

      expect(provider.cancelSubscription).toHaveBeenCalledWith(
        subscription.providerSubscriptionId,
        true,
      );
      expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
        status: 'canceled',
        canceledAt: expect.any(Date),
      });
    });
  });

  describe('error cases', () => {
    it('should throw SubscriptionNotFoundError if no active subscription', async () => {
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

      await expect(cancelSubscription(repos, provider, 'user-1')).rejects.toMatchObject({
        name: 'SubscriptionNotFoundError',
      });
      expect(provider.cancelSubscription).not.toHaveBeenCalled();
    });

    it('should throw SubscriptionAlreadyCanceledError if already canceled', async () => {
      const subscription = createMockSubscription({ status: 'canceled' });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(cancelSubscription(repos, provider, 'user-1')).rejects.toMatchObject({
        name: 'SubscriptionAlreadyCanceledError',
      });
    });

    it('should throw SubscriptionAlreadyCanceledError if already set to cancel at period end', async () => {
      const subscription = createMockSubscription({ cancelAtPeriodEnd: true });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(cancelSubscription(repos, provider, 'user-1', false)).rejects.toMatchObject({
        name: 'SubscriptionAlreadyCanceledError',
      });
    });

    it('should allow immediate cancel even if already set to cancel at period end', async () => {
      const subscription = createMockSubscription({ cancelAtPeriodEnd: true });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await cancelSubscription(repos, provider, 'user-1', true);

      expect(provider.cancelSubscription).toHaveBeenCalledWith(
        subscription.providerSubscriptionId,
        true,
      );
    });
  });
});

describe('resumeSubscription', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should resume subscription that was set to cancel', async () => {
    const subscription = createMockSubscription({ cancelAtPeriodEnd: true });
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

    await resumeSubscription(repos, provider, 'user-1');

    expect(provider.resumeSubscription).toHaveBeenCalledWith(subscription.providerSubscriptionId);
    expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
      cancelAtPeriodEnd: false,
    });
  });

  describe('error cases', () => {
    it('should throw SubscriptionNotFoundError if no active subscription', async () => {
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

      await expect(resumeSubscription(repos, provider, 'user-1')).rejects.toMatchObject({
        name: 'SubscriptionNotFoundError',
      });
    });

    it('should throw SubscriptionNotCancelingError if not set to cancel', async () => {
      const subscription = createMockSubscription({ cancelAtPeriodEnd: false });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(resumeSubscription(repos, provider, 'user-1')).rejects.toMatchObject({
        name: 'SubscriptionNotCancelingError',
      });
    });
  });
});

describe('updateSubscription', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should update subscription to new plan', async () => {
    const subscription = createMockSubscription();
    const newPlan = createMockPlan({ id: 'plan-2', stripePriceId: 'price_new_123' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(newPlan);

    await updateSubscription(repos, provider, 'user-1', 'plan-2');

    expect(provider.updateSubscription).toHaveBeenCalledWith(
      subscription.providerSubscriptionId,
      newPlan.stripePriceId,
    );
    expect(repos.subscriptions.update).toHaveBeenCalledWith(subscription.id, {
      planId: 'plan-2',
    });
  });

  it('should allow update for trialing subscription', async () => {
    const subscription = createMockSubscription({ status: 'trialing' });
    const newPlan = createMockPlan({ id: 'plan-2', stripePriceId: 'price_new_123' });

    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
    vi.mocked(repos.plans.findById).mockResolvedValue(newPlan);

    await updateSubscription(repos, provider, 'user-1', 'plan-2');

    expect(provider.updateSubscription).toHaveBeenCalled();
  });

  describe('error cases', () => {
    it('should throw SubscriptionNotFoundError if no active subscription', async () => {
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
        name: 'SubscriptionNotFoundError',
      });
    });

    it('should throw SubscriptionNotActiveError if subscription is canceled', async () => {
      const subscription = createMockSubscription({ status: 'canceled' });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
        name: 'SubscriptionNotActiveError',
      });
    });

    it('should throw SubscriptionNotActiveError if subscription is past_due', async () => {
      const subscription = createMockSubscription({ status: 'past_due' });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
        name: 'SubscriptionNotActiveError',
      });
    });

    it('should throw PlanNotFoundError if new plan does not exist', async () => {
      const subscription = createMockSubscription();
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
      vi.mocked(repos.plans.findById).mockResolvedValue(null);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
        name: 'PlanNotFoundError',
      });
    });

    it('should throw PlanNotActiveError if new plan is not active', async () => {
      const subscription = createMockSubscription();
      const newPlan = createMockPlan({ isActive: false });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
      vi.mocked(repos.plans.findById).mockResolvedValue(newPlan);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toMatchObject({
        name: 'PlanNotActiveError',
      });
    });

    it('should throw error if new plan has no Stripe price ID', async () => {
      const subscription = createMockSubscription();
      const newPlan = createMockPlan({ id: 'plan-2', stripePriceId: null });
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);
      vi.mocked(repos.plans.findById).mockResolvedValue(newPlan);

      await expect(updateSubscription(repos, provider, 'user-1', 'plan-2')).rejects.toThrow(
        'Plan plan-2 has no Stripe price ID configured',
      );
    });
  });
});

// ============================================================================
// Tests: Invoice Operations
// ============================================================================

describe('getUserInvoices', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
  });

  it('should return invoices with hasMore false when less than limit', async () => {
    const invoices = [
      createMockInvoice({ id: 'inv-1' }),
      createMockInvoice({ id: 'inv-2' }),
    ];
    vi.mocked(repos.invoices.findByUserId).mockResolvedValue({ items: invoices, total: 2 });

    const result = await getUserInvoices(repos, 'user-1', 10);

    expect(result).toEqual({
      invoices,
      hasMore: false,
    });
    expect(repos.invoices.findByUserId).toHaveBeenCalledWith('user-1', { limit: 11 });
  });

  it('should return invoices with hasMore true when more than limit', async () => {
    const invoices = Array.from({ length: 11 }, (_, i) =>
      createMockInvoice({ id: `inv-${i}` }),
    );
    vi.mocked(repos.invoices.findByUserId).mockResolvedValue({ items: invoices, total: 11 });

    const result = await getUserInvoices(repos, 'user-1', 10);

    expect(result.invoices).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.invoices[0]?.id).toBe('inv-0');
    expect(result.invoices[9]?.id).toBe('inv-9');
  });

  it('should use default limit of 10', async () => {
    vi.mocked(repos.invoices.findByUserId).mockResolvedValue({ items: [], total: 0 });

    await getUserInvoices(repos, 'user-1');

    expect(repos.invoices.findByUserId).toHaveBeenCalledWith('user-1', { limit: 11 });
  });

  it('should return empty array when user has no invoices', async () => {
    vi.mocked(repos.invoices.findByUserId).mockResolvedValue({ items: [], total: 0 });

    const result = await getUserInvoices(repos, 'user-1');

    expect(result).toEqual({
      invoices: [],
      hasMore: false,
    });
  });
});

// ============================================================================
// Tests: Payment Method Operations
// ============================================================================

describe('getUserPaymentMethods', () => {
  let repos: BillingRepositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
  });

  it('should return all payment methods for user', async () => {
    const paymentMethods = [
      createMockPaymentMethod({ id: 'pm-1', isDefault: true }),
      createMockPaymentMethod({ id: 'pm-2', isDefault: false }),
    ];
    vi.mocked(repos.paymentMethods.findByUserId).mockResolvedValue(paymentMethods);

    const result = await getUserPaymentMethods(repos, 'user-1');

    expect(result).toEqual(paymentMethods);
    expect(repos.paymentMethods.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should return empty array when user has no payment methods', async () => {
    vi.mocked(repos.paymentMethods.findByUserId).mockResolvedValue([]);

    const result = await getUserPaymentMethods(repos, 'user-1');

    expect(result).toEqual([]);
  });
});

describe('createSetupIntent', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should create setup intent for existing customer', async () => {
    const customerMapping = createMockCustomerMapping();
    vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
    vi.mocked(provider.createSetupIntent).mockResolvedValue({
      clientSecret: 'seti_secret_123',
    });

    const result = await createSetupIntent(repos, provider, 'user-1', 'user@example.com');

    expect(result).toEqual({ clientSecret: 'seti_secret_123' });
    expect(provider.createSetupIntent).toHaveBeenCalledWith(customerMapping.providerCustomerId);
  });

  it('should create customer if not exists', async () => {
    const customerMapping = createMockCustomerMapping();
    vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
    vi.mocked(provider.createSetupIntent).mockResolvedValue({
      clientSecret: 'seti_secret_123',
    });

    await createSetupIntent(repos, provider, 'user-1', 'user@example.com');

    expect(repos.customerMappings.getOrCreate).toHaveBeenCalledWith(
      'user-1',
      provider.provider,
      expect.any(Function),
    );
  });
});

describe('addPaymentMethod', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should add payment method and set as default for first method', async () => {
    const customerMapping = createMockCustomerMapping();
    const providerMethod = {
      id: 'pm_stripe_123',
      type: 'card' as const,
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
    };
    const createdMethod = createMockPaymentMethod({ isDefault: true });

    vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
    vi.mocked(provider.listPaymentMethods).mockResolvedValue([providerMethod]);
    vi.mocked(repos.paymentMethods.findByUserId).mockResolvedValue([]);
    vi.mocked(repos.paymentMethods.create).mockResolvedValue(createdMethod);

    const result = await addPaymentMethod(
      repos,
      provider,
      'user-1',
      'user@example.com',
      'pm_stripe_123',
    );

    expect(result).toEqual(createdMethod);
    expect(provider.attachPaymentMethod).toHaveBeenCalledWith(
      customerMapping.providerCustomerId,
      'pm_stripe_123',
    );
    expect(repos.paymentMethods.create).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: 'stripe',
      providerPaymentMethodId: 'pm_stripe_123',
      type: 'card',
      isDefault: true,
      cardDetails: providerMethod.card,
    });
  });

  it('should not set as default for additional methods', async () => {
    const customerMapping = createMockCustomerMapping();
    const providerMethod = {
      id: 'pm_stripe_456',
      type: 'card' as const,
      card: {
        brand: 'mastercard',
        last4: '5555',
        expMonth: 6,
        expYear: 2026,
      },
    };
    const existingMethod = createMockPaymentMethod({ id: 'pm-1', isDefault: true });
    const createdMethod = createMockPaymentMethod({ id: 'pm-2', isDefault: false });

    vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
    vi.mocked(provider.listPaymentMethods).mockResolvedValue([providerMethod]);
    vi.mocked(repos.paymentMethods.findByUserId).mockResolvedValue([existingMethod]);
    vi.mocked(repos.paymentMethods.create).mockResolvedValue(createdMethod);

    const result = await addPaymentMethod(
      repos,
      provider,
      'user-1',
      'user@example.com',
      'pm_stripe_456',
    );

    expect(result.isDefault).toBe(false);
    expect(repos.paymentMethods.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: false }),
    );
  });

  describe('error cases', () => {
    it('should throw PaymentMethodNotFoundError if method not found after attach', async () => {
      const customerMapping = createMockCustomerMapping();
      vi.mocked(repos.customerMappings.getOrCreate).mockResolvedValue(customerMapping);
      vi.mocked(provider.listPaymentMethods).mockResolvedValue([]);

      await expect(
        addPaymentMethod(repos, provider, 'user-1', 'user@example.com', 'pm_nonexistent'),
      ).rejects.toMatchObject({ name: 'PaymentMethodNotFoundError' });
    });
  });
});

describe('removePaymentMethod', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should remove non-default payment method', async () => {
    const paymentMethod = createMockPaymentMethod({ isDefault: false });
    vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);

    await removePaymentMethod(repos, provider, 'user-1', 'pm-1');

    expect(provider.detachPaymentMethod).toHaveBeenCalledWith(
      paymentMethod.providerPaymentMethodId,
    );
    expect(repos.paymentMethods.delete).toHaveBeenCalledWith('pm-1');
  });

  it('should remove default payment method if no active subscription', async () => {
    const paymentMethod = createMockPaymentMethod({ isDefault: true });
    vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);
    vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(null);

    await removePaymentMethod(repos, provider, 'user-1', 'pm-1');

    expect(provider.detachPaymentMethod).toHaveBeenCalled();
    expect(repos.paymentMethods.delete).toHaveBeenCalled();
  });

  describe('error cases', () => {
    it('should throw PaymentMethodNotFoundError if payment method not found', async () => {
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(null);

      await expect(removePaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'PaymentMethodNotFoundError',
      });
    });

    it('should throw PaymentMethodNotFoundError if payment method belongs to different user', async () => {
      const paymentMethod = createMockPaymentMethod({ userId: 'user-2' });
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);

      await expect(removePaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'PaymentMethodNotFoundError',
      });
    });

    it('should throw CannotRemoveDefaultPaymentMethodError if default with active subscription', async () => {
      const paymentMethod = createMockPaymentMethod({ isDefault: true });
      const subscription = createMockSubscription();
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);
      vi.mocked(repos.subscriptions.findActiveByUserId).mockResolvedValue(subscription);

      await expect(removePaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'CannotRemoveDefaultPaymentMethodError',
      });
    });
  });
});

describe('setDefaultPaymentMethod', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should set payment method as default', async () => {
    const paymentMethod = createMockPaymentMethod({ isDefault: false });
    const customerMapping = createMockCustomerMapping();
    const updatedMethod = createMockPaymentMethod({ isDefault: true });

    vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);
    vi.mocked(repos.customerMappings.findByUserIdAndProvider).mockResolvedValue(customerMapping);
    vi.mocked(repos.paymentMethods.setAsDefault).mockResolvedValue(updatedMethod);

    const result = await setDefaultPaymentMethod(repos, provider, 'user-1', 'pm-1');

    expect(result).toEqual(updatedMethod);
    expect(provider.setDefaultPaymentMethod).toHaveBeenCalledWith(
      customerMapping.providerCustomerId,
      paymentMethod.providerPaymentMethodId,
    );
    expect(repos.paymentMethods.setAsDefault).toHaveBeenCalledWith('user-1', 'pm-1');
  });

  describe('error cases', () => {
    it('should throw PaymentMethodNotFoundError if payment method not found', async () => {
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(null);

      await expect(setDefaultPaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'PaymentMethodNotFoundError',
      });
    });

    it('should throw PaymentMethodNotFoundError if payment method belongs to different user', async () => {
      const paymentMethod = createMockPaymentMethod({ userId: 'user-2' });
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);

      await expect(setDefaultPaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'PaymentMethodNotFoundError',
      });
    });

    it('should throw CustomerNotFoundError if customer mapping not found', async () => {
      const paymentMethod = createMockPaymentMethod();
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);
      vi.mocked(repos.customerMappings.findByUserIdAndProvider).mockResolvedValue(null);

      await expect(setDefaultPaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'CustomerNotFoundError',
      });
    });

    it('should throw PaymentMethodNotFoundError if setAsDefault returns null', async () => {
      const paymentMethod = createMockPaymentMethod();
      const customerMapping = createMockCustomerMapping();
      vi.mocked(repos.paymentMethods.findById).mockResolvedValue(paymentMethod);
      vi.mocked(repos.customerMappings.findByUserIdAndProvider).mockResolvedValue(customerMapping);
      vi.mocked(repos.paymentMethods.setAsDefault).mockResolvedValue(null);

      await expect(setDefaultPaymentMethod(repos, provider, 'user-1', 'pm-1')).rejects.toMatchObject({
        name: 'PaymentMethodNotFoundError',
      });
    });
  });
});

// ============================================================================
// Tests: Customer Operations
// ============================================================================

describe('getCustomerId', () => {
  let repos: BillingRepositories;
  let provider: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockBillingRepos();
    provider = createMockBillingProvider();
  });

  it('should return provider customer ID when mapping exists', async () => {
    const customerMapping = createMockCustomerMapping();
    vi.mocked(repos.customerMappings.findByUserIdAndProvider).mockResolvedValue(customerMapping);

    const result = await getCustomerId(repos, provider, 'user-1');

    expect(result).toBe(customerMapping.providerCustomerId);
    expect(repos.customerMappings.findByUserIdAndProvider).toHaveBeenCalledWith(
      'user-1',
      provider.provider,
    );
  });

  it('should return null when mapping does not exist', async () => {
    vi.mocked(repos.customerMappings.findByUserIdAndProvider).mockResolvedValue(null);

    const result = await getCustomerId(repos, provider, 'user-1');

    expect(result).toBeNull();
  });
});
