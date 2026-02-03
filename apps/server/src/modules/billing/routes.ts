// modules/billing/src/routes.ts
/**
 * Billing Routes
 *
 * Route definitions for the billing module.
 * Uses framework-agnostic route definition types from types.ts.
 * These route definitions can be consumed by any HTTP framework adapter.
 */

import {
  handleAddPaymentMethod,
  handleCancelSubscription,
  handleCreateCheckout,
  handleCreateSetupIntent,
  handleGetSubscription,
  handleListInvoices,
  handleListPaymentMethods,
  handleListPlans,
  handleResumeSubscription,
  handleUpdateSubscription,
} from './handlers';

import type {
  BillingAppContext,
  BillingBaseRouteDefinition,
  BillingRequest,
  BillingRouteMap,
  BillingRouteResult,
} from './types';
import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  UpdateSubscriptionRequest,
} from '@abe-stack/shared';

// ============================================================================
// Route Helper Functions
// ============================================================================

/**
 * Create a route map from an array of path-definition tuples.
 * Uses array syntax to avoid naming-convention lint errors for paths with slashes.
 *
 * @param entries - Array of [path, definition] tuples
 * @returns Route map object keyed by path
 * @complexity O(n) where n is the number of entries
 */
function createBillingRouteMap(
  entries: Array<[string, BillingBaseRouteDefinition]>,
): BillingRouteMap {
  return Object.fromEntries(entries);
}

/**
 * Create a public route definition (no authentication required).
 *
 * @param method - HTTP method for this route
 * @param handler - Route handler function
 * @returns Base route definition without auth requirement
 * @complexity O(1)
 */
function billingPublicRoute(
  method: BillingBaseRouteDefinition['method'],
  handler: BillingBaseRouteDefinition['handler'],
): BillingBaseRouteDefinition {
  return {
    method,
    handler,
  };
}

/**
 * Create a protected route definition (authentication required).
 *
 * @param method - HTTP method for this route
 * @param handler - Route handler function
 * @param auth - Required authentication level ('user' or 'admin')
 * @returns Base route definition with auth requirement
 * @complexity O(1)
 */
function billingProtectedRoute(
  method: BillingBaseRouteDefinition['method'],
  handler: BillingBaseRouteDefinition['handler'],
  auth: 'user' | 'admin' = 'user',
): BillingBaseRouteDefinition {
  return {
    method,
    handler,
    auth,
  };
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Billing module route map.
 *
 * Defines all billing-related HTTP endpoints:
 * - Plans (public): list active plans
 * - Subscriptions (protected): get, create, cancel, resume, update
 * - Invoices (protected): list user invoices
 * - Payment methods (protected): list, add, setup intent
 *
 * Dynamic routes for payment method operations by ID (remove, set default)
 * are handled separately in the route setup since they need path parameters.
 */
export const billingRoutes: BillingRouteMap = createBillingRouteMap([
  // Plans (public)
  [
    'billing/plans',
    billingPublicRoute('GET', async (ctx: BillingAppContext): Promise<BillingRouteResult> => {
      return handleListPlans(ctx);
    }),
  ],

  // Subscription
  [
    'billing/subscription',
    billingProtectedRoute(
      'GET',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleGetSubscription(ctx, req);
      },
      'user',
    ),
  ],

  [
    'billing/checkout',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleCreateCheckout(ctx, body as CheckoutRequest, req);
      },
      'user',
    ),
  ],

  [
    'billing/subscription/cancel',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleCancelSubscription(ctx, body as CancelSubscriptionRequest, req);
      },
      'user',
    ),
  ],

  [
    'billing/subscription/resume',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleResumeSubscription(ctx, req);
      },
      'user',
    ),
  ],

  [
    'billing/subscription/update',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleUpdateSubscription(ctx, body as UpdateSubscriptionRequest, req);
      },
      'user',
    ),
  ],

  // Invoices
  [
    'billing/invoices',
    billingProtectedRoute(
      'GET',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleListInvoices(ctx, req);
      },
      'user',
    ),
  ],

  // Payment Methods
  [
    'billing/payment-methods',
    billingProtectedRoute(
      'GET',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleListPaymentMethods(ctx, req);
      },
      'user',
    ),
  ],

  [
    'billing/payment-methods/add',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleAddPaymentMethod(ctx, body as AddPaymentMethodRequest, req);
      },
      'user',
    ),
  ],

  [
    'billing/setup-intent',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleCreateSetupIntent(ctx, req);
      },
      'user',
    ),
  ],
]);

// Dynamic routes that need path parameters are handled in the route setup
// These would be: billing/payment-methods/:id (DELETE) and billing/payment-methods/:id/default (POST)
