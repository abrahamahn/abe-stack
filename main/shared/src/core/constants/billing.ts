// main/shared/src/core/constants/billing.ts

/**
 * @file Billing Constants
 * @description Feature keys, plans, subscriptions, invoices, and payment types.
 * @module Core/Constants/Billing
 */

// ============================================================================
// Feature Keys
// ============================================================================

export const FEATURE_KEYS = {
  PROJECTS: 'projects:limit',
  STORAGE: 'storage:limit',
  TEAM_MEMBERS: 'team:invite',
  API_ACCESS: 'api:access',
  CUSTOM_BRANDING: 'branding:custom',
  MEDIA_PROCESSING: 'media:processing',
  MEDIA_MAX_FILE_SIZE_MB: 'media:max_file_size',
} as const;

export const LIMIT_FEATURE_KEYS = [
  FEATURE_KEYS.PROJECTS,
  FEATURE_KEYS.STORAGE,
  FEATURE_KEYS.MEDIA_MAX_FILE_SIZE_MB,
] as const;

export const TOGGLE_FEATURE_KEYS = [
  FEATURE_KEYS.TEAM_MEMBERS,
  FEATURE_KEYS.API_ACCESS,
  FEATURE_KEYS.CUSTOM_BRANDING,
  FEATURE_KEYS.MEDIA_PROCESSING,
] as const;

// ============================================================================
// Providers & Payment
// ============================================================================

export const BILLING_PROVIDERS = ['stripe', 'paypal'] as const;
export const PAYMENT_METHOD_TYPES = ['card', 'bank_account', 'paypal'] as const;
export const CENTS_PER_DOLLAR = 100;

// ============================================================================
// Plans
// ============================================================================

export const PLAN_INTERVALS = ['month', 'year'] as const;

export const PLAN_FEES: Record<string, number> = {
  free: 0,
  pro: 2900,
  enterprise: 29900,
};

// ============================================================================
// Statuses
// ============================================================================

export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
] as const;

export const INVOICE_STATUSES = [
  'draft',
  'open',
  'paid',
  'past_due',
  'void',
  'uncollectible',
] as const;

// ============================================================================
// Event Types
// ============================================================================

export const BILLING_EVENT_TYPES = [
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'invoice.paid',
  'invoice.payment_failed',
  'refund.created',
  'chargeback.created',
] as const;
