// main/shared/src/core/billing/billing.display.test.ts

/**
 * @file Billing Display Tests
 * @description Unit tests for billing formatting and display helpers.
 * @module Core/Billing/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
} from '../constants/billing';

import {
  formatPlanInterval,
  formatPrice,
  formatPriceWithInterval,
  getCardBrandLabel,
  getInvoiceStatusLabel,
  getInvoiceStatusVariant,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from './billing.display';

import type { StatusVariant } from './billing.display';
import type {
  InvoiceStatus,
  PaymentMethodType,
  PlanInterval,
  SubscriptionStatus,
} from './billing.schemas';

describe('billing.display', () => {
  describe('formatPrice', () => {
    it('formats USD prices', () => {
      expect(formatPrice(2900, 'usd')).toBe('$29.00');
      expect(formatPrice(2900, 'USD')).toBe('$29.00');
    });

    it('formats zero price', () => {
      expect(formatPrice(0, 'usd')).toBe('$0.00');
    });

    it('formats non-USD currencies with uppercase symbol', () => {
      expect(formatPrice(1500, 'eur')).toBe('EUR15.00');
      expect(formatPrice(1500, 'gbp')).toBe('GBP15.00');
    });

    it('handles fractional cents correctly', () => {
      expect(formatPrice(999, 'usd')).toBe('$9.99');
      expect(formatPrice(1, 'usd')).toBe('$0.01');
    });
  });

  describe('formatPriceWithInterval', () => {
    it('formats price with month interval', () => {
      expect(formatPriceWithInterval(2900, 'usd', 'month')).toBe('$29.00/mo');
    });

    it('formats price with year interval', () => {
      expect(formatPriceWithInterval(29900, 'usd', 'year')).toBe('$299.00/yr');
    });
  });

  describe('getInvoiceStatusLabel', () => {
    const expectedLabels: Record<InvoiceStatus, string> = {
      paid: 'Paid',
      open: 'Open',
      draft: 'Draft',
      past_due: 'Past Due',
      void: 'Void',
      uncollectible: 'Uncollectible',
    };

    it('returns a label for every invoice status', () => {
      for (const status of INVOICE_STATUSES) {
        expect(getInvoiceStatusLabel(status)).toBe(expectedLabels[status]);
      }
    });
  });

  describe('getInvoiceStatusVariant', () => {
    const expectedVariants: Record<InvoiceStatus, StatusVariant> = {
      paid: 'success',
      open: 'warning',
      draft: 'neutral',
      past_due: 'warning',
      void: 'neutral',
      uncollectible: 'error',
    };

    it('returns a variant for every invoice status', () => {
      for (const status of INVOICE_STATUSES) {
        expect(getInvoiceStatusVariant(status)).toBe(expectedVariants[status]);
      }
    });
  });

  describe('getSubscriptionStatusLabel', () => {
    const expectedLabels: Record<SubscriptionStatus, string> = {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Past Due',
      canceled: 'Canceled',
      incomplete: 'Incomplete',
      incomplete_expired: 'Expired',
      paused: 'Paused',
      unpaid: 'Unpaid',
    };

    it('returns a label for every subscription status', () => {
      for (const status of SUBSCRIPTION_STATUSES) {
        expect(getSubscriptionStatusLabel(status)).toBe(expectedLabels[status]);
      }
    });
  });

  describe('getSubscriptionStatusVariant', () => {
    const expectedVariants: Record<SubscriptionStatus, StatusVariant> = {
      active: 'success',
      trialing: 'success',
      past_due: 'warning',
      unpaid: 'warning',
      canceled: 'neutral',
      incomplete: 'warning',
      incomplete_expired: 'error',
      paused: 'neutral',
    };

    it('returns a variant for every subscription status', () => {
      for (const status of SUBSCRIPTION_STATUSES) {
        expect(getSubscriptionStatusVariant(status)).toBe(expectedVariants[status]);
      }
    });
  });

  describe('formatPlanInterval', () => {
    const expectedAbbreviations: Record<PlanInterval, string> = {
      month: 'mo',
      year: 'yr',
    };

    it('abbreviates every plan interval', () => {
      for (const interval of PLAN_INTERVALS) {
        expect(formatPlanInterval(interval)).toBe(expectedAbbreviations[interval]);
      }
    });
  });

  describe('getCardBrandLabel', () => {
    it('returns short labels for known brands', () => {
      expect(getCardBrandLabel('visa')).toBe('Visa');
      expect(getCardBrandLabel('mastercard')).toBe('MC');
      expect(getCardBrandLabel('amex')).toBe('Amex');
      expect(getCardBrandLabel('american_express')).toBe('Amex');
      expect(getCardBrandLabel('discover')).toBe('Disc');
      expect(getCardBrandLabel('diners')).toBe('DC');
      expect(getCardBrandLabel('diners_club')).toBe('DC');
      expect(getCardBrandLabel('jcb')).toBe('JCB');
      expect(getCardBrandLabel('unionpay')).toBe('UP');
    });

    it('is case-insensitive', () => {
      expect(getCardBrandLabel('VISA')).toBe('Visa');
      expect(getCardBrandLabel('Mastercard')).toBe('MC');
    });

    it('capitalizes unknown brands', () => {
      expect(getCardBrandLabel('newbrand')).toBe('Newbrand');
    });
  });

  describe('getPaymentMethodLabel', () => {
    const expectedLabels: Record<PaymentMethodType, string> = {
      card: 'Card',
      bank_account: 'Bank Account',
      paypal: 'PayPal',
    };

    it('returns a label for every payment method type', () => {
      for (const type of PAYMENT_METHOD_TYPES) {
        expect(getPaymentMethodLabel(type)).toBe(expectedLabels[type]);
      }
    });
  });

  describe('getPaymentMethodIcon', () => {
    it('returns an icon for every payment method type', () => {
      for (const type of PAYMENT_METHOD_TYPES) {
        const icon = getPaymentMethodIcon(type);
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe('string');
      }
    });

    it('returns credit card emoji for card type', () => {
      expect(getPaymentMethodIcon('card')).toBe('\u{1F4B3}');
    });

    it('returns bank emoji for bank_account type', () => {
      expect(getPaymentMethodIcon('bank_account')).toBe('\u{1F3E6}');
    });

    it('returns PP for paypal type', () => {
      expect(getPaymentMethodIcon('paypal')).toBe('PP');
    });
  });
});
