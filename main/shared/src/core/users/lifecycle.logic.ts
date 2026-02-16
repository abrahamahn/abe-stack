// main/shared/src/domain/users/lifecycle.logic.ts
/**
 * Account Lifecycle Logic
 *
 * Pure business logic for account deactivation, deletion, and reactivation.
 * @module Domain/Users
 */

import {
  ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
  type AccountLifecycleFields,
  type AccountStatus,
} from './lifecycle.schemas';

// ============================================================================
// Status Derivation
// ============================================================================

/**
 * Derive the account status from lifecycle fields.
 */
export function getAccountStatus(fields: AccountLifecycleFields): AccountStatus {
  if (fields.deletedAt !== null) {
    return 'pending_deletion';
  }
  if (fields.deactivatedAt !== null) {
    return 'deactivated';
  }
  return 'active';
}

/**
 * Check if an account is active (not deactivated or deleted).
 */
export function isAccountActive(fields: AccountLifecycleFields): boolean {
  return getAccountStatus(fields) === 'active';
}

/**
 * Check if an account is deactivated.
 */
export function isAccountDeactivated(fields: AccountLifecycleFields): boolean {
  return fields.deactivatedAt !== null && fields.deletedAt === null;
}

/**
 * Check if an account is pending deletion.
 */
export function isAccountPendingDeletion(fields: AccountLifecycleFields): boolean {
  return fields.deletedAt !== null;
}

// ============================================================================
// Grace Period
// ============================================================================

/**
 * Calculate the grace period end date from a deletion request date.
 */
export function calculateDeletionGracePeriodEnd(
  deletionDate: Date,
  gracePeriodDays: number = ACCOUNT_DELETION_GRACE_PERIOD_DAYS,
): Date {
  const end = new Date(deletionDate);
  end.setDate(end.getDate() + gracePeriodDays);
  return end;
}

/**
 * Check if an account is still within its deletion grace period.
 * Returns true if the account can still be reactivated.
 */
export function isWithinDeletionGracePeriod(fields: AccountLifecycleFields): boolean {
  if (fields.deletionGracePeriodEnds === null) return false;
  return new Date() < new Date(fields.deletionGracePeriodEnds);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if an account can be deactivated.
 * An account can only be deactivated if it's currently active.
 */
export function canDeactivate(fields: AccountLifecycleFields): boolean {
  return getAccountStatus(fields) === 'active';
}

/**
 * Check if an account can request deletion.
 * An account can request deletion if it's active or deactivated (not already pending deletion).
 */
export function canRequestDeletion(fields: AccountLifecycleFields): boolean {
  const status = getAccountStatus(fields);
  return status === 'active' || status === 'deactivated';
}

/**
 * Check if an account can be reactivated.
 * An account can be reactivated if it's deactivated or within deletion grace period.
 */
export function canReactivate(fields: AccountLifecycleFields): boolean {
  const status = getAccountStatus(fields);
  if (status === 'deactivated') return true;
  if (status === 'pending_deletion') return isWithinDeletionGracePeriod(fields);
  return false;
}
