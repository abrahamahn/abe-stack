// apps/server/src/infrastructure/billing/factory.ts
/**
 * Billing Provider Factory
 *
 * Creates the appropriate billing provider based on configuration.
 */

import { BillingProviderNotConfiguredError } from '@abe-stack/core';

import { PayPalProvider } from './paypal-provider';
import { StripeProvider } from './stripe-provider';

import type { BillingConfig, PaymentProviderInterface } from './types';

/**
 * Create a billing provider based on configuration
 */
export function createBillingProvider(config: BillingConfig): PaymentProviderInterface {
  switch (config.provider) {
    case 'stripe': {
      if (!config.stripe) {
        throw new BillingProviderNotConfiguredError('stripe');
      }
      return new StripeProvider(config.stripe);
    }

    case 'paypal': {
      if (!config.paypal) {
        throw new BillingProviderNotConfiguredError('paypal');
      }
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
  if (!config.provider) return false;

  switch (config.provider) {
    case 'stripe':
      return Boolean(
        config.stripe?.secretKey &&
        config.stripe?.publishableKey &&
        config.stripe?.webhookSecret,
      );
    case 'paypal':
      return Boolean(
        config.paypal?.clientId &&
        config.paypal?.clientSecret,
      );
    default:
      return false;
  }
}
