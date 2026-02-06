// backend/core/src/billing/webhooks/paypal-webhook.ts
/**
 * PayPal Webhook Handler
 *
 * Handles PayPal webhook events for subscription lifecycle management.
 * Processes events idempotently using the billing events repository
 * to track which events have already been processed.
 */

import { WebhookEventAlreadyProcessedError, WebhookSignatureError } from '@abe-stack/shared';

import { PayPalProvider } from '../paypal-provider';

import type { BillingLogger, WebhookRepositories, WebhookResult } from '../types';
import type { NormalizedWebhookEvent } from '@abe-stack/shared';
import type { PayPalProviderConfig as PayPalConfig } from '@abe-stack/shared/config';

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Handle a PayPal webhook event.
 *
 * Verifies the webhook signature, checks for idempotency,
 * processes the event, and records it as processed.
 *
 * @param payload - Raw request body buffer for signature verification
 * @param signature - Stringified PayPal transmission headers for verification
 * @param config - PayPal provider configuration
 * @param repos - Webhook repositories for event tracking and data updates
 * @param log - Logger for structured logging
 * @returns Webhook processing result with success status and message
 * @throws WebhookSignatureError if signature verification fails
 * @throws WebhookEventAlreadyProcessedError if event was already processed
 * @complexity O(1) per event - sequential database operations
 */
export async function handlePayPalWebhook(
  payload: Buffer,
  signature: string,
  config: PayPalConfig,
  repos: WebhookRepositories,
  log: BillingLogger,
): Promise<WebhookResult> {
  const provider = new PayPalProvider(config);

  // Verify signature
  if (!provider.verifyWebhookSignature(payload, signature)) {
    throw new WebhookSignatureError('paypal');
  }

  // Parse event
  const event = provider.parseWebhookEvent(payload, signature);

  // Check idempotency
  const alreadyProcessed = await repos.billingEvents.wasProcessed('paypal', event.id);
  if (alreadyProcessed) {
    log.info({ eventId: event.id }, 'Webhook event already processed, skipping');
    throw new WebhookEventAlreadyProcessedError(event.id);
  }

  // Process event based on type
  try {
    await processEvent(event, repos, log);

    // Record event as processed
    await repos.billingEvents.recordEvent({
      provider: 'paypal',
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
 * @param event - Normalized webhook event from PayPal
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - delegates to specific handler
 */
async function processEvent(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: BillingLogger,
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
      handleRefundCreated(event, log);
      break;

    case 'chargeback.created':
      handleChargebackCreated(event, log);
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
 * Handle subscription.created event from PayPal.
 *
 * Creates a new subscription record and customer mapping if needed.
 * PayPal subscriptions use metadata embedded in the custom_id field.
 *
 * @param event - Normalized subscription creation event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - sequential database operations
 */
async function handleSubscriptionCreated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: BillingLogger,
): Promise<void> {
  const { subscriptionId, customerId, status, metadata } = event.data;

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.created event');
    return;
  }

  // Parse metadata to get userId and planId
  const userId = metadata?.['userId'];
  const planId = metadata?.['planId'];

  if (typeof userId !== 'string' || userId === '' || typeof planId !== 'string' || planId === '') {
    log.warn({ event }, 'Missing userId or planId in subscription metadata');
    return;
  }

  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    log.warn({ planId }, 'Plan not found');
    return;
  }

  // Get subscription details from raw data
  const raw = event.data.raw as {
    resource?: {
      start_time?: string;
      billing_info?: {
        next_billing_time?: string;
      };
    };
  };

  const startTimeValue = raw.resource?.start_time;
  const startTime =
    typeof startTimeValue === 'string' && startTimeValue !== ''
      ? new Date(startTimeValue)
      : new Date();

  const nextBillingTimeValue = raw.resource?.billing_info?.next_billing_time;
  const nextBillingTime =
    typeof nextBillingTimeValue === 'string' && nextBillingTimeValue !== ''
      ? new Date(nextBillingTimeValue)
      : new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create or update customer mapping
  if (typeof customerId === 'string' && customerId !== '') {
    const existingMapping = await repos.customerMappings.findByProviderCustomerId(
      'paypal',
      customerId,
    );
    if (existingMapping === null) {
      await repos.customerMappings.create({
        userId,
        provider: 'paypal',
        providerCustomerId: customerId,
      });
    }
  }

  // Create subscription record
  await repos.subscriptions.create({
    userId,
    planId: plan.id,
    provider: 'paypal',
    providerSubscriptionId: subscriptionId,
    providerCustomerId:
      typeof customerId === 'string' && customerId !== '' ? customerId : `paypal_${userId}`,
    status: mapStatus(status),
    currentPeriodStart: startTime,
    currentPeriodEnd: nextBillingTime,
    trialEnd: null,
    metadata: metadata as Record<string, unknown>,
  });

  log.info({ subscriptionId, userId }, 'Created subscription from PayPal webhook');
}

/**
 * Handle subscription.updated event from PayPal.
 *
 * Updates subscription status, billing period, and cancellation state.
 * PayPal SUSPENDED status maps to cancel-at-period-end behavior.
 *
 * @param event - Normalized subscription update event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - database lookup and update
 */
async function handleSubscriptionUpdated(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: BillingLogger,
): Promise<void> {
  const { subscriptionId, status } = event.data;

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.updated event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'paypal',
    subscriptionId,
  );
  if (subscription === null) {
    log.warn({ subscriptionId }, 'Subscription not found');
    return;
  }

  // Get subscription details from raw data
  const raw = event.data.raw as {
    resource?: {
      billing_info?: {
        next_billing_time?: string;
        last_payment?: {
          time?: string;
        };
      };
    };
  };

  const nextBillingTimeValue = raw.resource?.billing_info?.next_billing_time;
  const nextBillingTime =
    typeof nextBillingTimeValue === 'string' && nextBillingTimeValue !== ''
      ? new Date(nextBillingTimeValue)
      : undefined;

  const lastPaymentTimeValue = raw.resource?.billing_info?.last_payment?.time;
  const lastPaymentTime =
    typeof lastPaymentTimeValue === 'string' && lastPaymentTimeValue !== ''
      ? new Date(lastPaymentTimeValue)
      : undefined;

  // SUSPENDED in PayPal means cancel at period end
  const cancelAtPeriodEnd = status === 'SUSPENDED';

  // Build update object conditionally to satisfy exactOptionalPropertyTypes
  const updateData: Parameters<typeof repos.subscriptions.update>[1] = {
    status: mapStatus(status),
    cancelAtPeriodEnd,
  };
  if (lastPaymentTime !== undefined) {
    updateData.currentPeriodStart = lastPaymentTime;
  }
  if (nextBillingTime !== undefined) {
    updateData.currentPeriodEnd = nextBillingTime;
  }

  // Update subscription record
  await repos.subscriptions.update(subscription.id, updateData);

  log.info({ subscriptionId, status }, 'Updated subscription from PayPal webhook');
}

/**
 * Handle subscription.canceled event from PayPal.
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
  log: BillingLogger,
): Promise<void> {
  const { subscriptionId } = event.data;

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.canceled event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'paypal',
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

  log.info({ subscriptionId }, 'Canceled subscription from PayPal webhook');
}

/**
 * Handle invoice.paid event (PAYMENT.SALE.COMPLETED) from PayPal.
 *
 * Records a payment as an invoice record. Resolves the subscription
 * from the sale's billing agreement ID and reactivates past_due subscriptions.
 *
 * @param event - Normalized invoice paid event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - sequential database operations
 */
async function handleInvoicePaid(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: BillingLogger,
): Promise<void> {
  const { invoiceId, subscriptionId } = event.data;

  if (typeof invoiceId !== 'string' || invoiceId === '') {
    log.warn({ event }, 'Missing invoice/sale ID in invoice.paid event');
    return;
  }

  // Get sale details from raw data
  const raw = event.data.raw as {
    resource?: {
      amount?: {
        total?: string;
        currency?: string;
      };
      billing_agreement_id?: string;
      create_time?: string;
    };
  };

  const amountValue = raw.resource?.amount?.total;
  const amount =
    typeof amountValue === 'string' && amountValue !== ''
      ? Math.round(parseFloat(amountValue) * 100)
      : 0;

  const currencyValue = raw.resource?.amount?.currency?.toLowerCase();
  const currency =
    typeof currencyValue === 'string' && currencyValue !== '' ? currencyValue : 'usd';

  const saleTimeValue = raw.resource?.create_time;
  const saleTime =
    typeof saleTimeValue === 'string' && saleTimeValue !== ''
      ? new Date(saleTimeValue)
      : new Date();

  // Find subscription
  let dbSubscriptionId: string | null = null;
  let userId: string | null = null;
  const providerSubscriptionId =
    typeof subscriptionId === 'string' && subscriptionId !== ''
      ? subscriptionId
      : raw.resource?.billing_agreement_id;

  if (typeof providerSubscriptionId === 'string' && providerSubscriptionId !== '') {
    const subscription = await repos.subscriptions.findByProviderSubscriptionId(
      'paypal',
      providerSubscriptionId,
    );
    if (subscription !== null) {
      dbSubscriptionId = subscription.id;
      userId = subscription.userId;

      // Update subscription status to active if it was past_due
      if (subscription.status === 'past_due') {
        await repos.subscriptions.update(subscription.id, {
          status: 'active',
        });
      }
    }
  }

  if (typeof userId !== 'string' || userId === '') {
    log.warn({ invoiceId }, 'Could not determine userId for PayPal sale');
    return;
  }

  // Upsert invoice record
  await repos.invoices.upsert({
    userId,
    subscriptionId: dbSubscriptionId,
    provider: 'paypal',
    providerInvoiceId: invoiceId,
    status: 'paid',
    amountDue: amount,
    amountPaid: amount,
    currency,
    periodStart: saleTime,
    periodEnd: saleTime,
    paidAt: saleTime,
    invoicePdfUrl: null, // PayPal doesn't provide invoice PDFs like Stripe
  });

  log.info({ invoiceId }, 'Recorded paid sale from PayPal webhook');
}

/**
 * Handle invoice.payment_failed event (PAYMENT.SALE.DENIED) from PayPal.
 *
 * Marks the associated subscription as past_due.
 * Resolves the subscription from the sale's billing agreement ID.
 *
 * @param event - Normalized invoice payment failed event
 * @param repos - Webhook repositories for data operations
 * @param log - Logger for structured logging
 * @complexity O(1) - database lookup and update
 */
async function handleInvoicePaymentFailed(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: BillingLogger,
): Promise<void> {
  const { subscriptionId } = event.data;

  // Get subscription ID from raw data if not in normalized data
  const raw = event.data.raw as {
    resource?: {
      billing_agreement_id?: string;
    };
  };
  const providerSubscriptionId =
    typeof subscriptionId === 'string' && subscriptionId !== ''
      ? subscriptionId
      : raw.resource?.billing_agreement_id;

  if (typeof providerSubscriptionId !== 'string' || providerSubscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in invoice.payment_failed event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'paypal',
    providerSubscriptionId,
  );
  if (subscription === null) {
    log.warn({ subscriptionId: providerSubscriptionId }, 'Subscription not found');
    return;
  }

  // Update subscription status to past_due
  await repos.subscriptions.update(subscription.id, {
    status: 'past_due',
  });

  log.info(
    { subscriptionId: providerSubscriptionId },
    'Marked subscription as past_due from PayPal webhook',
  );
}

/**
 * Handle refund.created event (PAYMENT.SALE.REFUNDED) from PayPal.
 *
 * Logs the refund event for auditing purposes.
 *
 * @param event - Normalized refund created event
 * @param log - Logger for audit logging
 * @complexity O(1)
 */
function handleRefundCreated(event: NormalizedWebhookEvent, log: BillingLogger): void {
  // Log refund event for auditing
  log.info({ eventId: event.id, customerId: event.data.customerId }, 'PayPal refund created');
}

/**
 * Handle chargeback.created event (CUSTOMER.DISPUTE.CREATED) from PayPal.
 *
 * Logs the chargeback event at warn level for auditing.
 * This is a serious event that may require additional handling.
 *
 * @param event - Normalized chargeback created event
 * @param log - Logger for audit logging
 * @complexity O(1)
 */
function handleChargebackCreated(event: NormalizedWebhookEvent, log: BillingLogger): void {
  // Log chargeback event for auditing - this is a serious event
  log.warn(
    { eventId: event.id, customerId: event.data.customerId },
    'PayPal chargeback/dispute created',
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map PayPal status strings to the SubscriptionStatus union type.
 *
 * PayPal uses uppercase status names that differ from Stripe's lowercase ones.
 *
 * @param status - Raw PayPal status string (e.g., 'ACTIVE', 'CANCELLED')
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
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'CANCELLED':
    case 'CANCELED':
    case 'EXPIRED':
      return 'canceled';
    case 'SUSPENDED':
      return 'paused';
    case 'APPROVAL_PENDING':
      return 'incomplete';
    case undefined:
    default:
      return 'incomplete';
  }
}
