// src/server/core/src/billing/handlers.ts
/**
 * Billing Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts instead
 * of binding to Fastify or any specific HTTP framework.
 */

import { HTTP_STATUS } from '@abe-stack/shared';

import { record } from '../audit/service';

import { createBillingProvider } from './factory';
import {
  addPaymentMethod,
  cancelSubscription,
  createCheckoutSession,
  createSetupIntent,
  getActivePlans,
  getUserInvoice,
  getUserInvoices,
  getUserPaymentMethods,
  getUserSubscription,
  removePaymentMethod,
  resumeSubscription,
  setDefaultPaymentMethod,
  updateSubscription,
} from './service';

import type { BillingAppContext, BillingRepositories, BillingRequest } from './types';
import type { AuditRecordParams } from '../audit/types';
import type { Plan as DbPlan, Subscription as DbSubscription } from '@abe-stack/db';
import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  CheckoutResponse,
  Invoice,
  InvoiceResponse,
  InvoicesListResponse,
  PaymentMethod,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  Plan,
  PlanId,
  PlansListResponse,
  SetupIntentResponse,
  Subscription,
  SubscriptionActionResponse,
  SubscriptionId,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  UserId,
} from '@abe-stack/shared/domain';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract billing repositories from the application context.
 *
 * @param ctx - Application context containing repository instances
 * @returns Billing repositories subset
 * @complexity O(1)
 */
function getBillingRepos(ctx: BillingAppContext): BillingRepositories {
  return {
    plans: ctx.repos.plans,
    subscriptions: ctx.repos.subscriptions,
    customerMappings: ctx.repos.customerMappings,
    invoices: ctx.repos.invoices,
    paymentMethods: ctx.repos.paymentMethods,
  };
}

/**
 * Fire-and-forget an audit event. Silently swallows errors so audit
 * failures never affect billing operations.
 *
 * @param ctx - Application context (must have auditEvents on repos)
 * @param params - Audit event parameters
 * @complexity O(1)
 */
function tryAudit(ctx: BillingAppContext, params: AuditRecordParams): void {
  const auditEvents = ctx.repos.auditEvents;
  if (auditEvents === undefined) return;
  record({ auditEvents }, params).catch((err: unknown) => {
    ctx.log.warn({ err }, 'Failed to record audit event');
  });
}

/**
 * Format a database plan record into an API response plan.
 *
 * @param plan - Database plan record with all fields
 * @returns Formatted plan for API response
 * @complexity O(1)
 */
function formatPlan(plan: DbPlan): Plan {
  return {
    id: plan.id as PlanId,
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

/**
 * Format a database subscription record (with plan) into an API response subscription.
 * Converts Date objects to ISO strings for JSON serialization.
 *
 * @param subscription - Database subscription record joined with plan
 * @returns Formatted subscription for API response
 * @complexity O(1)
 */
function formatSubscription(subscription: DbSubscription & { plan: DbPlan }): Subscription {
  return {
    id: subscription.id as SubscriptionId,
    userId: subscription.userId as UserId,
    planId: subscription.planId as PlanId,
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

/**
 * Format a database invoice record into an API response invoice.
 * Converts Date objects to ISO strings for JSON serialization.
 *
 * @param invoice - Database invoice record
 * @returns Formatted invoice for API response
 * @complexity O(1)
 */
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

/**
 * Format a database payment method record into an API response payment method.
 * Converts Date objects to ISO strings for JSON serialization.
 *
 * @param pm - Database payment method record
 * @returns Formatted payment method for API response
 * @complexity O(1)
 */
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

/**
 * Map billing errors to appropriate HTTP status codes and messages.
 * Uses error.name matching for reliability across module boundaries.
 *
 * @param error - The caught error from a billing operation
 * @param ctx - Application context for logging
 * @returns Object with HTTP status code and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: BillingAppContext,
): { status: 400 | 404 | 409 | 500; body: { message: string } } {
  // Use error.name checking for reliability across module boundaries in monorepo setup
  // Note: Error class names are the original class names, not aliases
  // (e.g., SubscriptionNotFoundError, not BillingSubscriptionNotFoundError)
  if (error instanceof Error) {
    const notFoundErrors = [
      'PlanNotFoundError',
      'SubscriptionNotFoundError',
      'PaymentMethodNotFoundError',
      'CustomerNotFoundError',
      'InvoiceNotFoundError',
    ];
    if (notFoundErrors.includes(error.name)) {
      return { status: HTTP_STATUS.NOT_FOUND, body: { message: error.message } };
    }

    if (error.name === 'SubscriptionExistsError') {
      return { status: HTTP_STATUS.CONFLICT, body: { message: error.message } };
    }

    const badRequestErrors = [
      'PlanNotActiveError',
      'SubscriptionAlreadyCanceledError',
      'SubscriptionNotCancelingError',
      'SubscriptionNotActiveError',
      'CannotRemoveDefaultPaymentMethodError',
    ];
    if (badRequestErrors.includes(error.name)) {
      return { status: HTTP_STATUS.BAD_REQUEST, body: { message: error.message } };
    }

    if (error.name === 'ProviderNotConfiguredError') {
      return {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        body: { message: 'Billing service is not configured' },
      };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    body: { message: 'An error occurred processing your request' },
  };
}

// ============================================================================
// Plan Handlers
// ============================================================================

/**
 * List all active billing plans (public endpoint).
 *
 * @param ctx - Application context with repositories
 * @returns 200 response with array of active plans
 * @complexity O(n) where n is the number of active plans
 */
export async function handleListPlans(
  ctx: BillingAppContext,
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
 * Get the current user's subscription.
 *
 * @param ctx - Application context with repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 with subscription data, or error response
 * @complexity O(1) - database lookups
 */
export async function handleGetSubscription(
  ctx: BillingAppContext,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SubscriptionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const subscription = await getUserSubscription(repos, user.userId);

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
 * Create a checkout session for a new subscription.
 *
 * @param ctx - Application context with configuration and repositories
 * @param body - Checkout request containing plan ID and optional redirect URLs
 * @param request - HTTP request with authenticated user
 * @returns 200 with checkout session data, or error response
 * @complexity O(1) - sequential lookups and provider API call
 */
export async function handleCreateCheckout(
  ctx: BillingAppContext,
  body: CheckoutRequest,
  request: BillingRequest,
): Promise<
  | { status: 200; body: CheckoutResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const userId = user.userId;
    const email = user.email;
    const planId = body.planId;
    const successUrl =
      typeof body.successUrl === 'string' && body.successUrl !== ''
        ? body.successUrl
        : ctx.config.billing.urls.checkoutSuccessUrl;
    const cancelUrl =
      typeof body.cancelUrl === 'string' && body.cancelUrl !== ''
        ? body.cancelUrl
        : ctx.config.billing.urls.checkoutCancelUrl;

    // Look up plan to get provider-specific price ID for checkout
    const plan = await repos.plans.findById(planId);
    const priceId = plan?.stripePriceId ?? '';

    const session = await createCheckoutSession(repos, provider, {
      userId,
      email,
      planId,
      priceId,
      successUrl,
      cancelUrl,
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
 * Cancel the current user's subscription.
 *
 * @param ctx - Application context with configuration and repositories
 * @param body - Cancellation request with optional immediately flag
 * @param request - HTTP request with authenticated user
 * @returns 200 with success message, or error response
 * @complexity O(1) - database lookup, provider API call, database update
 */
export async function handleCancelSubscription(
  ctx: BillingAppContext,
  body: CancelSubscriptionRequest,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await cancelSubscription(repos, provider, user.userId, body.immediately);

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'billing.subscription_canceled',
      resource: 'subscription',
      metadata: { immediately: body.immediately },
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    // Fire-and-forget notification
    const cancelNotifRepo = ctx.repos.notifications;
    if (cancelNotifRepo !== undefined) {
      cancelNotifRepo
        .create({
          userId: user.userId,
          type: 'warning',
          title: 'Subscription canceled',
          message: body.immediately
            ? 'Your subscription has been canceled immediately.'
            : 'Your subscription will be canceled at the end of the billing period.',
          data: { immediately: body.immediately },
        })
        .catch(() => {});
    }

    return {
      status: 200,
      body: {
        success: true,
        message: body.immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Resume a subscription that was set to cancel at period end.
 *
 * @param ctx - Application context with configuration and repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 with success message, or error response
 * @complexity O(1) - database lookup, provider API call, database update
 */
export async function handleResumeSubscription(
  ctx: BillingAppContext,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await resumeSubscription(repos, provider, user.userId);

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'billing.subscription_resumed',
      resource: 'subscription',
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

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
 * Update subscription to a new plan.
 *
 * @param ctx - Application context with configuration and repositories
 * @param body - Update request containing the new plan ID
 * @param request - HTTP request with authenticated user
 * @returns 200 with success message, or error response
 * @complexity O(1) - sequential lookups, provider API call, database update
 */
export async function handleUpdateSubscription(
  ctx: BillingAppContext,
  body: UpdateSubscriptionRequest,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await updateSubscription(repos, provider, user.userId, body.planId);

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'billing.plan_changed',
      resource: 'subscription',
      metadata: { newPlanId: body.planId },
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    // Fire-and-forget notification
    const updateNotifRepo = ctx.repos.notifications;
    if (updateNotifRepo !== undefined) {
      updateNotifRepo
        .create({
          userId: user.userId,
          type: 'success',
          title: 'Plan updated',
          message: 'Your subscription plan has been updated successfully.',
          data: { newPlanId: body.planId },
        })
        .catch(() => {});
    }

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
 * List the current user's invoices.
 *
 * @param ctx - Application context with repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 with invoices array and pagination flag, or error response
 * @complexity O(n) where n is the invoice limit
 */
export async function handleListInvoices(
  ctx: BillingAppContext,
  request: BillingRequest,
): Promise<
  | { status: 200; body: InvoicesListResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const { invoices, hasMore } = await getUserInvoices(repos, user.userId);

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

/**
 * Get a single invoice by ID for the current user.
 *
 * @param ctx - Application context with repositories
 * @param invoiceId - Invoice identifier from the URL path
 * @param request - HTTP request with authenticated user
 * @returns 200 with invoice data, or error response
 * @complexity O(1) - database lookup by primary key
 */
export async function handleGetInvoice(
  ctx: BillingAppContext,
  invoiceId: string,
  request: BillingRequest,
): Promise<
  | { status: 200; body: InvoiceResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const invoice = await getUserInvoice(repos, user.userId, invoiceId);

    return {
      status: 200,
      body: {
        invoice: formatInvoice(invoice),
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
 * List the current user's payment methods.
 *
 * @param ctx - Application context with repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 with payment methods array, or error response
 * @complexity O(n) where n is the number of payment methods
 */
export async function handleListPaymentMethods(
  ctx: BillingAppContext,
  request: BillingRequest,
): Promise<
  | { status: 200; body: PaymentMethodsListResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const paymentMethods = await getUserPaymentMethods(repos, user.userId);

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
 * Add a new payment method to the current user's account.
 *
 * @param ctx - Application context with configuration and repositories
 * @param body - Request containing the provider payment method ID
 * @param request - HTTP request with authenticated user
 * @returns 200 with the created payment method, or error response
 * @complexity O(n) where n is the number of existing payment methods
 */
export async function handleAddPaymentMethod(
  ctx: BillingAppContext,
  body: AddPaymentMethodRequest,
  request: BillingRequest,
): Promise<
  | { status: 200; body: PaymentMethodResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
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
      user.userId,
      user.email,
      body.paymentMethodId,
    );

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'billing.payment_method_added',
      resource: 'payment_method',
      resourceId: paymentMethod.id,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

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
 * Remove a payment method from the current user's account.
 *
 * @param ctx - Application context with configuration and repositories
 * @param paymentMethodId - Database identifier of the payment method to remove
 * @param request - HTTP request with authenticated user
 * @returns 200 with success message, or error response
 * @complexity O(1) - database lookups and provider API call
 */
export async function handleRemovePaymentMethod(
  ctx: BillingAppContext,
  paymentMethodId: string,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    await removePaymentMethod(repos, provider, user.userId, paymentMethodId);

    tryAudit(ctx, {
      actorId: user.userId,
      action: 'billing.payment_method_removed',
      resource: 'payment_method',
      resourceId: paymentMethodId,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

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
 * Set a payment method as the default for the current user.
 *
 * @param ctx - Application context with configuration and repositories
 * @param paymentMethodId - Database identifier of the payment method to set as default
 * @param request - HTTP request with authenticated user
 * @returns 200 with the updated payment method, or error response
 * @complexity O(1) - database lookups and provider API call
 */
export async function handleSetDefaultPaymentMethod(
  ctx: BillingAppContext,
  paymentMethodId: string,
  request: BillingRequest,
): Promise<
  | { status: 200; body: PaymentMethodResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
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
      user.userId,
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
 * Create a setup intent for adding a new payment method.
 *
 * @param ctx - Application context with configuration and repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 with client secret for frontend setup, or error response
 * @complexity O(1) - customer lookup/creation and provider API call
 */
export async function handleCreateSetupIntent(
  ctx: BillingAppContext,
  request: BillingRequest,
): Promise<
  | { status: 200; body: SetupIntentResponse }
  | { status: 400 | 401 | 404 | 409 | 500; body: { message: string } }
> {
  const user = request.user;
  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const result = await createSetupIntent(repos, provider, user.userId, user.email);

    return {
      status: 200,
      body: result,
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
