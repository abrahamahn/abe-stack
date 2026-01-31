// modules/billing/src/factory.ts
/**
 * Billing Provider Factory
 *
 * Creates the appropriate billing provider based on configuration.
 */

import { BillingProviderNotConfiguredError } from '@abe-stack/core';

import { PayPalProvider } from './paypal-provider';
import { StripeProvider } from './stripe-provider';

import type {
    BillingConfig,
    BillingService,
    CheckoutParams,
    CheckoutResult,
    CreateProductParams,
    CreateProductResult,
    NormalizedWebhookEvent,
    ProviderInvoice,
    ProviderPaymentMethod,
    ProviderSubscription,
    SetupIntentResult,
} from '@abe-stack/core';

/**
 * Disabled billing provider that throws errors for all operations.
 * Used when billing is not configured.
 */
class DisabledBillingProvider implements BillingService {
  readonly provider = 'stripe' as const;

  private throwDisabled(): never {
    throw new Error('Billing is not configured. Set BILLING_PROVIDER and required credentials.');
  }

  createCustomer(_userId: string, _email: string): Promise<string> {
    this.throwDisabled();
  }

  createCheckoutSession(_params: CheckoutParams): Promise<CheckoutResult> {
    this.throwDisabled();
  }

  cancelSubscription(_subscriptionId: string, _immediately?: boolean): Promise<void> {
    this.throwDisabled();
  }

  resumeSubscription(_subscriptionId: string): Promise<void> {
    this.throwDisabled();
  }

  updateSubscription(_subscriptionId: string, _newPriceId: string): Promise<void> {
    this.throwDisabled();
  }

  getSubscription(_subscriptionId: string): Promise<ProviderSubscription> {
    this.throwDisabled();
  }

  createSetupIntent(_customerId: string): Promise<SetupIntentResult> {
    this.throwDisabled();
  }

  listPaymentMethods(_customerId: string): Promise<ProviderPaymentMethod[]> {
    this.throwDisabled();
  }

  attachPaymentMethod(_customerId: string, _paymentMethodId: string): Promise<void> {
    this.throwDisabled();
  }

  detachPaymentMethod(_paymentMethodId: string): Promise<void> {
    this.throwDisabled();
  }

  setDefaultPaymentMethod(_customerId: string, _paymentMethodId: string): Promise<void> {
    this.throwDisabled();
  }

  listInvoices(_customerId: string, _limit?: number): Promise<ProviderInvoice[]> {
    this.throwDisabled();
  }

  createProduct(_params: CreateProductParams): Promise<CreateProductResult> {
    this.throwDisabled();
  }

  updateProduct(_productId: string, _name: string, _description?: string): Promise<void> {
    this.throwDisabled();
  }

  archivePrice(_priceId: string): Promise<void> {
    this.throwDisabled();
  }

  verifyWebhookSignature(_payload: Buffer, _signature: string): boolean {
    return false;
  }

  parseWebhookEvent(_payload: Buffer, _signature: string): NormalizedWebhookEvent {
    this.throwDisabled();
  }
}

/**
 * Create a billing provider based on configuration
 *
 * Returns a disabled no-op provider if billing is not enabled.
 */
export function createBillingProvider(config: BillingConfig): BillingService {
  // Return disabled provider if billing is not enabled
  if (!config.enabled) {
    return new DisabledBillingProvider();
  }

  switch (config.provider) {
    case 'stripe': {
      return new StripeProvider(config.stripe);
    }

    case 'paypal': {
      return new PayPalProvider(config.paypal);
    }

    default:
      throw new BillingProviderNotConfiguredError(config.provider);
  }
}

/**
 * Check if billing is configured
 */
export function isBillingConfigured(config: Partial<BillingConfig>): boolean {
  if (config.provider == null) return false;

  switch (config.provider) {
    case 'stripe':
      if (config.stripe == null) return false;
      return (
        config.stripe.secretKey !== '' &&
        config.stripe.publishableKey !== '' &&
        config.stripe.webhookSecret !== ''
      );
    case 'paypal':
      if (config.paypal == null) return false;
      return config.paypal.clientId !== '' && config.paypal.clientSecret !== '';
    default:
      return false;
  }
}
