// main/server/core/src/billing/usage-metering-handlers.ts
/**
 * Usage Metering Handlers
 *
 * HTTP handler layer for usage metering endpoints.
 * Translates HTTP requests into service calls and formats responses.
 *
 * @module billing/usage-metering-handlers
 */

import { HTTP_STATUS } from '@bslt/shared';

import { getUsageSummary, recordUsage } from './usage-metering';

import type { BillingAppContext, BillingRequest, BillingRouteResult } from './types';
import type { MetricLimit, UsageMeteringRepositories } from './usage-metering';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract usage metering repositories from the billing app context.
 * Falls back gracefully if metering repos are not present.
 *
 * @param ctx - Billing application context
 * @returns Usage metering repositories or null
 * @complexity O(1)
 */
function getMeteringRepos(ctx: BillingAppContext): UsageMeteringRepositories | null {
  const repos = ctx.repos as Record<string, unknown>;
  const usageMetrics = repos['usageMetrics'];
  const usageSnapshots = repos['usageSnapshots'];

  if (usageMetrics === undefined || usageSnapshots === undefined) {
    return null;
  }

  return {
    usageMetrics: usageMetrics as UsageMeteringRepositories['usageMetrics'],
    usageSnapshots: usageSnapshots as UsageMeteringRepositories['usageSnapshots'],
  };
}

// ============================================================================
// GET /api/tenants/:id/usage
// ============================================================================

/**
 * Handle GET /api/tenants/:id/usage
 *
 * Returns a usage summary for the specified tenant, including
 * all defined metrics with their current values, limits, and
 * percentage used.
 *
 * @param ctx - Billing application context
 * @param _body - Unused request body
 * @param req - HTTP request with :id param for tenant
 * @returns Usage summary response
 * @complexity O(n) where n is the number of defined metrics
 */
export async function handleGetTenantUsage(
  ctx: BillingAppContext,
  _body: unknown,
  req: BillingRequest,
): Promise<BillingRouteResult> {
  const user = req.user;
  if (user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  const params = (req as BillingRequest & { params?: { id?: string } }).params;
  const tenantId = params?.id ?? '';
  if (tenantId === '') {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      body: { message: 'Tenant ID is required' },
    };
  }

  const meteringRepos = getMeteringRepos(ctx);
  if (meteringRepos === null) {
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Usage metering is not configured' },
    };
  }

  try {
    // Resolve limits from the user's subscription plan
    const limits = await resolveTenantLimits(ctx, user.userId);

    const summary = await getUsageSummary(meteringRepos, tenantId, limits);

    return {
      status: HTTP_STATUS.OK,
      body: summary,
    };
  } catch (error: unknown) {
    ctx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to retrieve usage summary' },
    };
  }
}

// ============================================================================
// GET /api/billing/usage
// ============================================================================

/**
 * Handle GET /api/billing/usage
 *
 * Returns the usage summary for the authenticated user's primary tenant.
 * Uses the subscription's plan features to determine limits.
 *
 * @param ctx - Billing application context
 * @param _body - Unused request body
 * @param req - HTTP request with authenticated user
 * @returns Usage summary response
 * @complexity O(n) where n is the number of defined metrics
 */
export async function handleGetBillingUsage(
  ctx: BillingAppContext,
  _body: unknown,
  req: BillingRequest,
): Promise<BillingRouteResult> {
  const user = req.user;
  if (user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  const meteringRepos = getMeteringRepos(ctx);
  if (meteringRepos === null) {
    return {
      status: HTTP_STATUS.OK,
      body: {
        metrics: [],
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      },
    };
  }

  try {
    // Use the user's primary tenant or workspace ID from header
    const tenantId =
      (req as BillingRequest & { headers: Record<string, string | undefined> }).headers[
        'x-workspace-id'
      ] ?? user.userId;

    const limits = await resolveTenantLimits(ctx, user.userId);

    const summary = await getUsageSummary(meteringRepos, tenantId, limits);

    return {
      status: HTTP_STATUS.OK,
      body: summary,
    };
  } catch (error: unknown) {
    ctx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to retrieve usage summary' },
    };
  }
}

// ============================================================================
// POST /api/tenants/:id/usage/record
// ============================================================================

/**
 * Handle POST /api/tenants/:id/usage/record
 *
 * Records a usage increment for a specific metric and tenant.
 * Intended for internal use or admin-level API calls.
 *
 * @param ctx - Billing application context
 * @param body - Request body with metricKey and delta
 * @param req - HTTP request with :id param for tenant
 * @returns Updated snapshot
 * @complexity O(1) - single upsert
 */
export async function handleRecordUsage(
  ctx: BillingAppContext,
  body: unknown,
  req: BillingRequest,
): Promise<BillingRouteResult> {
  const user = req.user;
  if (user === undefined) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      body: { message: 'Unauthorized' },
    };
  }

  const params = (req as BillingRequest & { params?: { id?: string } }).params;
  const tenantId = params?.id ?? '';
  if (tenantId === '') {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      body: { message: 'Tenant ID is required' },
    };
  }

  const meteringRepos = getMeteringRepos(ctx);
  if (meteringRepos === null) {
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Usage metering is not configured' },
    };
  }

  const data = body as { metricKey?: string; delta?: number };
  if (typeof data.metricKey !== 'string' || data.metricKey === '') {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      body: { message: 'metricKey is required' },
    };
  }
  if (typeof data.delta !== 'number') {
    return {
      status: HTTP_STATUS.BAD_REQUEST,
      body: { message: 'delta must be a number' },
    };
  }

  try {
    const snapshot = await recordUsage(meteringRepos, {
      metricKey: data.metricKey,
      tenantId,
      delta: data.delta,
    });

    return {
      status: HTTP_STATUS.OK,
      body: {
        snapshot: {
          id: snapshot.id,
          tenantId: snapshot.tenantId,
          metricKey: snapshot.metricKey,
          value: snapshot.value,
          periodStart:
            snapshot.periodStart instanceof Date
              ? snapshot.periodStart.toISOString()
              : String(snapshot.periodStart),
          periodEnd:
            snapshot.periodEnd instanceof Date
              ? snapshot.periodEnd.toISOString()
              : String(snapshot.periodEnd),
          updatedAt:
            snapshot.updatedAt instanceof Date
              ? snapshot.updatedAt.toISOString()
              : String(snapshot.updatedAt),
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return {
        status: HTTP_STATUS.NOT_FOUND,
        body: { message },
      };
    }
    ctx.log.error(error instanceof Error ? error : new Error(message));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to record usage' },
    };
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Resolve metric limits from a user's subscription plan.
 *
 * Looks up the user's active subscription, then resolves plan features
 * that have numeric limits into MetricLimit objects.
 *
 * @param ctx - Billing application context with plan/subscription repos
 * @param userId - User ID to resolve limits for
 * @returns Array of MetricLimit objects
 * @complexity O(n) where n is the number of plan features
 */
async function resolveTenantLimits(ctx: BillingAppContext, userId: string): Promise<MetricLimit[]> {
  const limits: MetricLimit[] = [];

  try {
    const subscription = await ctx.repos.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      return limits;
    }

    const plan = await ctx.repos.plans.findById(subscription.planId);
    if (plan === null || !Array.isArray(plan.features)) {
      return limits;
    }

    for (const feature of plan.features as Array<{
      key?: string;
      name?: string;
      included?: boolean;
      value?: unknown;
      limit?: number;
    }>) {
      if (feature.included === true && typeof feature.limit === 'number') {
        limits.push({
          metricKey: feature.key ?? feature.name ?? '',
          limit: feature.limit,
        });
      } else if (feature.included === true && typeof feature.value === 'number') {
        limits.push({
          metricKey: feature.key ?? feature.name ?? '',
          limit: feature.value,
        });
      }
    }
  } catch {
    // If subscription/plan lookup fails, return empty limits
  }

  return limits;
}
