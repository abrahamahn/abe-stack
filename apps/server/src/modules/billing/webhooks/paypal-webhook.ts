// apps/server/src/modules/billing/webhooks/paypal-webhook.ts
/**
 * PayPal Webhook Handler
 *
 * Handles PayPal webhook events for subscription lifecycle.
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
    PayPalProvider,
    type NormalizedWebhookEvent,
    type PayPalConfig,
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
 * Handle PayPal webhook event
 */
export async function handlePayPalWebhook(
  payload: Buffer,
  signature: string,
  config: PayPalConfig,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
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
      handleRefundCreated(event, log);
      break;

    case 'chargeback.created':
      handleChargebackCreated(event, log);
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

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.created event');
    return;
  }

  // Parse metadata to get userId and planId
  const userId = metadata?.userId;
  const planId = metadata?.planId;

  if (typeof userId !== 'string' || userId === '' || typeof planId !== 'string' || planId === '') {
    log.warn({ event }, 'Missing userId or planId in subscription metadata');
    return;
  }

  const plan = await repos.plans.findById(planId);
  if (!plan) {
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
  const startTime = (typeof startTimeValue === 'string' && startTimeValue !== '') ? new Date(startTimeValue) : new Date();

  const nextBillingTimeValue = raw.resource?.billing_info?.next_billing_time;
  const nextBillingTime = (typeof nextBillingTimeValue === 'string' && nextBillingTimeValue !== '')
    ? new Date(nextBillingTimeValue)
    : new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create or update customer mapping
  if (typeof customerId === 'string' && customerId !== '') {
    const existingMapping = await repos.customerMappings.findByProviderCustomerId(
      'paypal',
      customerId,
    );
    if (!existingMapping) {
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
    providerCustomerId: (typeof customerId === 'string' && customerId !== '') ? customerId : `paypal_${userId}`,
    status: mapStatus(status),
    currentPeriodStart: startTime,
    currentPeriodEnd: nextBillingTime,
    trialEnd: null,
    metadata: metadata as Record<string, unknown>,
  });

  log.info({ subscriptionId, userId }, 'Created subscription from PayPal webhook');
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

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.updated event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'paypal',
    subscriptionId,
  );
  if (!subscription) {
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
  const nextBillingTime = (typeof nextBillingTimeValue === 'string' && nextBillingTimeValue !== '')
    ? new Date(nextBillingTimeValue)
    : undefined;

  const lastPaymentTimeValue = raw.resource?.billing_info?.last_payment?.time;
  const lastPaymentTime = (typeof lastPaymentTimeValue === 'string' && lastPaymentTimeValue !== '')
    ? new Date(lastPaymentTimeValue)
    : undefined;

  // SUSPENDED in PayPal means cancel at period end
  const cancelAtPeriodEnd = status === 'SUSPENDED';

  // Update subscription record
  await repos.subscriptions.update(subscription.id, {
    status: mapStatus(status),
    currentPeriodStart: lastPaymentTime,
    currentPeriodEnd: nextBillingTime,
    cancelAtPeriodEnd,
  });

  log.info({ subscriptionId, status }, 'Updated subscription from PayPal webhook');
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

  if (typeof subscriptionId !== 'string' || subscriptionId === '') {
    log.warn({ event }, 'Missing subscription ID in subscription.canceled event');
    return;
  }

  // Find existing subscription
  const subscription = await repos.subscriptions.findByProviderSubscriptionId(
    'paypal',
    subscriptionId,
  );
  if (!subscription) {
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
 * Handle invoice.paid event (PAYMENT.SALE.COMPLETED)
 */
async function handleInvoicePaid(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
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
  const amount = (typeof amountValue === 'string' && amountValue !== '')
    ? Math.round(parseFloat(amountValue) * 100)
    : 0;

  const currencyValue = raw.resource?.amount?.currency?.toLowerCase();
  const currency = (typeof currencyValue === 'string' && currencyValue !== '') ? currencyValue : 'usd';

  const saleTimeValue = raw.resource?.create_time;
  const saleTime = (typeof saleTimeValue === 'string' && saleTimeValue !== '') ? new Date(saleTimeValue) : new Date();

  // Find subscription
  let dbSubscriptionId: string | null = null;
  let userId: string | null = null;
  const providerSubscriptionId = (typeof subscriptionId === 'string' && subscriptionId !== '')
    ? subscriptionId
    : raw.resource?.billing_agreement_id;

  if (typeof providerSubscriptionId === 'string' && providerSubscriptionId !== '') {
    const subscription = await repos.subscriptions.findByProviderSubscriptionId(
      'paypal',
      providerSubscriptionId,
    );
    if (subscription) {
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
 * Handle invoice.payment_failed event (PAYMENT.SALE.DENIED)
 */
async function handleInvoicePaymentFailed(
  event: NormalizedWebhookEvent,
  repos: WebhookRepositories,
  log: FastifyBaseLogger,
): Promise<void> {
  const { subscriptionId } = event.data;

  // Get subscription ID from raw data if not in normalized data
  const raw = event.data.raw as {
    resource?: {
      billing_agreement_id?: string;
    };
  };
  const providerSubscriptionId = (typeof subscriptionId === 'string' && subscriptionId !== '')
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
  if (!subscription) {
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
 * Handle refund.created event (PAYMENT.SALE.REFUNDED)
 */
function handleRefundCreated(event: NormalizedWebhookEvent, log: FastifyBaseLogger): void {
  // Log refund event for auditing
  log.info({ eventId: event.id, customerId: event.data.customerId }, 'PayPal refund created');

  // Add additional handling if needed (e.g., sending notifications)
}

/**
 * Handle chargeback.created event (CUSTOMER.DISPUTE.CREATED)
 */
function handleChargebackCreated(event: NormalizedWebhookEvent, log: FastifyBaseLogger): void {
  // Log chargeback event for auditing - this is a serious event
  log.warn(
    { eventId: event.id, customerId: event.data.customerId },
    'PayPal chargeback/dispute created',
  );

  // Add additional handling if needed (e.g., alerting, account flagging)
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map PayPal status to SubscriptionStatus type
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
    default:
      return 'incomplete';
  }
}
