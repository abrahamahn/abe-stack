// main/server/core/src/billing/routes.ts
/**
 * Billing Routes
 *
 * Route definitions for the billing module.
 * Uses framework-agnostic route definition types from types.ts.
 * These route definitions can be consumed by any HTTP framework adapter.
 */

import {
  addPaymentMethodRequestSchema,
  cancelSubscriptionRequestSchema,
  checkoutRequestSchema,
  emptyBodySchema,
  portalSessionRequestSchema,
  updateSubscriptionRequestSchema,
} from '@bslt/shared';

import {
  handleAddPaymentMethod,
  handleCancelSubscription,
  handleCreateCheckout,
  handleCreatePortalSession,
  handleCreateSetupIntent,
  handleGetInvoice,
  handleGetSubscription,
  handleListInvoices,
  handleListPaymentMethods,
  handleListPlans,
  handleRemovePaymentMethod,
  handleResumeSubscription,
  handleSetDefaultPaymentMethod,
  handleUpdateSubscription,
} from './handlers';

import type {
  BillingAppContext,
  BillingBaseRouteDefinition,
  BillingRequest,
  BillingRouteMap,
  BillingRouteResult,
  BillingValidationSchema,
} from './types';
import type {
  AddPaymentMethodRequest,
  CancelSubscriptionRequest,
  CheckoutRequest,
  PortalSessionRequest,
  UpdateSubscriptionRequest,
} from '@bslt/shared';

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
  schema?: BillingValidationSchema,
): BillingBaseRouteDefinition {
  const route: BillingBaseRouteDefinition = {
    method,
    handler,
    auth,
  };
  return schema === undefined ? route : { ...route, schema };
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
      checkoutRequestSchema,
    ),
  ],

  [
    'billing/portal',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        return handleCreatePortalSession(ctx, body as PortalSessionRequest, req);
      },
      'user',
      portalSessionRequestSchema,
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
      cancelSubscriptionRequestSchema,
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
      emptyBodySchema,
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
      updateSubscriptionRequestSchema,
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

  // Invoice detail (dynamic route with path parameter)
  [
    'billing/invoices/:id',
    billingProtectedRoute(
      'GET',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        const invoiceId = (req as BillingRequest & { params?: { id?: string } }).params?.id ?? '';
        return handleGetInvoice(ctx, invoiceId, req);
      },
      'user',
    ),
  ],

  // Usage
  [
    'billing/usage',
    billingProtectedRoute(
      'GET',
      (
        _ctx: BillingAppContext,
        _body: unknown,
        _req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        // TODO: Implement handleGetUsage
        return Promise.resolve({
          status: 200,
          body: {
            metrics: [],
          },
        });
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
      addPaymentMethodRequestSchema,
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
      emptyBodySchema,
    ),
  ],

  [
    'billing/payment-methods/:id',
    billingProtectedRoute(
      'DELETE',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        const paymentMethodId =
          (req as BillingRequest & { params?: { id?: string } }).params?.id ?? '';
        return handleRemovePaymentMethod(ctx, paymentMethodId, req);
      },
      'user',
      emptyBodySchema,
    ),
  ],

  [
    'billing/payment-methods/:id/default',
    billingProtectedRoute(
      'POST',
      async (
        ctx: BillingAppContext,
        _body: unknown,
        req: BillingRequest,
      ): Promise<BillingRouteResult> => {
        const paymentMethodId =
          (req as BillingRequest & { params?: { id?: string } }).params?.id ?? '';
        return handleSetDefaultPaymentMethod(ctx, paymentMethodId, req);
      },
      'user',
      emptyBodySchema,
    ),
  ],
]);
