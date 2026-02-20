// main/server/core/src/realtime/permissions.ts
/**
 * Real-Time Data Permissions
 *
 * Row-level permission evaluation for real-time data operations.
 * Determines whether a user can read or write a specific record
 * based on workspace membership, role hierarchy, and record ownership.
 *
 * Permission patterns:
 * - Workspace pattern: all workspace members can read workspace records
 * - Owner pattern: only record owner can write their own records
 * - Role-based: admin/owner can write, member can read, viewer can read
 *
 * @module Realtime/Permissions
 */

import { hasAtLeastRole, type Membership } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * A record that can be evaluated for permissions.
 * Represents a row in a real-time data table.
 */
export interface PermissionRecord {
  /** Unique identifier of the record */
  id: string;
  /** The tenant/workspace this record belongs to */
  tenantId: string;
  /** The user who owns/created this record */
  ownerId: string;
}

/**
 * Repository interface for looking up memberships.
 * This is injected to keep the permissions module decoupled from the database layer.
 */
export interface MembershipRepository {
  /**
   * Find a membership for a specific user in a specific tenant.
   * Returns null if the user is not a member of the tenant.
   */
  findByUserAndTenant: (userId: string, tenantId: string) => Promise<Membership | null>;
}

/**
 * Result of a permission check, including the reason for denial.
 */
export interface PermissionResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for the decision (useful for logging and error messages) */
  reason: string;
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Check if a user can read a record.
 *
 * Read access rules:
 * - User must be a member of the record's workspace/tenant.
 * - All roles (viewer, member, admin, owner) can read records in their workspace.
 * - Users outside the workspace are denied.
 *
 * @param userId - The ID of the user requesting access
 * @param tenantId - The tenant/workspace ID to check against
 * @param record - The record being accessed
 * @param membershipRepo - Repository for looking up memberships
 * @returns Permission result indicating whether read is allowed
 *
 * @example
 * ```typescript
 * const result = await canReadRecord('user-1', 'tenant-1', record, membershipRepo);
 * if (!result.allowed) {
 *   throw new ForbiddenError(result.reason);
 * }
 * ```
 */
export async function canReadRecord(
  userId: string,
  tenantId: string,
  record: PermissionRecord,
  membershipRepo: MembershipRepository,
): Promise<PermissionResult> {
  // Record must belong to the specified tenant
  if (record.tenantId !== tenantId) {
    return {
      allowed: false,
      reason: 'Cross-workspace access denied: record does not belong to the specified workspace',
    };
  }

  // Check workspace membership
  const membership = await membershipRepo.findByUserAndTenant(userId, tenantId);

  if (membership === null) {
    return {
      allowed: false,
      reason: 'Access denied: user is not a member of this workspace',
    };
  }

  // All workspace members can read records (workspace pattern)
  return {
    allowed: true,
    reason: 'User is a member of the workspace',
  };
}

/**
 * Check if a user can write (create/update/delete) a record.
 *
 * Write access rules:
 * - User must be a member of the record's workspace/tenant.
 * - Owner of the record can always write their own records (owner pattern).
 * - Users with admin or owner role can write any record in the workspace (role-based).
 * - Members can only write records they own.
 * - Viewers cannot write any records.
 *
 * @param userId - The ID of the user requesting write access
 * @param tenantId - The tenant/workspace ID to check against
 * @param record - The record being modified
 * @param membershipRepo - Repository for looking up memberships
 * @returns Permission result indicating whether write is allowed
 *
 * @example
 * ```typescript
 * const result = await canWriteRecord('user-1', 'tenant-1', record, membershipRepo);
 * if (!result.allowed) {
 *   throw new ForbiddenError(result.reason);
 * }
 * ```
 */
export async function canWriteRecord(
  userId: string,
  tenantId: string,
  record: PermissionRecord,
  membershipRepo: MembershipRepository,
): Promise<PermissionResult> {
  // Record must belong to the specified tenant
  if (record.tenantId !== tenantId) {
    return {
      allowed: false,
      reason: 'Cross-workspace access denied: record does not belong to the specified workspace',
    };
  }

  // Check workspace membership
  const membership = await membershipRepo.findByUserAndTenant(userId, tenantId);

  if (membership === null) {
    return {
      allowed: false,
      reason: 'Access denied: user is not a member of this workspace',
    };
  }

  // Viewer role cannot write
  if (membership.role === 'viewer') {
    return {
      allowed: false,
      reason: 'Access denied: viewers cannot modify records',
    };
  }

  // Admin and owner roles can write any record in the workspace
  if (hasAtLeastRole(membership, 'admin')) {
    return {
      allowed: true,
      reason: `User has ${membership.role} role in the workspace`,
    };
  }

  // Member role: can only write their own records (owner pattern)
  if (record.ownerId === userId) {
    return {
      allowed: true,
      reason: 'User is the record owner',
    };
  }

  return {
    allowed: false,
    reason: 'Access denied: members can only modify their own records',
  };
}
