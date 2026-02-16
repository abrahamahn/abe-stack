// main/shared/src/domain/billing/billing.contracts.ts
/**
 * Billing Contracts
 *
 * API Contract definitions for the Billing domain (Plans, Subscriptions, Checkout).
 * @module Domain/Billing
 */

import {
  addPaymentMethodRequestSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  invoiceResponseSchema,
  invoicesListResponseSchema,
  paymentMethodResponseSchema,
  paymentMethodsListResponseSchema,
  plansListResponseSchema,
  portalSessionRequestSchema,
  portalSessionResultSchema,
  setupIntentResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  updateSubscriptionRequestSchema,
} from '../core/billing/billing.schemas';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../core/schemas';


import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const billingContract = {
  // --------------------------------------------------------------------------
  // Plans (Public)
  // --------------------------------------------------------------------------
  listPlans: {
    method: 'GET' as const,
    path: '/api/billing/plans',
    responses: {
      200: successResponseSchema(plansListResponseSchema),
    },
    summary: 'List all active pricing plans (public)',
  },

  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------
  getSubscription: {
    method: 'GET' as const,
    path: '/api/billing/subscription',
    responses: {
      200: successResponseSchema(subscriptionResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get current user subscription',
  },

  createCheckout: {
    method: 'POST' as const,
    path: '/api/billing/checkout',
    body: checkoutRequestSchema,
    responses: {
      200: successResponseSchema(checkoutResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create checkout session for subscription',
  },

  createPortal: {
    method: 'POST' as const,
    path: '/api/billing/portal',
    body: portalSessionRequestSchema,
    responses: {
      200: successResponseSchema(portalSessionResultSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create customer portal session for subscription management',
  },

  // --------------------------------------------------------------------------
  // Subscription Management
  // --------------------------------------------------------------------------
  cancelSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/cancel',
    body: cancelSubscriptionRequestSchema,
    responses: {
      200: successResponseSchema(subscriptionActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Cancel current subscription',
  },

  resumeSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/resume',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(subscriptionActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Resume subscription before period end',
  },

  updateSubscription: {
    method: 'POST' as const,
    path: '/api/billing/subscription/update',
    body: updateSubscriptionRequestSchema,
    responses: {
      200: successResponseSchema(subscriptionActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Change subscription plan',
  },

  // --------------------------------------------------------------------------
  // Invoices
  // --------------------------------------------------------------------------
  listInvoices: {
    method: 'GET' as const,
    path: '/api/billing/invoices',
    responses: {
      200: successResponseSchema(invoicesListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List user invoices',
  },

  getInvoice: {
    method: 'GET' as const,
    path: '/api/billing/invoices/:id',
    responses: {
      200: successResponseSchema(invoiceResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single invoice by ID',
  },

  // --------------------------------------------------------------------------
  // Usage
  // --------------------------------------------------------------------------
  getUsage: {
    method: 'GET' as const,
    path: '/api/billing/usage',
    responses: {
      200: successResponseSchema(Object as any), // TODO: Define usage schema
      401: errorResponseSchema,
    },
    summary: 'Get current subscription usage summary',
  },

  // --------------------------------------------------------------------------
  // Payment Methods
  // --------------------------------------------------------------------------
  createSetupIntent: {
    method: 'POST' as const,
    path: '/api/billing/setup-intent',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(setupIntentResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Create setup intent for adding payment method',
  },

  listPaymentMethods: {
    method: 'GET' as const,
    path: '/api/billing/payment-methods',
    responses: {
      200: successResponseSchema(paymentMethodsListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List user payment methods',
  },

  addPaymentMethod: {
    method: 'POST' as const,
    path: '/api/billing/payment-methods/add',
    body: addPaymentMethodRequestSchema,
    responses: {
      200: successResponseSchema(paymentMethodResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Add a payment method after setup intent success',
  },

  deletePaymentMethod: {
    method: 'DELETE' as const,
    path: '/api/billing/payment-methods/:id',
    responses: {
      200: successResponseSchema(subscriptionActionResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Delete a payment method',
  },

  setDefaultPaymentMethod: {
    method: 'POST' as const,
    path: '/api/billing/payment-methods/:id/default',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(paymentMethodResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Set default payment method',
  },
} satisfies Contract;
