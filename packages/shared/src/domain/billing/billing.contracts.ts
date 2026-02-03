// shared/src/domain/billing/billing.contracts.ts

/**
 * @file Billing Contracts
 * @description API Contract definitions for the Billing domain (Plans, Subscriptions, Checkout).
 * @module Domain/Billing
 */

import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../../core/schemas';

import {
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  plansListResponseSchema,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  updateSubscriptionRequestSchema,
} from './billing.schemas';

import type { Contract } from '../../core/api';

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
    body: emptyBodySchema, // Use shared emptyBodySchema
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
} satisfies Contract;
