// kernel/src/contracts/deletion.ts
/**
 * Data Deletion Workflow Contract
 *
 * Types for soft delete, async hard delete, and storage cleanup.
 * Implements GDPR-compliant data deletion patterns.
 */

import { createSchema } from './schema';

import type { Schema } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Deletion states for tracked resources.
 */
export const DELETION_STATES = [
  'active',
  'soft_deleted',
  'pending_hard_delete',
  'hard_deleted',
] as const;

export type DeletionState = (typeof DELETION_STATES)[number];

/**
 * Soft-deletable resource metadata.
 */
export interface SoftDeletable {
  /** Current deletion state */
  deletionState: DeletionState;
  /** When soft delete was requested */
  deletedAt: Date | null;
  /** Who requested the deletion */
  deletedBy: string | null;
  /** When hard delete will be executed (grace period end) */
  scheduledHardDeleteAt: Date | null;
}

/**
 * Deletion request for a resource.
 */
export interface DeletionRequest {
  /** Resource type (e.g., 'user', 'project', 'workspace') */
  resourceType: string;
  /** Resource ID */
  resourceId: string;
  /** ID of user requesting deletion */
  requestedBy: string;
  /** Reason for deletion */
  reason?: string | undefined;
  /** Skip grace period and delete immediately */
  immediate?: boolean | undefined;
}

/**
 * Deletion job for async processing.
 */
export interface DeletionJob {
  /** Job ID */
  id: string;
  /** Resource type */
  resourceType: string;
  /** Resource ID */
  resourceId: string;
  /** Job state */
  state: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  /** Related storage paths to clean up */
  storagePaths: string[];
  /** Related database tables to cascade delete */
  cascadeTargets: Array<{
    table: string;
    foreignKey: string;
    foreignKeyValue: string;
  }>;
  /** When to execute */
  scheduledAt: Date;
  /** When processing started */
  startedAt: Date | null;
  /** When processing completed */
  completedAt: Date | null;
  /** Error message if failed */
  errorMessage: string | null;
  /** Retry count */
  retryCount: number;
  /** Maximum retries */
  maxRetries: number;
}

/**
 * Configuration for deletion workflow.
 */
export interface DeletionConfig {
  /** Grace period in days before hard delete */
  gracePeriodDays: number;
  /** Maximum retries for failed deletions */
  maxRetries: number;
  /** Batch size for bulk deletions */
  batchSize: number;
}

/**
 * Default deletion configuration.
 */
export const DEFAULT_DELETION_CONFIG: DeletionConfig = {
  gracePeriodDays: 30,
  maxRetries: 3,
  batchSize: 100,
};

// ============================================================================
// Schemas
// ============================================================================

export const deletionRequestSchema: Schema<DeletionRequest> = createSchema((data: unknown) => {
  if (data === null || typeof data !== 'object') {
    throw new Error('Invalid deletion request');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj['resourceType'] !== 'string') throw new Error('resourceType required');
  if (typeof obj['resourceId'] !== 'string') throw new Error('resourceId required');
  if (typeof obj['requestedBy'] !== 'string') throw new Error('requestedBy required');

  const result: DeletionRequest = {
    resourceType: obj['resourceType'],
    resourceId: obj['resourceId'],
    requestedBy: obj['requestedBy'],
  };
  if (typeof obj['reason'] === 'string') result.reason = obj['reason'];
  if (typeof obj['immediate'] === 'boolean') result.immediate = obj['immediate'];

  return result;
});

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Data deletion service interface.
 */
export interface DeletionService {
  /**
   * Request soft deletion of a resource.
   * Marks the resource as deleted but retains data for grace period.
   *
   * @param request - Deletion request
   * @returns Deletion job for tracking
   */
  requestDeletion(request: DeletionRequest): Promise<DeletionJob>;

  /**
   * Cancel a pending deletion (within grace period).
   *
   * @param jobId - Deletion job ID
   * @param canceledBy - User canceling the deletion
   */
  cancelDeletion(jobId: string, canceledBy: string): Promise<void>;

  /**
   * Restore a soft-deleted resource.
   *
   * @param resourceType - Type of resource
   * @param resourceId - Resource ID
   * @param restoredBy - User restoring the resource
   */
  restore(resourceType: string, resourceId: string, restoredBy: string): Promise<void>;

  /**
   * Process pending hard deletions.
   * Should be called by a scheduled job.
   */
  processPendingDeletions(): Promise<{ processed: number; failed: number }>;

  /**
   * Get deletion status for a resource.
   *
   * @param resourceType - Type of resource
   * @param resourceId - Resource ID
   * @returns Deletion job if pending/processing, null otherwise
   */
  getStatus(resourceType: string, resourceId: string): Promise<DeletionJob | null>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate hard delete date from soft delete date.
 */
export function calculateHardDeleteDate(
  softDeleteDate: Date,
  gracePeriodDays: number = DEFAULT_DELETION_CONFIG.gracePeriodDays,
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
  return resource.deletionState === 'soft_deleted' || resource.deletionState === 'pending_hard_delete';
}
