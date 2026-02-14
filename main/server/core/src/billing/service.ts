// main/server/core/src/billing/service.ts
/**
 * Billing Service
 *
 * Pure business logic for billing operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories and provider as explicit parameters
 * for testability and decoupled architecture.
 */

import {
    BillingSubscriptionExistsError,
    BillingSubscriptionNotFoundError,
    CannotRemoveDefaultPaymentMethodError,
    CustomerNotFoundError,
    InvoiceNotFoundError,
    PaymentMethodNotFoundError,
    PlanNotActiveError,
    PlanNotFoundError,
    SubscriptionAlreadyCanceledError,
    SubscriptionNotActiveError,
    SubscriptionNotCancelingError,
} from '@abe-stack/shared';

import {
    createCustomerMappingRepository,
    createInvoiceRepository,
    createPaymentMethodRepository,
    createPlanRepository,
    createSubscriptionRepository,
} from '../../../db/src';

import type { BillingRepositories } from './types';
import type {
    Invoice as DbInvoice,
    PaymentMethod as DbPaymentMethod,
    Plan as DbPlan,
    Subscription as DbSubscription,
    RawDb,
} from '../../../db/src';
import type {
    BillingService,
    CheckoutParams,
    CheckoutResult,
    PortalSessionResult,
    ProviderPaymentMethod,
} from '@abe-stack/shared/domain';

// ============================================================================
// Plan Operations
// ============================================================================

/**
 * Get all active billing plans.
 *
 * @param repos - Billing repositories containing the plans repository
 * @returns Array of active plans sorted by sort order
 * @complexity O(n) where n is the number of active plans
 */
export async function getActivePlans(repos: BillingRepositories): Promise<DbPlan[]> {
  return repos.plans.listActive();
}

/**
 * Get a plan by its identifier.
 *
 * @param repos - Billing repositories containing the plans repository
 * @param planId - Unique plan identifier to look up
 * @returns The plan if found, or null
 * @complexity O(1) database lookup by primary key
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
 * Get the current subscription for a user, including plan details.
 *
 * @param repos - Billing repositories for subscription and plan lookups
 * @param userId - User identifier to find the subscription for
 * @returns The active subscription with plan details, or null if none exists
 * @complexity O(1) - two sequential database lookups
 */
export async function getUserSubscription(
  repos: BillingRepositories,
  userId: string,
): Promise<(DbSubscription & { plan: DbPlan }) | null> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (subscription === null) {
    return null;
  }

  const plan = await repos.plans.findById(subscription.planId);
  if (plan === null) {
    return null;
  }

  return { ...subscription, plan };
}

/**
 * Create a checkout session for a new subscription.
 *
 * Validates that the user does not already have an active subscription,
 * the plan exists and is active, and the plan has a configured Stripe price ID.
 * Creates or retrieves the customer mapping before creating the session.
 *
 * @param repos - Billing repositories for validation and customer mapping
 * @param provider - Billing service provider (Stripe/PayPal)
 * @param params - Checkout session parameters including user, plan, and URLs
 * @returns Checkout session with session ID and redirect URL
 * @throws BillingSubscriptionExistsError if user already has an active subscription
 * @throws PlanNotFoundError if plan does not exist
 * @throws PlanNotActiveError if plan is not active
 * @throws Error if plan has no Stripe price ID configured
 * @complexity O(1) - sequential database lookups and provider API call
 */
export async function createCheckoutSession(
  repos: BillingRepositories,
  provider: BillingService,
  params: CheckoutParams,
): Promise<CheckoutResult> {
  // Check if user already has an active subscription
  const existingSubscription = await repos.subscriptions.findActiveByUserId(params.userId);
  if (existingSubscription !== null) {
    throw new BillingSubscriptionExistsError();
  }

  // Get the plan
  const plan = await repos.plans.findById(params.planId);
  if (plan === null) {
    throw new PlanNotFoundError(params.planId);
  }
  if (!plan.isActive) {
    throw new PlanNotActiveError(params.planId);
  }

  // Get the Stripe price ID
  const priceId = plan.stripePriceId;
  if (priceId === null || priceId === '') {
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
 * Create a customer portal session for a user.
 *
 * @param repos - Billing repositories for customer mapping lookup
 * @param provider - Billing service provider
 * @param userId - User who wants to access the portal
 * @param returnUrl - URL to return to after leaving the portal
 * @returns Portal session with redirect URL
 * @throws CustomerNotFoundError if no customer mapping exists for the user
 * @complexity O(1) - single database lookup and provider API call
 */
export async function createPortalSession(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  returnUrl: string,
): Promise<PortalSessionResult> {
  // Get customer mapping
  const customerMapping = await repos.customerMappings.findByUserIdAndProvider(
    userId,
    provider.provider,
  );

  if (customerMapping === null) {
    throw new CustomerNotFoundError(userId);
  }

  return provider.createPortalSession({
    customerId: customerMapping.providerCustomerId,
    returnUrl,
  });
}

/**
 * Cancel a subscription for a user.
 *
 * Supports both immediate cancellation and cancel-at-period-end.
 * Validates subscription exists and is not already canceled.
 *
 * @param repos - Billing repositories for subscription lookup and update
 * @param provider - Billing service provider for provider-side cancellation
 * @param userId - User whose subscription to cancel
 * @param immediately - If true, cancel immediately; otherwise cancel at period end
 * @throws BillingSubscriptionNotFoundError if user has no active subscription
 * @throws SubscriptionAlreadyCanceledError if subscription is already canceled or pending cancellation
 * @complexity O(1) - database lookup, provider API call, database update
 */
export async function cancelSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  immediately = false,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (subscription === null) {
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
 * Resume a subscription that was set to cancel at period end.
 *
 * @param repos - Billing repositories for subscription lookup and update
 * @param provider - Billing service provider for provider-side resumption
 * @param userId - User whose subscription to resume
 * @throws BillingSubscriptionNotFoundError if user has no active subscription
 * @throws SubscriptionNotCancelingError if subscription is not pending cancellation
 * @complexity O(1) - database lookup, provider API call, database update
 */
export async function resumeSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (subscription === null) {
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
 * Update a subscription to a new plan.
 *
 * Validates the subscription is active or trialing, and the new plan
 * exists, is active, and has a configured price ID.
 *
 * @param repos - Billing repositories for subscription and plan operations
 * @param provider - Billing service provider for provider-side plan change
 * @param userId - User whose subscription to update
 * @param newPlanId - Identifier of the new plan to switch to
 * @throws BillingSubscriptionNotFoundError if user has no active subscription
 * @throws SubscriptionNotActiveError if subscription is not active or trialing
 * @throws PlanNotFoundError if new plan does not exist
 * @throws PlanNotActiveError if new plan is not active
 * @throws Error if new plan has no Stripe price ID configured
 * @complexity O(1) - sequential database lookups, provider API call, database update
 */
export async function updateSubscription(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  newPlanId: string,
): Promise<void> {
  const subscription = await repos.subscriptions.findActiveByUserId(userId);

  if (subscription === null) {
    throw new BillingSubscriptionNotFoundError();
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new SubscriptionNotActiveError();
  }

  // Get the new plan
  const newPlan = await repos.plans.findById(newPlanId);
  if (newPlan === null) {
    throw new PlanNotFoundError(newPlanId);
  }
  if (!newPlan.isActive) {
    throw new PlanNotActiveError(newPlanId);
  }

  const newPriceId = newPlan.stripePriceId;
  if (newPriceId === null || newPriceId === '') {
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
 * Get invoices for a user with pagination support.
 *
 * Fetches one extra invoice beyond the limit to determine if more exist.
 *
 * @param repos - Billing repositories containing the invoices repository
 * @param userId - User whose invoices to retrieve
 * @param limit - Maximum number of invoices to return (default 10)
 * @returns Object with invoices array and hasMore flag for pagination
 * @complexity O(n) where n is the limit parameter
 */
export async function getUserInvoices(
  repos: BillingRepositories,
  userId: string,
  limit = 10,
): Promise<{ invoices: DbInvoice[]; hasMore: boolean }> {
  const result = await repos.invoices.findByUserId(userId, { limit: limit + 1 });

  const hasMore = result.data.length > limit;
  const invoices = hasMore ? result.data.slice(0, limit) : result.data;

  return { invoices, hasMore };
}

/**
 * Get a single invoice by ID, verifying it belongs to the user.
 *
 * @param repos - Billing repositories containing the invoices repository
 * @param userId - User requesting the invoice (for ownership verification)
 * @param invoiceId - Invoice identifier to retrieve
 * @returns The invoice if found and owned by the user
 * @throws InvoiceNotFoundError if invoice does not exist or belongs to another user
 * @complexity O(1) database lookup by primary key
 */
export async function getUserInvoice(
  repos: BillingRepositories,
  userId: string,
  invoiceId: string,
): Promise<DbInvoice> {
  const invoice = await repos.invoices.findById(invoiceId);

  if (invoice?.userId !== userId) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  return invoice;
}

// ============================================================================
// Payment Method Operations
// ============================================================================

/**
 * Get all payment methods for a user.
 *
 * @param repos - Billing repositories containing the payment methods repository
 * @param userId - User whose payment methods to retrieve
 * @returns Array of payment methods for the user
 * @complexity O(n) where n is the number of payment methods
 */
export async function getUserPaymentMethods(
  repos: BillingRepositories,
  userId: string,
): Promise<DbPaymentMethod[]> {
  return repos.paymentMethods.findByUserId(userId);
}

/**
 * Create a setup intent for adding a new payment method.
 *
 * Gets or creates the customer mapping before creating the setup intent
 * with the billing provider.
 *
 * @param repos - Billing repositories for customer mapping
 * @param provider - Billing service provider for setup intent creation
 * @param userId - User who wants to add a payment method
 * @param email - User's email for customer creation if needed
 * @returns Object with client secret for frontend payment method setup
 * @complexity O(1) - customer lookup/creation and provider API call
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
 * Add a payment method to a user's account.
 *
 * Attaches the payment method in the provider, retrieves its details,
 * and saves it to the database. The first payment method is automatically
 * set as default.
 *
 * @param repos - Billing repositories for customer and payment method operations
 * @param provider - Billing service provider for payment method attachment
 * @param userId - User who owns the payment method
 * @param email - User's email for customer creation if needed
 * @param paymentMethodId - Provider-specific payment method identifier
 * @returns The created payment method database record
 * @throws PaymentMethodNotFoundError if the payment method is not found after attachment
 * @complexity O(n) where n is the number of existing payment methods for the user
 */
export async function addPaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  email: string,
  paymentMethodId: string,
): Promise<DbPaymentMethod> {
  return await repos.db.transaction(async (txDb: RawDb) => {
    // Re-create repositories with the transaction client
    const txRepos: BillingRepositories = {
      db: txDb,
      plans: createPlanRepository(txDb),
      subscriptions: createSubscriptionRepository(txDb),
      customerMappings: createCustomerMappingRepository(txDb),
      invoices: createInvoiceRepository(txDb),
      paymentMethods: createPaymentMethodRepository(txDb),
    };

    // Get or create customer
    const customerMapping = await txRepos.customerMappings.getOrCreate(
      userId,
      provider.provider,
      async () => provider.createCustomer(userId, email),
    );

    // Attach payment method in provider (Side effect, occurs outside of DB transaction but inside the logic)
    await provider.attachPaymentMethod(customerMapping.providerCustomerId, paymentMethodId);

    // Get payment method details from provider
    const providerMethods = await provider.listPaymentMethods(customerMapping.providerCustomerId);
    const providerMethod = providerMethods.find(
      (pm: ProviderPaymentMethod) => pm.id === paymentMethodId,
    );

    if (providerMethod === undefined) {
      throw new PaymentMethodNotFoundError(paymentMethodId);
    }

    // Check if this is the first payment method (make it default)
    const existingMethods = await txRepos.paymentMethods.findByUserId(userId);
    const isDefault = existingMethods.length === 0;

    // Save to database
    return txRepos.paymentMethods.create({
      userId,
      provider: provider.provider,
      providerPaymentMethodId: paymentMethodId,
      type: providerMethod.type,
      isDefault,
      cardDetails: providerMethod.card ?? null,
    });
  });
}

/**
 * Remove a payment method from a user's account.
 *
 * Validates ownership and prevents removal of the default payment method
 * when the user has an active subscription.
 *
 * @param repos - Billing repositories for payment method and subscription operations
 * @param provider - Billing service provider for payment method detachment
 * @param userId - User who owns the payment method
 * @param paymentMethodId - Database identifier of the payment method to remove
 * @throws PaymentMethodNotFoundError if payment method not found or not owned by user
 * @throws CannotRemoveDefaultPaymentMethodError if trying to remove default with active subscription
 * @complexity O(1) - sequential database lookups and provider API call
 */
export async function removePaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  paymentMethodId: string,
): Promise<void> {
  await repos.db.transaction(async (txDb: RawDb) => {
    // Re-create repositories with the transaction client
    const txRepos: BillingRepositories = {
      db: txDb,
      plans: createPlanRepository(txDb),
      subscriptions: createSubscriptionRepository(txDb),
      customerMappings: createCustomerMappingRepository(txDb),
      invoices: createInvoiceRepository(txDb),
      paymentMethods: createPaymentMethodRepository(txDb),
    };

    const paymentMethod = await txRepos.paymentMethods.findById(paymentMethodId);

    if (paymentMethod?.userId !== userId) {
      throw new PaymentMethodNotFoundError(paymentMethodId);
    }

    // Check if this is the default and user has active subscription
    if (paymentMethod.isDefault) {
      const subscription = await txRepos.subscriptions.findActiveByUserId(userId);
      if (subscription !== null) {
        throw new CannotRemoveDefaultPaymentMethodError();
      }
    }

    // Detach from provider (Side effect)
    await provider.detachPaymentMethod(paymentMethod.providerPaymentMethodId);

    // Delete from database
    await txRepos.paymentMethods.delete(paymentMethodId);
  });
}

/**
 * Set a payment method as the default for a user.
 *
 * Updates both the provider and local database to reflect the new default.
 *
 * @param repos - Billing repositories for payment method and customer operations
 * @param provider - Billing service provider for default payment method update
 * @param userId - User who owns the payment method
 * @param paymentMethodId - Database identifier of the payment method to set as default
 * @returns The updated payment method database record
 * @throws PaymentMethodNotFoundError if payment method not found or not owned by user
 * @throws CustomerNotFoundError if no customer mapping exists for the user
 * @complexity O(1) - sequential database lookups and provider API call
 */
export async function setDefaultPaymentMethod(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
  paymentMethodId: string,
): Promise<DbPaymentMethod> {
  return await repos.db.transaction(async (txDb) => {
    // Re-create repositories with the transaction client
    const txRepos: BillingRepositories = {
      db: txDb,
      plans: createPlanRepository(txDb),
      subscriptions: createSubscriptionRepository(txDb),
      customerMappings: createCustomerMappingRepository(txDb),
      invoices: createInvoiceRepository(txDb),
      paymentMethods: createPaymentMethodRepository(txDb),
    };

    const paymentMethod = await txRepos.paymentMethods.findById(paymentMethodId);

    if (paymentMethod?.userId !== userId) {
      throw new PaymentMethodNotFoundError(paymentMethodId);
    }

    // Get customer mapping
    const customerMapping = await txRepos.customerMappings.findByUserIdAndProvider(
      userId,
      provider.provider,
    );

    if (customerMapping === null) {
      throw new CustomerNotFoundError(userId);
    }

    // Set default in provider (Side effect)
    await provider.setDefaultPaymentMethod(
      customerMapping.providerCustomerId,
      paymentMethod.providerPaymentMethodId,
    );

    // Update in database
    const updated = await txRepos.paymentMethods.setAsDefault(userId, paymentMethodId);

    if (updated === null) {
      throw new PaymentMethodNotFoundError(paymentMethodId);
    }

    return updated;
  });
}

// ============================================================================
// Customer Operations
// ============================================================================

/**
 * Get the provider customer ID for a user.
 *
 * @param repos - Billing repositories for customer mapping lookup
 * @param provider - Billing service provider to identify the provider type
 * @param userId - User whose customer ID to retrieve
 * @returns The provider customer ID, or null if no mapping exists
 * @complexity O(1) - single database lookup
 */
export async function getCustomerId(
  repos: BillingRepositories,
  provider: BillingService,
  userId: string,
): Promise<string | null> {
  const mapping = await repos.customerMappings.findByUserIdAndProvider(userId, provider.provider);
  return mapping?.providerCustomerId ?? null;
}
