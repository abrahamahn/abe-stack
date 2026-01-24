// apps/server/src/modules/admin/billingService.ts
/**
 * Admin Billing Service
 *
 * Business logic for admin plan management operations.
 */

import {
  PlanNotFoundError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
} from '@abe-stack/core';
import type { PlanRepository, SubscriptionRepository, Plan as DbPlan } from '@abe-stack/db';

import type { PaymentProviderInterface } from '@infrastructure/billing';

// ============================================================================
// Types
// ============================================================================

export interface AdminBillingRepositories {
  plans: PlanRepository;
  subscriptions: SubscriptionRepository;
}

export interface CreatePlanParams {
  name: string;
  description?: string;
  interval: 'month' | 'year';
  priceInCents: number;
  currency?: string;
  features?: { name: string; included: boolean; description?: string }[];
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePlanParams {
  name?: string;
  description?: string | null;
  interval?: 'month' | 'year';
  priceInCents?: number;
  currency?: string;
  features?: { name: string; included: boolean; description?: string }[];
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
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
  if (!plan) {
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
    description: params.description || null,
    interval: params.interval,
    priceInCents: params.priceInCents,
    currency: params.currency || 'usd',
    features: params.features || [],
    trialDays: params.trialDays || 0,
    isActive: params.isActive ?? true,
    sortOrder: params.sortOrder || 0,
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
  if (!plan) {
    throw new PlanNotFoundError(planId);
  }

  const updated = await repos.plans.update(planId, {
    name: params.name,
    description: params.description,
    interval: params.interval,
    priceInCents: params.priceInCents,
    currency: params.currency,
    features: params.features,
    trialDays: params.trialDays,
    isActive: params.isActive,
    sortOrder: params.sortOrder,
  });

  if (!updated) {
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
  if (!plan) {
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
  provider: PaymentProviderInterface,
  planId: string,
): Promise<{ stripePriceId: string; stripeProductId: string }> {
  const plan = await repos.plans.findById(planId);
  if (!plan) {
    throw new PlanNotFoundError(planId);
  }

  // If product already exists, update it; otherwise create
  let productId = plan.stripeProductId;
  let priceId = plan.stripePriceId;

  // Convert plan to CreateProductParams format
  const productParams = {
    name: plan.name,
    description: plan.description || undefined,
    interval: plan.interval,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    metadata: { planId: plan.id },
  };

  if (productId) {
    // Update existing product
    await provider.updateProduct(productId, plan.name, plan.description || undefined);
    // Note: Stripe doesn't allow updating prices, so if price changed,
    // we'd need to create a new price. For simplicity, we keep the existing price.
  } else {
    // Create new product and price
    const result = await provider.createProduct(productParams);
    productId = result.productId;
    priceId = result.priceId;

    // Update plan with Stripe IDs
    await repos.plans.update(planId, {
      stripeProductId: productId,
      stripePriceId: priceId,
    });
  }

  return {
    stripePriceId: priceId || '',
    stripeProductId: productId || '',
  };
}
