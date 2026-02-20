// main/server/core/src/realtime/permission.filter.ts
/**
 * Permission Filter
 *
 * Filters records based on permissions before sending to subscribers.
 * Used by the subscription handler to filter outgoing messages so that
 * users only receive records they are authorized to see.
 *
 * @module Realtime/PermissionFilter
 */

import { canReadRecord } from './permissions';

import type { MembershipRepository, PermissionRecord } from './permissions';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for filtering records.
 */
export interface FilterRecordsOptions {
  /**
   * When true, failed permission checks are logged rather than silently dropped.
   * @default false
   */
  verbose?: boolean;
}

/**
 * Result of filtering records for a user.
 */
export interface FilterResult<T extends PermissionRecord> {
  /** Records the user is allowed to see */
  allowed: T[];
  /** Number of records that were filtered out */
  deniedCount: number;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter records based on user permissions, returning only records
 * the user is authorized to read.
 *
 * This function evaluates each record's read permission individually
 * and returns only those that pass. It is designed to be called by
 * the subscription handler before sending data to WebSocket clients.
 *
 * @param userId - The ID of the user requesting records
 * @param tenantId - The tenant/workspace context
 * @param records - Array of records to filter
 * @param membershipRepo - Repository for looking up memberships
 * @param options - Optional filtering configuration
 * @returns FilterResult with allowed records and denied count
 *
 * @example
 * ```typescript
 * const result = await filterRecordsForUser(
 *   'user-1',
 *   'tenant-1',
 *   records,
 *   membershipRepo,
 * );
 * ws.send(JSON.stringify(result.allowed));
 * ```
 */
export async function filterRecordsForUser<T extends PermissionRecord>(
  userId: string,
  tenantId: string,
  records: T[],
  membershipRepo: MembershipRepository,
  _options: FilterRecordsOptions = {},
): Promise<FilterResult<T>> {
  if (records.length === 0) {
    return { allowed: [], deniedCount: 0 };
  }

  const results = await Promise.all(
    records.map(async (record) => {
      const permission = await canReadRecord(userId, tenantId, record, membershipRepo);
      return { record, permission };
    }),
  );

  const allowed: T[] = [];
  let deniedCount = 0;

  for (const { record, permission } of results) {
    if (permission.allowed) {
      allowed.push(record);
    } else {
      deniedCount += 1;
    }
  }

  return { allowed, deniedCount };
}

/**
 * Check if a user can read any records in a tenant.
 * This is an optimization to avoid filtering individual records
 * when the user has no access at all.
 *
 * @param userId - The ID of the user
 * @param tenantId - The tenant/workspace ID
 * @param membershipRepo - Repository for looking up memberships
 * @returns True if the user has at least viewer access
 */
export async function canAccessTenant(
  userId: string,
  tenantId: string,
  membershipRepo: MembershipRepository,
): Promise<boolean> {
  const membership = await membershipRepo.findByUserAndTenant(userId, tenantId);
  return membership !== null;
}
