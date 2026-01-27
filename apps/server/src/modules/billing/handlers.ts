// apps/server/src/modules/billing/handlers.ts
/**
 * Billing Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
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
    type AddPaymentMethodRequest,
    type CancelSubscriptionRequest,
    type CheckoutRequest,
    type CheckoutResponse,
    type Invoice,
    type InvoicesListResponse,
    type PaymentMethod,
    type PaymentMethodResponse,
    type PaymentMethodsListResponse,
    type Plan,
    type PlansListResponse,
    type SetupIntentResponse,
    type Subscription,
    type SubscriptionActionResponse,
    type SubscriptionResponse,
    type UpdateSubscriptionRequest,
} from '@abe-stack/core';
import { createBillingProvider } from '@infrastructure/billing';

import {
    addPaymentMethod,
    cancelSubscription,
    createCheckoutSession,
    createSetupIntent,
    getActivePlans,
    getUserInvoices,
    getUserPaymentMethods,
    getUserSubscription,
    removePaymentMethod,
    resumeSubscription,
    setDefaultPaymentMethod,
    updateSubscription,
    type BillingRepositories,
} from './service';

import type { AppContext, RequestWithCookies } from '@shared';


// ============================================================================
// Helper Functions
// ============================================================================

function getBillingRepos(ctx: AppContext): BillingRepositories {
  // These repositories need to be added to the context
  // For now, we'll create them dynamically
  return {
    plans: ctx.repos.plans,
    subscriptions: ctx.repos.subscriptions,
    customerMappings: ctx.repos.customerMappings,
    invoices: ctx.repos.invoices,
    paymentMethods: ctx.repos.paymentMethods,
  } as BillingRepositories;
}

function formatPlan(plan: {
  id: string;
  name: string;
  description: string | null;
  interval: 'month' | 'year';
  priceInCents: number;
  currency: string;
  features: { name: string; included: boolean; description?: string }[];
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
}): Plan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    interval: plan.interval,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    features: plan.features,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

function formatSubscription(subscription: {
  id: string;
  userId: string;
  planId: string;
  provider: 'stripe' | 'paypal';
  status:
    | 'active'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'past_due'
    | 'paused'
    | 'trialing'
    | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
  plan: {
    id: string;
    name: string;
    description: string | null;
    interval: 'month' | 'year';
    priceInCents: number;
    currency: string;
    features: { name: string; included: boolean; description?: string }[];
    trialDays: number;
    isActive: boolean;
    sortOrder: number;
  };
}): Subscription {
  return {
    id: subscription.id,
    userId: subscription.userId,
    planId: subscription.planId,
    plan: formatPlan(subscription.plan),
    provider: subscription.provider,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    trialEnd: subscription.trialEnd?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
  };
}

function formatInvoice(invoice: {
  id: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  invoicePdfUrl: string | null;
  createdAt: Date;
}): Invoice {
  return {
    id: invoice.id,
    status: invoice.status,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    currency: invoice.currency,
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    invoicePdfUrl: invoice.invoicePdfUrl,
    createdAt: invoice.createdAt.toISOString(),
  };
}

function formatPaymentMethod(pm: {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  isDefault: boolean;
  cardDetails: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  createdAt: Date;
}): PaymentMethod {
  return {
    id: pm.id,
    type: pm.type,
    isDefault: pm.isDefault,
    cardDetails: pm.cardDetails,
    createdAt: pm.createdAt.toISOString(),
  };
}

function handleError(
  error: unknown,
  ctx: AppContext,
): { status: 400 | 404 | 409 | 500; body: { message: string } } {
  if (
    error instanceof PlanNotFoundError ||
    error instanceof BillingSubscriptionNotFoundError ||
    error instanceof PaymentMethodNotFoundError ||
    error instanceof CustomerNotFoundError
  ) {
    return { status: 404, body: { message: error.message } };
  }
  if (error instanceof BillingSubscriptionExistsError) {
    return { status: 409, body: { message: error.message } };
  }
  if (
    error instanceof PlanNotActiveError ||
    error instanceof SubscriptionAlreadyCanceledError ||
    error instanceof SubscriptionNotCancelingError ||
    error instanceof SubscriptionNotActiveError ||
    error instanceof CannotRemoveDefaultPaymentMethodError
  ) {
    return { status: 400, body: { message: error.message } };
  }
  if (error instanceof BillingProviderNotConfiguredError) {
    return { status: 500, body: { message: 'Billing service is not configured' } };
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return { status: 500, body: { message: 'An error occurred processing your request' } };
}

// ============================================================================
// Plan Handlers
// ============================================================================

/**
 * List all active plans (public endpoint)
 */
export async function handleListPlans(
  ctx: AppContext,
): Promise<{ status: 200; body: PlansListResponse }> {
  const repos = getBillingRepos(ctx);
  const plans = await getActivePlans(repos);

  return {
    status: 200,
    body: {
      plans: plans.map(formatPlan),
    },
  };
}

// ============================================================================
// Subscription Handlers
// ============================================================================

/**
 * Get current user's subscription
 */
export async function handleGetSubscription(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SubscriptionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const subscription = await getUserSubscription(repos, request.user.userId);

    return {
      status: 200,
      body: {
        subscription: subscription !== null ? formatSubscription(subscription) : null,
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Create checkout session
 */
export async function handleCreateCheckout(
  ctx: AppContext,
  body: CheckoutRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: CheckoutResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const session = await createCheckoutSession(repos, provider, {
      userId: request.user.userId,
      email: request.user.email,
      planId: body.planId,
      successUrl: typeof body.successUrl === 'string' && body.successUrl !== '' ? body.successUrl : ctx.config.billing.urls.checkoutSuccessUrl,
      cancelUrl: typeof body.cancelUrl === 'string' && body.cancelUrl !== '' ? body.cancelUrl : ctx.config.billing.urls.checkoutCancelUrl,
    });

    return {
      status: 200,
      body: session,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Cancel subscription
 */
export async function handleCancelSubscription(
  ctx: AppContext,
  body: CancelSubscriptionRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await cancelSubscription(repos, provider, request.user.userId, body.immediately);

    return {
      status: 200,
      body: {
        success: true,
        message: body.immediately === true
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Resume subscription
 */
export async function handleResumeSubscription(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await resumeSubscription(repos, provider, request.user.userId);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Subscription resumed',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Update subscription (change plan)
 */
export async function handleUpdateSubscription(
  ctx: AppContext,
  body: UpdateSubscriptionRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await updateSubscription(repos, provider, request.user.userId, body.planId);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Subscription updated',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Invoice Handlers
// ============================================================================

/**
 * List user's invoices
 */
export async function handleListInvoices(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: InvoicesListResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const { invoices, hasMore } = await getUserInvoices(repos, request.user.userId);

    return {
      status: 200,
      body: {
        invoices: invoices.map(formatInvoice),
        hasMore,
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Payment Method Handlers
// ============================================================================

/**
 * List user's payment methods
 */
export async function handleListPaymentMethods(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: PaymentMethodsListResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const paymentMethods = await getUserPaymentMethods(repos, request.user.userId);

    return {
      status: 200,
      body: {
        paymentMethods: paymentMethods.map(formatPaymentMethod),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Add a payment method
 */
export async function handleAddPaymentMethod(
  ctx: AppContext,
  body: AddPaymentMethodRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: PaymentMethodResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const paymentMethod = await addPaymentMethod(
      repos,
      provider,
      request.user.userId,
      request.user.email,
      body.paymentMethodId,
    );

    return {
      status: 200,
      body: {
        paymentMethod: formatPaymentMethod(paymentMethod),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Remove a payment method
 */
export async function handleRemovePaymentMethod(
  ctx: AppContext,
  paymentMethodId: string,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await removePaymentMethod(repos, provider, request.user.userId, paymentMethodId);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Payment method removed',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Set default payment method
 */
export async function handleSetDefaultPaymentMethod(
  ctx: AppContext,
  paymentMethodId: string,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: PaymentMethodResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const paymentMethod = await setDefaultPaymentMethod(
      repos,
      provider,
      request.user.userId,
      paymentMethodId,
    );

    return {
      status: 200,
      body: {
        paymentMethod: formatPaymentMethod(paymentMethod),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Create setup intent for adding payment method
 */
export async function handleCreateSetupIntent(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: SetupIntentResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  if (request.user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const result = await createSetupIntent(
      repos,
      provider,
      request.user.userId,
      request.user.email,
    );

    return {
      status: 200,
      body: result,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
