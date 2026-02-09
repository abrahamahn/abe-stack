// src/shared/src/domain/compliance/deletion.schemas.ts
/**
 * Deletion Schemas
 *
 * Types and validation schemas for GDPR-compliant data deletion workflows.
 * @module Domain/Compliance
 */

import { createSchema, parseBoolean, parseOptional, parseString } from '../../core/schema.utils';

import type { Schema } from '../../core/api';

// ============================================================================
// Constants
// ============================================================================

export const DELETION_STATES = [
  'active',
  'soft_deleted',
  'pending_hard_delete',
  'hard_deleted',
] as const;

export type DeletionState = (typeof DELETION_STATES)[number];

// ============================================================================
// Types
// ============================================================================

/** Metadata for resources that can be soft-deleted */
export interface SoftDeletable {
  deletionState: DeletionState;
  deletedAt: Date | null;
  deletedBy: string | null;
  scheduledHardDeleteAt: Date | null;
}

/** Input for requesting resource deletion */
export interface DeletionRequest {
  resourceType: string;
  resourceId: string;
  requestedBy: string;
  reason?: string | undefined;
  immediate?: boolean | undefined;
}

/** Record of an async deletion process */
export interface DeletionJob {
  id: string;
  resourceType: string;
  resourceId: string;
  state: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  storagePaths: string[];
  cascadeTargets: Array<{
    table: string;
    foreignKey: string;
    foreignKeyValue: string;
  }>;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// Schemas
// ============================================================================

/** Configuration for deletion workflow */
export interface DeletionConfig {
  /** Grace period in days before hard delete */
  gracePeriodDays: number;
  /** Maximum retries for failed deletions */
  maxRetries: number;
  /** Batch size for bulk deletions */
  batchSize: number;
}

/** Default deletion configuration */
export const DEFAULT_DELETION_CONFIG: DeletionConfig = {
  gracePeriodDays: 30,
  maxRetries: 3,
  batchSize: 100,
};

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Data deletion service interface.
 * Implements GDPR-compliant data deletion workflows with soft delete,
 * grace periods, and async hard deletion.
 */
export interface DeletionServiceContract {
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
   *
   * @returns Counts of processed and failed items
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
// Schemas
// ============================================================================

export const deletionRequestSchema: Schema<DeletionRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  return {
    resourceType: parseString(obj['resourceType'], 'resourceType'),
    resourceId: parseString(obj['resourceId'], 'resourceId'),
    requestedBy: parseString(obj['requestedBy'], 'requestedBy'),
    reason: parseOptional(obj['reason'], (v) => parseString(v, 'reason')),
    immediate: parseOptional(obj['immediate'], (v) => parseBoolean(v, 'immediate')),
  };
});
