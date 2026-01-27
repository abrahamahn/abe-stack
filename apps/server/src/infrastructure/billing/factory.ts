// apps/server/src/infrastructure/billing/factory.ts
/**
 * Billing Provider Factory
 *
 * Creates the appropriate billing provider based on configuration.
 */

import { BillingProviderNotConfiguredError } from '@abe-stack/core';
import type { BillingConfig, BillingService } from '@abe-stack/core';

import { PayPalProvider } from './paypal-provider';
import { StripeProvider } from './stripe-provider';

/**
 * Create a billing provider based on configuration
 */
export function createBillingProvider(config: BillingConfig): BillingService {
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
