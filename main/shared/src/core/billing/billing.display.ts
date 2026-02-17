// main/shared/src/core/billing/billing.display.ts

/**
 * @file Billing Display
 * @description Formatting and display helpers for billing entities: prices, statuses, labels.
 * @module Core/Billing
 */

import type {
  InvoiceStatus,
  PaymentMethodType,
  PlanInterval,
  SubscriptionStatus,
} from './billing.schemas';

// ============================================================================
// Types
// ============================================================================

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral';

// ============================================================================
// Constants
// ============================================================================

const CENTS_PER_DOLLAR = 100;

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format a price from cents to a display string (e.g. "$29.00").
 */
export function formatPrice(priceInCents: number, currency: string): string {
  const amount = priceInCents / CENTS_PER_DOLLAR;
  const currencySymbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase();
  return `${currencySymbol}${amount.toFixed(2)}`;
}

/**
 * Format a price with its billing interval (e.g. "$29.00/mo").
 */
export function formatPriceWithInterval(
  priceInCents: number,
  currency: string,
  interval: PlanInterval,
): string {
  return `${formatPrice(priceInCents, currency)}/${formatPlanInterval(interval)}`;
}

// ============================================================================
// Invoice Status
// ============================================================================

/**
 * Get a human-readable label for an invoice status.
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    paid: 'Paid',
    open: 'Open',
    draft: 'Draft',
    void: 'Void',
    uncollectible: 'Uncollectible',
  };
  return labels[status];
}

/**
 * Get the semantic variant for an invoice status.
 */
export function getInvoiceStatusVariant(status: InvoiceStatus): StatusVariant {
  const variants: Record<InvoiceStatus, StatusVariant> = {
    paid: 'success',
    open: 'warning',
    draft: 'neutral',
    void: 'neutral',
    uncollectible: 'error',
  };
  return variants[status];
}

// ============================================================================
// Subscription Status
// ============================================================================

/**
 * Get a human-readable label for a subscription status.
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
    paused: 'Paused',
    unpaid: 'Unpaid',
  };
  return labels[status];
}

/**
 * Get the semantic variant for a subscription status.
 */
export function getSubscriptionStatusVariant(status: SubscriptionStatus): StatusVariant {
  const variants: Record<SubscriptionStatus, StatusVariant> = {
    active: 'success',
    trialing: 'success',
    past_due: 'warning',
    unpaid: 'warning',
    canceled: 'neutral',
    incomplete: 'warning',
    incomplete_expired: 'error',
    paused: 'neutral',
  };
  return variants[status];
}

// ============================================================================
// Plan Interval
// ============================================================================

/**
 * Format a plan interval as an abbreviation (e.g. 'month' → 'mo', 'year' → 'yr').
 */
export function formatPlanInterval(interval: PlanInterval): string {
  const abbreviations: Record<PlanInterval, string> = {
    month: 'mo',
    year: 'yr',
  };
  return abbreviations[interval];
}

// ============================================================================
// Card Brands
// ============================================================================

/**
 * Get a short display label for a card brand (e.g. 'visa' → 'Visa', 'mastercard' → 'MC').
 */
export function getCardBrandLabel(brand: string): string {
  const brandLower = brand.toLowerCase();
  const labels: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'MC',
    amex: 'Amex',
    american_express: 'Amex',
    discover: 'Disc',
    diners: 'DC',
    diners_club: 'DC',
    jcb: 'JCB',
    unionpay: 'UP',
  };
  return labels[brandLower] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Get a human-readable label for a payment method type (e.g. 'bank_account' → 'Bank Account').
 */
export function getPaymentMethodLabel(type: PaymentMethodType): string {
  const labels: Record<PaymentMethodType, string> = {
    card: 'Card',
    bank_account: 'Bank Account',
    paypal: 'PayPal',
  };
  return labels[type];
}

/**
 * Get an icon/emoji for a payment method type.
 */
export function getPaymentMethodIcon(type: PaymentMethodType): string {
  const icons: Record<PaymentMethodType, string> = {
    card: '\u{1F4B3}',
    bank_account: '\u{1F3E6}',
    paypal: 'PP',
  };
  return icons[type];
}
