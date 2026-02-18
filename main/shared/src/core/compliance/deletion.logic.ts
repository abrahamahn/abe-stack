// main/shared/src/core/compliance/deletion.logic.ts

/**
 * @file Deletion Logic
 * @description Helpers for data retention and deletion workflows.
 * @module Core/Compliance
 */

import type { SoftDeletable } from './deletion.schemas';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_GRACE_PERIOD_DAYS = 30;

// ============================================================================
// Functions
// ============================================================================

/**
 * Calculate hard delete date from soft delete date.
 */
export function calculateHardDeleteDate(
  softDeleteDate: Date,
  gracePeriodDays: number = DEFAULT_GRACE_PERIOD_DAYS,
): Date {
  const hardDeleteDate = new Date(softDeleteDate);
  hardDeleteDate.setDate(hardDeleteDate.getDate() + gracePeriodDays);
  return hardDeleteDate;
}

/**
 * Check if a soft-deleted resource is within grace period.
 */
export function isWithinGracePeriod(scheduledHardDeleteAt: Date | null): boolean {
  if (scheduledHardDeleteAt === null) return false;
  return new Date() < scheduledHardDeleteAt;
}

/**
 * Check if a resource is soft deleted.
 */
export function isSoftDeleted(resource: Partial<SoftDeletable>): boolean {
  return (
    resource.deletionState === 'soft_deleted' || resource.deletionState === 'pending_hard_delete'
  );
}
