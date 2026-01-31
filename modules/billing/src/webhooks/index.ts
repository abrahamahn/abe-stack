// modules/billing/src/webhooks/index.ts
/**
 * Billing Webhooks
 *
 * Webhook event processing for Stripe and PayPal providers.
 * Handles subscription lifecycle events, invoice processing,
 * and payment failure tracking.
 */

export { handlePayPalWebhook } from './paypal-webhook';
export { registerWebhookRoutes } from './routes';
export { handleStripeWebhook } from './stripe-webhook';
