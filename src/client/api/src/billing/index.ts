// src/client/api/src/billing/index.ts
/**
 * Billing SDK
 *
 * Exports billing API clients for managing
 * subscriptions, plans, payment methods, and invoices.
 */

// Client
export { createBillingClient, type BillingClient, type BillingClientConfig } from './client';

// Admin
export {
  createAdminBillingClient,
  type AdminBillingClient,
  type AdminBillingClientConfig,
} from './admin';
