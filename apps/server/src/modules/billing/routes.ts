// apps/server/src/modules/billing/routes.ts
/**
 * Billing Routes
 *
 * Route definitions for billing module.
 */

import {
  type AddPaymentMethodRequest,
  type CancelSubscriptionRequest,
  type CheckoutRequest,
  type CheckoutResponse,
  type EmptyBillingBody,
  type InvoicesListResponse,
  type PaymentMethodResponse,
  type PaymentMethodsListResponse,
  type PlansListResponse,
  type SetupIntentResponse,
  type SubscriptionActionResponse,
  type SubscriptionResponse,
  type UpdateSubscriptionRequest,
} from '@abe-stack/core';

import { protectedRoute, publicRoute, type RouteMap, type RouteResult } from '@router';

import type { AppContext, RequestWithCookies } from '@shared';

import {
  handleAddPaymentMethod,
  handleCancelSubscription,
  handleCreateCheckout,
  handleCreateSetupIntent,
  handleGetSubscription,
  handleListInvoices,
  handleListPaymentMethods,
  handleListPlans,
  handleRemovePaymentMethod as _handleRemovePaymentMethod,
  handleResumeSubscription,
  handleSetDefaultPaymentMethod as _handleSetDefaultPaymentMethod,
  handleUpdateSubscription,
} from './handlers';

// ============================================================================
// Route Definitions
// ============================================================================

export const billingRoutes: RouteMap = {
  // Plans (public)
  'billing/plans': publicRoute<undefined, PlansListResponse | { message: string }>(
    'GET',
    async (ctx: AppContext): Promise<RouteResult<PlansListResponse | { message: string }>> => {
      return handleListPlans(ctx);
    },
  ),

  // Subscription
  'billing/subscription': protectedRoute<undefined, SubscriptionResponse | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<SubscriptionResponse | { message: string }>> => {
      return handleGetSubscription(ctx, req);
    },
    'user',
  ),

  'billing/checkout': protectedRoute<CheckoutRequest, CheckoutResponse | { message: string }>(
    'POST',
    async (
      ctx: AppContext,
      body: CheckoutRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<CheckoutResponse | { message: string }>> => {
      return handleCreateCheckout(ctx, body, req);
    },
    'user',
  ),

  'billing/subscription/cancel': protectedRoute<
    CancelSubscriptionRequest,
    SubscriptionActionResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: CancelSubscriptionRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
      return handleCancelSubscription(ctx, body, req);
    },
    'user',
  ),

  'billing/subscription/resume': protectedRoute<
    EmptyBillingBody,
    SubscriptionActionResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      _body: EmptyBillingBody,
      req: RequestWithCookies,
    ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
      return handleResumeSubscription(ctx, req);
    },
    'user',
  ),

  'billing/subscription/update': protectedRoute<
    UpdateSubscriptionRequest,
    SubscriptionActionResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: UpdateSubscriptionRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
      return handleUpdateSubscription(ctx, body, req);
    },
    'user',
  ),

  // Invoices
  'billing/invoices': protectedRoute<undefined, InvoicesListResponse | { message: string }>(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<InvoicesListResponse | { message: string }>> => {
      return handleListInvoices(ctx, req);
    },
    'user',
  ),

  // Payment Methods
  'billing/payment-methods': protectedRoute<
    undefined,
    PaymentMethodsListResponse | { message: string }
  >(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: RequestWithCookies,
    ): Promise<RouteResult<PaymentMethodsListResponse | { message: string }>> => {
      return handleListPaymentMethods(ctx, req);
    },
    'user',
  ),

  'billing/payment-methods/add': protectedRoute<
    AddPaymentMethodRequest,
    PaymentMethodResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: AddPaymentMethodRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<PaymentMethodResponse | { message: string }>> => {
      return handleAddPaymentMethod(ctx, body, req);
    },
    'user',
  ),

  'billing/setup-intent': protectedRoute<
    EmptyBillingBody,
    SetupIntentResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      _body: EmptyBillingBody,
      req: RequestWithCookies,
    ): Promise<RouteResult<SetupIntentResponse | { message: string }>> => {
      return handleCreateSetupIntent(ctx, req);
    },
    'user',
  ),
};

// Dynamic routes that need path parameters are handled in the route setup
// These would be: billing/payment-methods/:id (DELETE) and billing/payment-methods/:id/default (POST)
