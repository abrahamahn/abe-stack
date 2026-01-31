// packages/admin/src/billingHandlers.ts
/**
 * Admin Billing Handlers
 *
 * HTTP handlers for admin billing operations (plan management).
 */

import { createBillingProvider } from '@abe-stack/billing';
import {
  BillingProviderNotConfiguredError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  PlanNotFoundError,
  type AdminPlan,
  type AdminPlanResponse,
  type AdminPlansListResponse,
  type CreatePlanRequest,
  type SubscriptionActionResponse,
  type SyncStripeResponse,
  type UpdatePlanRequest,
} from '@abe-stack/core';

import {
  createPlan,
  deactivatePlan,
  getAllPlans,
  getPlanById,
  syncPlanToStripe,
  updatePlan,
  type AdminBillingRepositories,
} from './billingService';

import type { AdminAppContext, AdminRequest } from './types';
import type { Plan as DbPlan } from '@abe-stack/db';


// ============================================================================
// Helper Functions
// ============================================================================

function getAdminBillingRepos(ctx: AdminAppContext): AdminBillingRepositories {
  return {
    plans: ctx.repos.plans,
    subscriptions: ctx.repos.subscriptions,
  } as AdminBillingRepositories;
}

function formatAdminPlan(plan: DbPlan): AdminPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    interval: plan.interval,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    features: plan.features,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    stripePriceId: plan.stripePriceId,
    stripeProductId: plan.stripeProductId,
    paypalPlanId: plan.paypalPlanId,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function handleError(
  error: unknown,
  ctx: AdminAppContext,
): { status: 400 | 404 | 500; body: { message: string } } {
  if (error instanceof PlanNotFoundError) {
    return { status: 404, body: { message: error.message } };
  }
  if (error instanceof CannotDeactivatePlanWithActiveSubscriptionsError) {
    return { status: 400, body: { message: error.message } };
  }
  if (error instanceof BillingProviderNotConfiguredError) {
    return { status: 500, body: { message: 'Billing service is not configured' } };
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return { status: 500, body: { message: 'An error occurred processing your request' } };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * List all plans (including inactive) - Admin only
 */
export async function handleAdminListPlans(
  ctx: AdminAppContext,
  _body: undefined,
  _request: AdminRequest,
): Promise<
  | { status: 200; body: AdminPlansListResponse }
  | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const repos = getAdminBillingRepos(ctx);
    const plans = await getAllPlans(repos);

    return {
      status: 200,
      body: {
        plans: plans.map(formatAdminPlan),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Get a single plan by ID - Admin only
 */
export async function handleAdminGetPlan(
  ctx: AdminAppContext,
  _body: undefined,
  _request: AdminRequest,
  params: { id: string },
): Promise<
  { status: 200; body: AdminPlanResponse } | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const repos = getAdminBillingRepos(ctx);
    const plan = await getPlanById(repos, params.id);

    return {
      status: 200,
      body: {
        plan: formatAdminPlan(plan),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Create a new plan - Admin only
 */
export async function handleAdminCreatePlan(
  ctx: AdminAppContext,
  body: CreatePlanRequest,
  _request: AdminRequest,
): Promise<
  { status: 201; body: AdminPlanResponse } | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const repos = getAdminBillingRepos(ctx);
    const plan = await createPlan(repos, body);

    return {
      status: 201,
      body: {
        plan: formatAdminPlan(plan),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Update a plan - Admin only
 */
export async function handleAdminUpdatePlan(
  ctx: AdminAppContext,
  body: UpdatePlanRequest,
  _request: AdminRequest,
  params: { id: string },
): Promise<
  { status: 200; body: AdminPlanResponse } | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const repos = getAdminBillingRepos(ctx);
    const plan = await updatePlan(repos, params.id, body);

    return {
      status: 200,
      body: {
        plan: formatAdminPlan(plan),
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Sync a plan to Stripe - Admin only
 */
export async function handleAdminSyncPlanToStripe(
  ctx: AdminAppContext,
  _body: undefined,
  _request: AdminRequest,
  params: { id: string },
): Promise<
  { status: 200; body: SyncStripeResponse } | { status: 400 | 404 | 500; body: { message: string } }
> {
  if (!ctx.config.billing.enabled) {
    return { status: 500, body: { message: 'Billing is not enabled' } };
  }

  try {
    const repos = getAdminBillingRepos(ctx);
    const provider = createBillingProvider(ctx.config.billing);

    const result = await syncPlanToStripe(repos, provider, params.id);

    return {
      status: 200,
      body: {
        success: true,
        stripePriceId: result.stripePriceId,
        stripeProductId: result.stripeProductId,
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Deactivate a plan - Admin only
 */
export async function handleAdminDeactivatePlan(
  ctx: AdminAppContext,
  _body: undefined,
  _request: AdminRequest,
  params: { id: string },
): Promise<
  | { status: 200; body: SubscriptionActionResponse }
  | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const repos = getAdminBillingRepos(ctx);
    await deactivatePlan(repos, params.id);

    return {
      status: 200,
      body: {
        success: true,
        message: 'Plan deactivated successfully',
      },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
