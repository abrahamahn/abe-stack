// main/server/core/src/billing/middleware.ts
/**
 * Billing Entitlement Middleware
 *
 * Fastify preHandler that resolves a user's subscription entitlements
 * and asserts access to a specific feature before the route handler runs.
 *
 * @module billing/middleware
 */

import { ERROR_MESSAGES, ForbiddenError } from '@abe-stack/shared';
import { assertEntitled, resolveEntitlements } from '@abe-stack/shared/domain';

import type { BillingRepositories } from './types';
import type { SubscriptionState } from '@abe-stack/shared/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/** Options for creating the entitlement middleware */
export interface EntitlementMiddlewareOptions {
  /** Billing repositories for subscription and plan lookups */
  repos: BillingRepositories;
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a Fastify preHandler that asserts the authenticated user
 * is entitled to a specific feature based on their subscription plan.
 *
 * Resolves the user's current subscription, maps it to entitlements,
 * and calls `assertEntitled()` which throws `ForbiddenError` if
 * the feature is not available on the user's plan.
 *
 * @param featureName - The feature key to check (e.g., 'api_access', 'media:processing')
 * @param options - Middleware options containing billing repositories
 * @returns Fastify preHandler function
 * @complexity O(1) - two sequential database lookups per request
 *
 * @example
 * ```typescript
 * app.route({
 *   method: 'POST',
 *   url: '/api/media/upload',
 *   preHandler: [authGuard, requireEntitlement('media:processing', { repos })],
 *   handler: uploadHandler,
 * });
 * ```
 */
export function requireEntitlement(
  featureName: string,
  options: EntitlementMiddlewareOptions,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const { repos } = options;

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = (request as FastifyRequest & { user?: { userId: string } }).user;

    if (user === undefined) {
      throw new ForbiddenError(ERROR_MESSAGES.AUTHENTICATION_REQUIRED, 'AUTH_REQUIRED');
    }

    // Look up the user's active subscription
    const subscription = await repos.subscriptions.findActiveByUserId(user.userId);

    let subscriptionState: SubscriptionState = 'none';
    let planId: string | undefined;
    let planFeatures: Array<{ name: string; included: boolean; limit?: number }> | undefined;

    if (subscription !== null) {
      subscriptionState = subscription.status as SubscriptionState;
      planId = subscription.planId;

      // Look up plan features
      const plan = await repos.plans.findById(subscription.planId);
      if (plan !== null && Array.isArray(plan.features)) {
        planFeatures = plan.features as Array<{
          name: string;
          included: boolean;
          limit?: number;
        }>;
      }
    }

    const entitlements = resolveEntitlements({
      subscriptionState,
      ...(planId !== undefined ? { planId } : {}),
      ...(planFeatures !== undefined ? { planFeatures } : {}),
    });

    assertEntitled(entitlements, featureName);
  };
}
