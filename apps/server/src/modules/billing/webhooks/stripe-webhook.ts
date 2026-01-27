// apps/server/src/modules/billing/webhooks/stripe-webhook.ts
/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle.
 */

import { WebhookEventAlreadyProcessedError, WebhookSignatureError } from '@abe-stack/core';
import type {
    BillingEventRepository,
    CustomerMappingRepository,
    InvoiceRepository,
    PlanRepository,
    SubscriptionRepository,
} from '@abe-stack/db';

import {
    StripeProvider,
    type NormalizedWebhookEvent,
    type StripeConfig,
} from '@infrastructure/billing';

import type { FastifyBaseLogger } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface WebhookRepositories {
  billingEvents: BillingEventRepository;
  subscriptions: SubscriptionRepository;
  invoices: InvoiceRepository;
  plans: PlanRepository;
  customerMappings: CustomerMappingRepository;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  eventId?: string;
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Handle Stripe webhook event
 */
export async function handleStripeWebhook(
  payload: Buffer,
  signature: string,
  config: StripeConfig,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<WebhookResult> {
  const provider = new StripeProvider(config);

  // Verify signature
  if (!provider.verifyWebhookSignature(payload, signature)) {
    throw new WebhookSignatureError('stripe');
  }

  // Parse event
  const event = provider.parseWebhookEvent(payload, signature);

  // Check idempotency
  const alreadyProcessed = await repos.billingEvents.wasProcessed('stripe', event.id);
  if (alreadyProcessed) {
    log.info({ eventId: event.id }, 'Webhook event already processed, skipping');
    throw new WebhookEventAlreadyProcessedError(event.id);
  }

  // Process event based on type
  try {
    await processEvent(event, repos, log);

    // Record event as processed
    await repos.billingEvents.recordEvent({
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type as
        | 'subscription.created'
        | 'subscription.updated'
        | 'subscription.canceled'
        | 'invoice.paid'
        | 'invoice.payment_failed'
        | 'refund.created'
        | 'chargeback.created',
      payload: event.data.raw as Record<string, unknown>,
      processedAt: new Date(),
    });

    return {
      success: true,
      message: `Processed ${event.type} event`,
      eventId: event.id,
    };
  } catch (error) {
    log.error(
      { error, eventId: event.id, eventType: event.type },
      'Error processing webhook event',
    );
    throw error;
  }
}

/**
 * Process webhook event based on type
 */
async function processEvent(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  switch (event.type) {
    case 'subscription.created':
      await handleSubscriptionCreated(event, repos, log);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(event, repos, log);
      break;

    case 'subscription.canceled':
      await handleSubscriptionCanceled(event, repos, log);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event, repos, log);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event, repos, log);
      break;

    case 'refund.created':
      handleRefundCreated(event, repos, log);
      break;

    case 'chargeback.created':
      handleChargebackCreated(event, repos, log);
      break;

    default:
      log.info({ eventType: event.type }, 'Unhandled event type');
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { subscriptionId, customerId, status, metadata } = event.data;

  if (subscriptionId === undefined || subscriptionId === '' || customerId === undefined || customerId === '') {
    log.warn({ event }, 'Missing subscription or customer ID in subscription.created event');
    return;
  }

  // Find user by customer mapping
  const customerMapping = await repos.customerMappings.findByProviderCustomerId(
    'stripe',
    customerId,
  );
  if (customerMapping === null) {
    log.warn({ customerId }, 'No customer mapping found for Stripe customer');
    return;
  }

  // Find plan by metadata or Stripe price ID
  const planId = metadata?.planId;
  if (planId === undefined || planId === '' || typeof planId !== 'string') {
    log.warn({ event }, 'No planId in subscription metadata');
    return;
  }

  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    log.warn({ planId }, 'Plan not found');
    return;
  }

  // Get subscription details from raw data
  const raw = event.data.raw as {
    current_period_start?: number;
    current_period_end?: number;
    trial_end?: number | null;
  };

  // Create subscription record
  await repos.subscriptions.create({
    userId: customerMapping.userId,
    planId: plan.id,
    provider: 'stripe',
    providerSubscriptionId: subscriptionId,
    providerCustomerId: customerId,
    status: mapStatus(status),
    currentPeriodStart: new Date((raw.current_period_start ?? 0) * 1000),
    currentPeriodEnd: new Date((raw.current_period_end ?? 0) * 1000),
    trialEnd: (raw.trial_end !== undefined && raw.trial_end !== null) ? new Date(raw.trial_end * 1000) : null,
    metadata: metadata as Record<string, unknown>,
  });

  log.info({ subscriptionId, userId: customerMapping.userId }, 'Created subscription from webhook');
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { subscriptionId, status } = event.data;

  if (subscriptionId === undefined || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.updated event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'stripe',
    subscriptionId,
  );
  if (subscription === null) {
    log.warn({ subscriptionId }, 'Subscription not found');
    return;
  }

  // Get subscription details from raw data
  const raw = event.data.raw as {
    current_period_start?: number;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    canceled_at?: number | null;
    trial_end?: number | null;
  };

  // Update subscription record
  await repos.subscriptions.update(subscription.id, {
    status: mapStatus(status),
    currentPeriodStart: raw.current_period_start !== undefined
      ? new Date(raw.current_period_start * 1000)
      : undefined,
    currentPeriodEnd: raw.current_period_end !== undefined ? new Date(raw.current_period_end * 1000) : undefined,
    cancelAtPeriodEnd: raw.cancel_at_period_end,
    canceledAt: (raw.canceled_at !== undefined && raw.canceled_at !== null) ? new Date(raw.canceled_at * 1000) : undefined,
    trialEnd: (raw.trial_end !== undefined && raw.trial_end !== null) ? new Date(raw.trial_end * 1000) : undefined,
  });

  log.info({ subscriptionId, status }, 'Updated subscription from webhook');
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { subscriptionId } = event.data;

  if (subscriptionId === undefined || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.canceled event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'stripe',
    subscriptionId,
  );
  if (subscription === null) {
    log.warn({ subscriptionId }, 'Subscription not found');
    return;
  }

  // Update subscription record
  await repos.subscriptions.update(subscription.id, {
    status: 'canceled',
    canceledAt: new Date(),
  });

  log.info({ subscriptionId }, 'Canceled subscription from webhook');
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { invoiceId, customerId, subscriptionId } = event.data;

  if (invoiceId === undefined || invoiceId === '' || customerId === undefined || customerId === '') {
    log.warn({ event }, 'Missing invoice or customer ID in invoice.paid event');
    return;
  }

  // Find user by customer mapping
  const customerMapping = await repos.customerMappings.findByProviderCustomerId(
    'stripe',
    customerId,
  );
  if (customerMapping === null) {
    log.warn({ customerId }, 'No customer mapping found for Stripe customer');
    return;
  }

  // Get invoice details from raw data
  const raw = event.data.raw as {
    amount_due?: number;
    amount_paid?: number;
    currency?: string;
    period_start?: number;
    period_end?: number;
    invoice_pdf?: string | null;
  };

  // Find or get subscription ID
  let dbSubscriptionId: string | null = null;
  if (subscriptionId !== undefined && subscriptionId !== '') {
    const subscription = await repos.subscriptions.findByProviderSubscriptionId(
      'stripe',
      subscriptionId,
    );
    dbSubscriptionId = subscription?.id ?? null;
  }

  // Upsert invoice record
  await repos.invoices.upsert({
    userId: customerMapping.userId,
    subscriptionId: dbSubscriptionId,
    provider: 'stripe',
    providerInvoiceId: invoiceId,
    status: 'paid',
    amountDue: raw.amount_due ?? 0,
    amountPaid: raw.amount_paid ?? 0,
    currency: raw.currency ?? 'usd',
    periodStart: new Date((raw.period_start ?? 0) * 1000),
    periodEnd: new Date((raw.period_end ?? 0) * 1000),
    paidAt: new Date(),
    invoicePdfUrl: raw.invoice_pdf ?? null,
  });

  // Update subscription status to active if it was past_due
  if (subscriptionId !== undefined && subscriptionId !== '') {
    const subscription = await repos.subscriptions.findByProviderSubscriptionId(
      'stripe',
      subscriptionId,
    );
    if (subscription !== null && subscription.status === 'past_due') {
      await repos.subscriptions.update(subscription.id, {
        status: 'active',
      });
    }
  }

  log.info({ invoiceId }, 'Recorded paid invoice from webhook');
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { subscriptionId } = event.data;

  if (subscriptionId === undefined || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in invoice.payment_failed event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'stripe',
    subscriptionId,
  );
  if (subscription === null) {
    log.warn({ subscriptionId }, 'Subscription not found');
    return;
  }

  // Update subscription status to past_due
  await repos.subscriptions.update(subscription.id, {
    status: 'past_due',
  });

  log.info({ subscriptionId }, 'Marked subscription as past_due from webhook');
}

/**
 * Handle refund.created event
 */
function handleRefundCreated(
  event: NormalizedWebhookEvent,
  _repos: WebhookRepositories,
  log: FastifyBaseLogger,
): void {
  // Log refund event for auditing
  log.info({ eventId: event.id, customerId: event.data.customerId }, 'Refund created');

  // Add additional handling if needed (e.g., sending notifications)
}

/**
 * Handle chargeback.created event
 */
function handleChargebackCreated(
  event: NormalizedWebhookEvent,
  _repos: WebhookRepositories,
  log: FastifyBaseLogger,
): void {
  // Log chargeback event for auditing - this is a serious event
  log.warn({ eventId: event.id, customerId: event.data.customerId }, 'Chargeback/dispute created');

  // Add additional handling if needed (e.g., alerting, account flagging)
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map string status to SubscriptionStatus type
 */
function mapStatus(
  status: string | undefined,
):
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid' {
  switch (status) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'incomplete_expired';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'trialing':
      return 'trialing';
    case 'unpaid':
      return 'unpaid';
    default:
      return 'incomplete';
  }
}
