// main/client/api/src/billing/admin.ts
/**
 * Admin Billing API Client
 *
 * Type-safe client for admin billing operations (plan management).
 */

import {
  adminPlanResponseSchema,
  adminPlansListResponseSchema,
  createPlanRequestSchema,
  subscriptionActionResponseSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
} from '@abe-stack/shared';

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';
import type {
  AdminPlanResponse,
  AdminPlansListResponse,
  CreatePlanRequest,
  SubscriptionActionResponse,
  SyncStripeResponse,
  UpdatePlanRequest,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the admin billing client
 */
export type AdminBillingClientConfig = BaseClientConfig;

/**
 * Admin Billing API client interface
 */
export interface AdminBillingClient {
  /** List all plans (including inactive) */
  listPlans: () => Promise<AdminPlansListResponse>;
  /** Get a single plan by ID */
  getPlan: (planId: string) => Promise<AdminPlanResponse>;
  /** Create a new plan */
  createPlan: (data: CreatePlanRequest) => Promise<AdminPlanResponse>;
  /** Update a plan */
  updatePlan: (planId: string, data: UpdatePlanRequest) => Promise<AdminPlanResponse>;
  /** Sync plan to Stripe */
  syncPlanToStripe: (planId: string) => Promise<SyncStripeResponse>;
  /** Deactivate a plan */
  deactivatePlan: (planId: string) => Promise<SubscriptionActionResponse>;
}

// ============================================================================
// Client Implementation
// ============================================================================

/**
 * Create an admin billing API client
 *
 * @param config - Client configuration
 * @returns Admin billing client instance
 *
 * @example
 * ```ts
 * const client = createAdminBillingClient({
 *   baseUrl: 'http://localhost:3001',
 *   getToken: () => localStorage.getItem('adminToken'),
 * });
 *
 * // List all plans
 * const { plans } = await client.listPlans();
 *
 * // Create a plan
 * const { plan } = await client.createPlan({
 *   name: 'Pro Plan',
 *   interval: 'month',
 *   priceInCents: 1999,
 * });
 *
 * // Sync to Stripe
 * const { stripePriceId } = await client.syncPlanToStripe(plan.id);
 * ```
 */
export function createAdminBillingClient(config: AdminBillingClientConfig): AdminBillingClient {
  const factory = createRequestFactory(config);

  return {
    async listPlans(): Promise<AdminPlansListResponse> {
      return apiRequest(
        factory,
        '/admin/billing/plans',
        undefined,
        true,
        adminPlansListResponseSchema,
      );
    },

    async getPlan(planId: string): Promise<AdminPlanResponse> {
      return apiRequest(
        factory,
        `/admin/billing/plans/${planId}`,
        undefined,
        true,
        adminPlanResponseSchema,
      );
    },

    async createPlan(data: CreatePlanRequest): Promise<AdminPlanResponse> {
      const validated = createPlanRequestSchema.parse(data);
      return apiRequest(
        factory,
        '/admin/billing/plans/create',
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        adminPlanResponseSchema,
      );
    },

    async updatePlan(planId: string, data: UpdatePlanRequest): Promise<AdminPlanResponse> {
      const validated = updatePlanRequestSchema.parse(data);
      return apiRequest(
        factory,
        `/admin/billing/plans/${planId}/update`,
        {
          method: 'POST',
          body: JSON.stringify(validated),
        },
        true,
        adminPlanResponseSchema,
      );
    },

    async syncPlanToStripe(planId: string): Promise<SyncStripeResponse> {
      return apiRequest(
        factory,
        `/admin/billing/plans/${planId}/sync-stripe`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        syncStripeResponseSchema,
      );
    },

    async deactivatePlan(planId: string): Promise<SubscriptionActionResponse> {
      return apiRequest(
        factory,
        `/admin/billing/plans/${planId}/deactivate`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        true,
        subscriptionActionResponseSchema,
      );
    },
  };
}
