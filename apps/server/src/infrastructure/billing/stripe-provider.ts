// apps/server/src/infrastructure/billing/stripe-provider.ts
/**
 * Stripe Payment Provider
 *
 * Full Stripe integration for subscriptions, payment methods, and invoices.
 */

import type {
    BillingService,
    CheckoutParams,
    CheckoutResult,
    CreateProductParams,
    CreateProductResult,
    ProviderInvoice,
    ProviderPaymentMethod,
    ProviderSubscription,
    StripeProviderConfig as StripeConfig,
} from '@abe-stack/core';
import type { SubscriptionStatus } from '@abe-stack/db';
import type StripeLib from 'stripe';

import type { NormalizedEventType, NormalizedWebhookEvent, SetupIntentResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const Stripe = require('stripe');

// ============================================================================
// Stripe Status Mapping
// ============================================================================

/**
 * Map Stripe subscription status to our status type
 */
function mapStripeStatus(stripeStatus: StripeLib.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<StripeLib.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    past_due: 'past_due',
    paused: 'paused',
    trialing: 'trialing',
    unpaid: 'unpaid',
  };
  return statusMap[stripeStatus];
}

/**
 * Map Stripe invoice status to our status type
 */
function mapStripeInvoiceStatus(
  stripeStatus: StripeLib.Invoice.Status | null,
): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
  if (stripeStatus == null) return 'draft';
  const statusMap: Record<string, 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'> = {
    draft: 'draft',
    open: 'open',
    paid: 'paid',
    void: 'void',
    uncollectible: 'uncollectible',
  };
  return statusMap[stripeStatus] ?? 'draft';
}

/**
 * Map Stripe event type to normalized event type
 */
function mapStripeEventType(stripeType: string): NormalizedEventType {
  const typeMap: Record<string, NormalizedEventType> = {
    ['customer.subscription.created']: 'subscription.created',
    ['customer.subscription.updated']: 'subscription.updated',
    ['customer.subscription.deleted']: 'subscription.canceled',
    ['invoice.paid']: 'invoice.paid',
    ['invoice.payment_failed']: 'invoice.payment_failed',
    ['charge.refunded']: 'refund.created',
    ['charge.dispute.created']: 'chargeback.created',
  };
  return typeMap[stripeType] ?? 'unknown';
}

// ============================================================================
// Stripe Provider Implementation
// ============================================================================

export class StripeProvider implements BillingService {
  readonly provider = 'stripe' as const;

  private stripe: StripeLib;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
    this.webhookSecret = config.webhookSecret;
  }

  // -------------------------------------------------------------------------
  // Customer Management
  // -------------------------------------------------------------------------

  async createCustomer(userId: string, email: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });
    return customer.id;
  }

  // -------------------------------------------------------------------------
  // Checkout & Subscriptions
  // -------------------------------------------------------------------------

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const sessionParams: StripeLib.Checkout.SessionCreateParams = {
      customer: params.userId, // This should be the Stripe customer ID
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        ...params.metadata,
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          planId: params.planId,
        },
      },
    };

    // Add trial if specified
    if (params.trialDays !== undefined && params.trialDays > 0) {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        trial_period_days: params.trialDays,
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    if (session.url == null || session.url === '') {
      throw new Error('Failed to create checkout session URL');
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async cancelSubscription(subscriptionId: string, immediately = false): Promise<void> {
    if (immediately) {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<void> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];

    if (currentItem == null) {
      throw new Error('Subscription has no items');
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItem.id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    const currentItem = subscription.items.data[0];
    const priceId = currentItem?.price.id ?? '';
    // In newer Stripe API, period info is on the subscription item
    const periodStart = currentItem?.current_period_start ?? subscription.start_date;
    const periodEnd = currentItem?.current_period_end ?? subscription.start_date;

    return {
      id: subscription.id,
      customerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      status: mapStripeStatus(subscription.status),
      priceId,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at != null ? new Date(subscription.canceled_at * 1000) : null,
      trialEnd: subscription.trial_end != null ? new Date(subscription.trial_end * 1000) : null,
      metadata: subscription.metadata as Record<string, string>,
    };
  }

  // -------------------------------------------------------------------------
  // Payment Methods
  // -------------------------------------------------------------------------

  async createSetupIntent(customerId: string): Promise<SetupIntentResult> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    if (setupIntent.client_secret == null || setupIntent.client_secret === '') {
      throw new Error('Failed to create setup intent');
    }

    return {
      clientSecret: setupIntent.client_secret,
    };
  }

  async listPaymentMethods(customerId: string): Promise<ProviderPaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Get default payment method
    const customer = await this.stripe.customers.retrieve(customerId);
    const defaultPaymentMethod =
      customer.deleted !== true ? customer.invoice_settings.default_payment_method : null;
    const defaultPaymentMethodId = defaultPaymentMethod != null
      ? typeof defaultPaymentMethod === 'string'
        ? defaultPaymentMethod
        : defaultPaymentMethod.id
      : null;

    return paymentMethods.data.map((pm) => {
      const method: ProviderPaymentMethod = {
        id: pm.id,
        type: 'card' as const,
        isDefault: pm.id === defaultPaymentMethodId,
      };

      if (pm.card != null) {
        method.card = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }

      return method;
    });
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Invoices
  // -------------------------------------------------------------------------

  async listInvoices(customerId: string, limit = 10): Promise<ProviderInvoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map((invoice) => {
      // Access subscription from invoice data (handle different API structures)
      const invData = invoice as unknown as Record<string, unknown>;
      let subscriptionId: string | null = null;
      if (typeof invData['subscription'] === 'string') {
        subscriptionId = invData['subscription'];
      } else if (typeof invData['subscription'] === 'object' && invData['subscription'] != null) {
        subscriptionId = (invData['subscription'] as { id?: string }).id ?? null;
      }

      return {
        id: invoice.id,
        customerId:
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? '',
        subscriptionId,
        status: mapStripeInvoiceStatus(invoice.status),
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        paidAt: invoice.status_transitions.paid_at != null
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        invoicePdfUrl: invoice.invoice_pdf ?? null,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Products & Prices (Admin)
  // -------------------------------------------------------------------------

  async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
    // Create product
    const product = await this.stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata,
    });

    // Create recurring price
    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: params.priceInCents,
      currency: params.currency.toLowerCase(),
      recurring: {
        interval: params.interval,
      },
      metadata: params.metadata,
    });

    return {
      productId: product.id,
      priceId: price.id,
    };
  }

  async updateProduct(productId: string, name: string, description?: string): Promise<void> {
    await this.stripe.products.update(productId, {
      name,
      description: description != null && description !== '' ? description : undefined,
    });
  }

  async archivePrice(priceId: string): Promise<void> {
    await this.stripe.prices.update(priceId, {
      active: false,
    });
  }

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------

  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: Buffer, signature: string): NormalizedWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    const normalizedType = mapStripeEventType(event.type);

    // Extract relevant data based on event type
    let subscriptionId: string | undefined;
    let customerId: string | undefined;
    let invoiceId: string | undefined;
    let status: string | undefined;
    let metadata: Record<string, string> | undefined;

    const eventData = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeLib.Subscription;
        subscriptionId = sub.id;
        customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        status = sub.status;
        metadata = sub.metadata as Record<string, string>;
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const inv = event.data.object as unknown as StripeLib.Invoice;
        invoiceId = inv.id;
        customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        status = inv.status ?? undefined;
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as unknown as StripeLib.Charge;
        customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as unknown as StripeLib.Dispute;
        const disputeCharge = dispute.charge as StripeLib.Charge;
        const chargeCustomer = disputeCharge.customer;
        if (chargeCustomer != null) {
          customerId = typeof chargeCustomer === 'string' ? chargeCustomer : chargeCustomer.id;
        }
        break;
      }
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invData = eventData;
      if (typeof invData.subscription === 'string') {
        subscriptionId = invData.subscription;
      } else if (typeof invData.subscription === 'object' && invData.subscription != null) {
        subscriptionId = (invData.subscription as { id?: string }).id;
      }
    }

    return {
      id: event.id,
      type: normalizedType,
      data: {
        subscriptionId,
        customerId,
        invoiceId,
        status,
        metadata,
        raw: event.data.object,
      },
      createdAt: new Date(event.created * 1000),
    };
  }
}
