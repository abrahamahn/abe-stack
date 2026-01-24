// apps/server/src/modules/billing/service.ts
/**
 * Billing Service
 *
 * Pure business logic for billing operations.
 * No HTTP awareness - returns domain objects or throws errors.
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
import type {
  CustomerMappingRepository,
  Invoice as DbInvoice,
  PaymentMethod as DbPaymentMethod,
  Plan as DbPlan,
  Subscription as DbSubscription,
  InvoiceRepository,
  PaymentMethodRepository,
  PlanRepository,
  SubscriptionRepository,
} from '@abe-stack/db';

import type { BillingService } from '@infrastructure/billing';

// ============================================================================
// Types
// ============================================================================

export interface BillingRepositories {
  plans: PlanRepository;
  subscriptions: SubscriptionRepository;
  customerMappings: CustomerMappingRepository;
  invoices: InvoiceRepository;
  paymentMethods: PaymentMethodRepository;
}

export interface CheckoutSessionParams {
  userId: string;
  email: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ============================================================================
// Plan Operations
// ============================================================================

/**
 * Get all active plans
 */
export async function getActivePlans(repos: BillingRepositories): Promise<DbPlan[]> {
  return repos.plans.listActive();
}

/**
 * Get a plan by ID
 */
export async function getPlanById(
  repos: BillingRepositories,
  planId: string,
): Promise<DbPlan | null> {
  return repos.plans.findById(planId);
}

// ============================================================================
// Subscription Operations
// ============================================================================

/**
 * Get the current subscription for a user
 */
export async function getUserSubscription(
  repos: BillingRepositories,
  userId: string,
): Promise<(DbSubscription & { plan: DbPlan }) | null> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (!subscription) {
    return null;
  }

  const plan = await repos.plans.findById(subscription.planId);
  if (!plan) {
    return null;
  }

  return { ...subscription, plan };
}

/**
 * Create a checkout session for a new subscription
 */
export async function createCheckoutSession(
  repos: BillingRepositories,
  provider: BillingService,
  params: CheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  // Check if user already has an active subscription
  const existingSubscription = await repos.subscriptions.findActiveByUserId(params.userId);
  if (existingSubscription) {
    throw new BillingSubscriptionExistsError();
  }

  // Get the plan
  const plan = await repos.plans.findById(params.planId);
  if (!plan) {
    throw new PlanNotFoundError(params.planId);
  }
  if (!plan.isActive) {
    throw new PlanNotActiveError(params.planId);
  }

  // Get the Stripe price ID
  const priceId = plan.stripePriceId;
  if (!priceId) {
    throw new Error(`Plan ${params.planId} has no Stripe price ID configured`);
  }

  // Get or create customer
  const customerMapping = await repos.customerMappings.getOrCreate(
    params.userId,
    provider.provider,
    async () => provider.createCustomer(params.userId, params.email),
  );

  // Create checkout session
  const session = await provider.createCheckoutSession({
    userId: customerMapping.providerCustomerId,
    email: params.email,
    planId: params.planId,
    priceId,
    trialDays: plan.trialDays,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    metadata: {
      userId: params.userId,
      planId: params.planId,
    },
  });

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  immediately = false,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (!subscription) {
    throw new BillingSubscriptionNotFoundError();
  }

  if (subscription.status === 'canceled') {
    throw new SubscriptionAlreadyCanceledError();
  }

  if (subscription.cancelAtPeriodEnd && !immediately) {
    throw new SubscriptionAlreadyCanceledError();
  }

  // Cancel in provider
  await provider.cancelSubscription(subscription.providerSubscriptionId, immediately);

  // Update local record
  if (immediately) {
    await repos.subscriptions.update(subscription.id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
  } else {
    await repos.subscriptions.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });
  }
}

/**
 * Resume a subscription that was set to cancel at period end
 */
export async function resumeSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (!subscription) {
    throw new BillingSubscriptionNotFoundError();
  }

  if (!subscription.cancelAtPeriodEnd) {
    throw new SubscriptionNotCancelingError();
  }

  // Resume in provider
  await provider.resumeSubscription(subscription.providerSubscriptionId);

  // Update local record
  await repos.subscriptions.update(subscription.id, {
    cancelAtPeriodEnd: false,
  });
}

/**
 * Update subscription to a new plan
 */
export async function updateSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  newPlanId: string,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (!subscription) {
    throw new BillingSubscriptionNotFoundError();
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new SubscriptionNotActiveError();
  }

  // Get the new plan
  const newPlan = await repos.plans.findById(newPlanId);
  if (!newPlan) {
    throw new PlanNotFoundError(newPlanId);
  }
  if (!newPlan.isActive) {
    throw new PlanNotActiveError(newPlanId);
  }

  const newPriceId = newPlan.stripePriceId;
  if (!newPriceId) {
    throw new Error(`Plan ${newPlanId} has no Stripe price ID configured`);
  }

  // Update in provider
  await provider.updateSubscription(subscription.providerSubscriptionId, newPriceId);

  // Update local record
  await repos.subscriptions.update(subscription.id, {
    planId: newPlanId,
  });
}

// ============================================================================
// Invoice Operations
// ============================================================================

/**
 * Get invoices for a user
 */
export async function getUserInvoices(
  repos: BillingRepositories,
  userId: string,
  limit = 10,
): Promise<{ invoices: DbInvoice[]; hasMore: boolean }> {
  const result = await repos.invoices.findByUserId(userId, { limit: limit + 1 });

  const hasMore = result.items.length > limit;
  const invoices = hasMore ? result.items.slice(0, limit) : result.items;

  return { invoices, hasMore };
}

// ============================================================================
// Payment Method Operations
// ============================================================================

/**
 * Get payment methods for a user
 */
export async function getUserPaymentMethods(
  repos: BillingRepositories,
  userId: string,
): Promise<DbPaymentMethod[]> {
  return repos.paymentMethods.findByUserId(userId);
}

/**
 * Create a setup intent for adding a payment method
 */
export async function createSetupIntent(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  email: string,
): Promise<{ clientSecret: string }> {
  // Get or create customer
  const customerMapping = await repos.customerMappings.getOrCreate(
    userId,
    provider.provider,
    async () => provider.createCustomer(userId, email),
  );

  return provider.createSetupIntent(customerMapping.providerCustomerId);
}

/**
 * Add a payment method
 */
export async function addPaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  email: string,
  paymentMethodId: string,
): Promise<DbPaymentMethod> {
  // Get or create customer
  const customerMapping = await repos.customerMappings.getOrCreate(
    userId,
    provider.provider,
    async () => provider.createCustomer(userId, email),
  );

  // Attach payment method in provider
  await provider.attachPaymentMethod(customerMapping.providerCustomerId, paymentMethodId);

  // Get payment method details from provider
  const providerMethods = await provider.listPaymentMethods(customerMapping.providerCustomerId);
  const providerMethod = providerMethods.find(
    (pm: import('@abe-stack/core').ProviderPaymentMethod) => pm.id === paymentMethodId,
  );

  if (!providerMethod) {
    throw new PaymentMethodNotFoundError(paymentMethodId);
  }

  // Check if this is the first payment method (make it default)
  const existingMethods = await repos.paymentMethods.findByUserId(userId);
  const isDefault = existingMethods.length === 0;

  // Save to database
  return repos.paymentMethods.create({
    userId,
    provider: provider.provider,
    providerPaymentMethodId: paymentMethodId,
    type: providerMethod.type,
    isDefault,
    cardDetails: providerMethod.card || null,
  });
}

/**
 * Remove a payment method
 */
export async function removePaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  paymentMethodId: string,
): Promise<void> {
  const paymentMethod = await repos.paymentMethods.findById(paymentMethodId);

  if (!paymentMethod || paymentMethod.userId !== userId) {
    throw new PaymentMethodNotFoundError(paymentMethodId);
  }

  // Check if this is the default and user has active subscription
  if (paymentMethod.isDefault) {
    const subscription = await repos.subscriptions.findActiveByUserId(userId);
    if (subscription) {
      throw new CannotRemoveDefaultPaymentMethodError();
    }
  }

  // Detach from provider
  await provider.detachPaymentMethod(paymentMethod.providerPaymentMethodId);

  // Delete from database
  await repos.paymentMethods.delete(paymentMethodId);
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  paymentMethodId: string,
): Promise<DbPaymentMethod> {
  const paymentMethod = await repos.paymentMethods.findById(paymentMethodId);

  if (!paymentMethod || paymentMethod.userId !== userId) {
    throw new PaymentMethodNotFoundError(paymentMethodId);
  }

  // Get customer mapping
  const customerMapping = await repos.customerMappings.findByUserIdAndProvider(
    userId,
    provider.provider,
  );

  if (!customerMapping) {
    throw new CustomerNotFoundError(userId);
  }

  // Set default in provider
  await provider.setDefaultPaymentMethod(
    customerMapping.providerCustomerId,
    paymentMethod.providerPaymentMethodId,
  );

  // Update in database
  const updated = await repos.paymentMethods.setAsDefault(userId, paymentMethodId);

  if (!updated) {
    throw new PaymentMethodNotFoundError(paymentMethodId);
  }

  return updated;
}

// ============================================================================
// Customer Operations
// ============================================================================

/**
 * Get provider customer ID for a user
 */
export async function getCustomerId(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
): Promise<string | null> {
  const mapping = await repos.customerMappings.findByUserIdAndProvider(userId, provider.provider);
  return mapping?.providerCustomerId || null;
}
