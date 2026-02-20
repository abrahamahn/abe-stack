// main/server/core/src/billing/seat-limits.ts
/**
 * Seat-Based Limit Enforcement
 *
 * Enforces maximum users (seats) per workspace plan by bridging the
 * entitlements system with tenant membership counts. Called as a
 * preHandler check before adding workspace members.
 *
 * @module billing/seat-limits
 */

import { FEATURE_KEYS, ForbiddenError } from '@bslt/shared';

import { resolveEntitlementsForUser } from './entitlements';

import type { BillingRepositories } from './types';
import type { MembershipRepository } from '../../../db/src';

// ============================================================================
// Types
// ============================================================================

/** Dependencies for seat limit operations */
export interface SeatLimitDeps {
  /** Billing repositories for entitlement resolution */
  readonly repos: BillingRepositories;
  /** Membership repository for counting current members */
  readonly memberships: MembershipRepository;
}

/** Current seat usage information for display */
export interface SeatUsage {
  /** Number of current members in the workspace */
  readonly currentSeats: number;
  /** Maximum seats allowed by the plan (undefined = unlimited) */
  readonly maxSeats: number | undefined;
  /** Whether the workspace is at its seat limit */
  readonly atLimit: boolean;
}

// ============================================================================
// Seat Limit Functions
// ============================================================================

/**
 * Assert that a tenant can add another member to their workspace.
 *
 * Resolves the owner's entitlements and checks whether the current
 * member count is within the plan's `team:invite` limit. Throws
 * `ForbiddenError` if the limit is reached or the feature is not
 * available on the plan.
 *
 * @param deps - Billing repositories and membership repository
 * @param userId - The workspace owner whose entitlements to check
 * @param tenantId - The tenant/workspace to count members for
 * @throws ForbiddenError if feature is not entitled or seat limit is reached
 * @complexity O(1) - entitlement resolution plus member count query
 */
export async function assertSeatLimit(
  deps: SeatLimitDeps,
  userId: string,
  tenantId: string,
): Promise<void> {
  const entitlements = await resolveEntitlementsForUser(deps.repos, userId);
  const feature = entitlements.features[FEATURE_KEYS.TEAM_MEMBERS];

  if (feature?.enabled !== true) {
    throw new ForbiddenError(
      `Feature '${FEATURE_KEYS.TEAM_MEMBERS}' is not available on your plan`,
      'FEATURE_NOT_ENTITLED',
    );
  }

  // If the feature has no limit, seats are unlimited
  if (feature.limit === undefined) {
    return;
  }

  const members = await deps.memberships.findByTenantId(tenantId);
  const currentSeats = members.length;

  if (currentSeats >= feature.limit) {
    throw new ForbiddenError(
      `Seat limit reached: ${String(currentSeats)}/${String(feature.limit)} members. Upgrade your plan to add more team members.`,
      'SEAT_LIMIT_EXCEEDED',
    );
  }
}

/**
 * Get current seat usage for a workspace.
 *
 * Returns the current member count, the plan's seat limit, and
 * whether the workspace is at its limit. Useful for displaying
 * usage information in the UI.
 *
 * @param deps - Billing repositories and membership repository
 * @param userId - The workspace owner whose entitlements to check
 * @param tenantId - The tenant/workspace to count members for
 * @returns Current seat usage information
 * @complexity O(1) - entitlement resolution plus member count query
 */
export async function getSeatUsage(
  deps: SeatLimitDeps,
  userId: string,
  tenantId: string,
): Promise<SeatUsage> {
  const entitlements = await resolveEntitlementsForUser(deps.repos, userId);
  const feature = entitlements.features[FEATURE_KEYS.TEAM_MEMBERS];

  const members = await deps.memberships.findByTenantId(tenantId);
  const currentSeats = members.length;

  // Feature not available or not enabled -> report as at limit with 0 max
  if (feature?.enabled !== true) {
    return {
      currentSeats,
      maxSeats: 0,
      atLimit: true,
    };
  }

  const maxSeats = feature.limit;

  return {
    currentSeats,
    maxSeats,
    atLimit: maxSeats !== undefined ? currentSeats >= maxSeats : false,
  };
}
