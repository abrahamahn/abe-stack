// src/server/core/src/billing/webhooks/stripe-webhook.ts
/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Processes events idempotently using the billing events repository
 * to track which events have already been processed.
 */

import {
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
  type Logger as ServerLogger,
  type NormalizedWebhookEvent,
} from '@abe-stack/shared';

import { StripeProvider } from '../stripe-provider';

import type { WebhookRepositories, WebhookResult } from '../types';
import type { StripeProviderConfig as StripeConfig } from '@abe-stack/shared/config';

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Handle a Stripe webhook event.
 *
 * Verifies the webhook signature, checks for idempotency,
 * processes the event, and records it as processed.
 *
 * @param payload - Raw request body buffer for signature verification
 * @param signature - Stripe-Signature header value
 * @param config - Stripe provider configuration with webhook secret
 * @param repos - Webhook repositories for event tracking and data updates
 * @param log - Logger for structured logging
 * @returns Webhook processing result with success status and message
 * @throws WebhookSignatureError if signature verification fails
 * @throws WebhookEventAlreadyProcessedError if event was already processed
 * @complexity O(1) per event - sequential database operations
 */
export async function handleStripeWebhook(
  payload: Buffer,
  signature: string,
  config: StripeConfig,
  repos: WebhookRepositories,
  log: ServerLogger,
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
    const err = error instanceof Error ? error : new Error(String(error));
    log.error(
      { error: err, eventId: event.id, eventType: event.type },
      'Error processing webhook event',
    );
    throw err;
  }
}

// ============================================================================
// Event Router
// ============================================================================

/**
 * Process a webhook event by routing to the appropriate handler.
 *
 * @param event - Normalized webhook event from Stripe
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - delegates to specific handler
 */
async function processEvent(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
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

    case 'unknown':
    default:
      log.info({ eventType: event.type }, 'Unhandled event type');
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle subscription.created event.
 *
 * Creates a new subscription record in the database based on webhook data.
 * Looks up the customer mapping and plan before creating the subscription.
 *
 * @param event - Normalized subscription creation event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - sequential database lookups and insert
 */
async function handleSubscriptionCreated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
): Promise<void> {
  const { subscriptionId, customerId, status, metadata } = event.data;

  if (
    subscriptionId === undefined ||
    subscriptionId === '' ||
    customerId === undefined ||
    customerId === ''
  ) {
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
  const planId = metadata?.['planId'];
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
    trialEnd:
      raw.trial_end !== undefined && raw.trial_end !== null ? new Date(raw.trial_end * 1000) : null,
    metadata: metadata as Record<string, unknown>,
  });

  log.info({ subscriptionId, userId: customerMapping.userId }, 'Created subscription from webhook');
}

/**
 * Handle subscription.updated event.
 *
 * Updates an existing subscription record with new status and period information.
 *
 * @param event - Normalized subscription update event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - database lookup and update
 */
async function handleSubscriptionUpdated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
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

  // Build update object conditionally to satisfy exactOptionalPropertyTypes
  const updateData: Parameters<typeof repos.subscriptions.update>[1] = {
    status: mapStatus(status),
  };
  if (raw.current_period_start !== undefined) {
    updateData.currentPeriodStart = new Date(raw.current_period_start * 1000);
  }
  if (raw.current_period_end !== undefined) {
    updateData.currentPeriodEnd = new Date(raw.current_period_end * 1000);
  }
  if (raw.cancel_at_period_end !== undefined) {
    updateData.cancelAtPeriodEnd = raw.cancel_at_period_end;
  }
  if (raw.canceled_at !== undefined && raw.canceled_at !== null) {
    updateData.canceledAt = new Date(raw.canceled_at * 1000);
  }
  if (raw.trial_end !== undefined && raw.trial_end !== null) {
    updateData.trialEnd = new Date(raw.trial_end * 1000);
  }

  // Update subscription record
  await repos.subscriptions.update(subscription.id, updateData);

  log.info({ subscriptionId, status }, 'Updated subscription from webhook');
}

/**
 * Handle subscription.canceled event.
 *
 * Marks the subscription as canceled in the database.
 *
 * @param event - Normalized subscription cancellation event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - database lookup and update
 */
async function handleSubscriptionCanceled(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
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
 * Handle invoice.paid event.
 *
 * Records or updates an invoice record and reactivates subscriptions
 * that were in past_due status.
 *
 * @param event - Normalized invoice paid event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - sequential database operations
 */
async function handleInvoicePaid(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
): Promise<void> {
  const { invoiceId, customerId, subscriptionId } = event.data;

  if (
    invoiceId === undefined ||
    invoiceId === '' ||
    customerId === undefined ||
    customerId === ''
  ) {
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
 * Handle invoice.payment_failed event.
 *
 * Marks the associated subscription as past_due.
 *
 * @param event - Normalized invoice payment failed event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - database lookup and update
 */
async function handleInvoicePaymentFailed(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: ServerLogger,
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
 * Handle refund.created event.
 *
 * Logs the refund event for auditing purposes.
 * Additional handling (notifications, account flagging) can be added here.
 *
 * @param event - Normalized refund created event
 * @param _repos - Webhook repositories (unused, reserved for future use)
 * @param log - Logger for audit logging
 * @complexity O(1)
 */
function handleRefundCreated(
  event: NormalizedWebhookEvent,
  _repos: WebhookRepositories,
  log: ServerLogger,
): void {
  // Log refund event for auditing
  log.info({ eventId: event.id, customerId: event.data.customerId }, 'Refund created');
}

/**
 * Handle chargeback.created event.
 *
 * Logs the chargeback event at warn level for auditing.
 * This is a serious event that may require additional handling.
 *
 * @param event - Normalized chargeback created event
 * @param _repos - Webhook repositories (unused, reserved for future use)
 * @param log - Logger for audit logging
 * @complexity O(1)
 */
function handleChargebackCreated(
  event: NormalizedWebhookEvent,
  _repos: WebhookRepositories,
  log: ServerLogger,
): void {
  // Log chargeback event for auditing - this is a serious event
  log.warn({ eventId: event.id, customerId: event.data.customerId }, 'Chargeback/dispute created');
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map a string status to the SubscriptionStatus union type.
 *
 * @param status - Raw status string from webhook data
 * @returns Typed subscription status, defaults to 'incomplete' for unknown values
 * @complexity O(1)
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
    case undefined:
    default:
      return 'incomplete';
  }
}
