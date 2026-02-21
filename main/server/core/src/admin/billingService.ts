// main/server/core/src/admin/billingService.ts
/**
 * Admin Billing Service
 *
 * Business logic for admin plan management operations.
 */

import { CannotDeactivatePlanWithActiveSubscriptionsError, PlanNotFoundError } from '@bslt/shared';

import type {
  Plan as DbPlan,
  PlanFeature,
  PlanRepository,
  SubscriptionRepository,
} from '../../../db/src';
import type { BillingService, CreateProductParams } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

export interface AdminBillingRepositories {
  plans: PlanRepository;
  subscriptions: SubscriptionRepository;
}

export interface CreatePlanParams {
  name: string;
  description?: string | undefined;
  interval: 'month' | 'year';
  priceInCents: number;
  currency?: string | undefined;
  features?: PlanFeature[] | undefined;
  trialDays?: number | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface UpdatePlanParams {
  name?: string | undefined;
  description?: string | null | undefined;
  interval?: 'month' | 'year' | undefined;
  priceInCents?: number | undefined;
  currency?: string | undefined;
  features?: PlanFeature[] | undefined;
  trialDays?: number | undefined;
  isActive?: boolean | undefined;
  sortOrder?: number | undefined;
}

// ============================================================================
// Plan Operations
// ============================================================================

/**
 * Get all plans (including inactive) for admin
 */
export async function getAllPlans(repos: AdminBillingRepositories): Promise<DbPlan[]> {
  return repos.plans.listAll();
}

/**
 * Get a plan by ID
 */
export async function getPlanById(
  repos: AdminBillingRepositories,
  planId: string,
): Promise<DbPlan> {
  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    throw new PlanNotFoundError(planId);
  }
  return plan;
}

/**
 * Create a new plan
 */
export async function createPlan(
  repos: AdminBillingRepositories,
  params: CreatePlanParams,
): Promise<DbPlan> {
  return repos.plans.create({
    name: params.name,
    description: params.description ?? null,
    interval: params.interval,
    priceInCents: params.priceInCents,
    currency: params.currency ?? 'usd',
    features: params.features ?? [],
    trialDays: params.trialDays ?? 0,
    isActive: params.isActive ?? true,
    sortOrder: params.sortOrder ?? 0,
    stripePriceId: null,
    stripeProductId: null,
    paypalPlanId: null,
  });
}

/**
 * Update a plan
 */
export async function updatePlan(
  repos: AdminBillingRepositories,
  planId: string,
  params: UpdatePlanParams,
): Promise<DbPlan> {
  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    throw new PlanNotFoundError(planId);
  }

  // Build update data conditionally to avoid undefined values
  const updateData: {
    name?: string;
    description?: string | null;
    interval?: 'month' | 'year';
    priceInCents?: number;
    currency?: string;
    features?: PlanFeature[];
    trialDays?: number;
    isActive?: boolean;
    sortOrder?: number;
  } = {};
  if (params.name !== undefined) {
    updateData.name = params.name;
  }
  if (params.description !== undefined) {
    updateData.description = params.description;
  }
  if (params.interval !== undefined) {
    updateData.interval = params.interval;
  }
  if (params.priceInCents !== undefined) {
    updateData.priceInCents = params.priceInCents;
  }
  if (params.currency !== undefined) {
    updateData.currency = params.currency;
  }
  if (params.features !== undefined) {
    updateData.features = params.features;
  }
  if (params.trialDays !== undefined) {
    updateData.trialDays = params.trialDays;
  }
  if (params.isActive !== undefined) {
    updateData.isActive = params.isActive;
  }
  if (params.sortOrder !== undefined) {
    updateData.sortOrder = params.sortOrder;
  }

  const updated = await repos.plans.update(planId, updateData);

  if (updated === null) {
    throw new PlanNotFoundError(planId);
  }

  return updated;
}

/**
 * Deactivate a plan
 */
export async function deactivatePlan(
  repos: AdminBillingRepositories,
  planId: string,
): Promise<void> {
  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    throw new PlanNotFoundError(planId);
  }

  // Check if there are active subscriptions
  const activeCount = await repos.subscriptions.countActiveByPlanId(planId);
  if (activeCount > 0) {
    throw new CannotDeactivatePlanWithActiveSubscriptionsError(planId, activeCount);
  }

  await repos.plans.deactivate(planId);
}

/**
 * Sync plan to Stripe (create product and price)
 */
export async function syncPlanToStripe(
  repos: AdminBillingRepositories,
  provider: BillingService,
  planId: string,
): Promise<{ stripePriceId: string; stripeProductId: string }> {
  const plan = await repos.plans.findById(planId);
  if (plan === null) {
    throw new PlanNotFoundError(planId);
  }

  // If product already exists, update it; otherwise create
  const existingProductId = plan.stripeProductId;
  const existingPriceId = plan.stripePriceId;

  let finalProductId: string;
  let finalPriceId: string;

  // Convert plan to CreateProductParams format
  const productParams: CreateProductParams = {
    name: plan.name,
    interval: plan.interval,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    metadata: { planId: plan.id },
  };
  if (plan.description !== null) {
    productParams.description = plan.description;
  }

  if (existingProductId !== null && existingProductId !== '') {
    // Update existing product
    await provider.updateProduct(existingProductId, plan.name, plan.description ?? undefined);
    // Note: Stripe doesn't allow updating prices, so if price changed,
    // we'd need to create a new price. For simplicity, we keep the existing price.
    finalProductId = existingProductId;
    finalPriceId = existingPriceId ?? '';
  } else {
    // Create new product and price
    const result = await provider.createProduct(productParams);
    finalProductId = result.productId;
    finalPriceId = result.priceId;

    // Update plan with Stripe IDs
    await repos.plans.update(planId, {
      stripeProductId: finalProductId,
      stripePriceId: finalPriceId,
    });
  }

  return {
    stripePriceId: finalPriceId,
    stripeProductId: finalProductId,
  };
}
