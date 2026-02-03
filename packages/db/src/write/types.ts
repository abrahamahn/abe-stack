// infra/jobs/src/write/types.ts
/**
 * Write Types
 *
 * Type definitions for the unified write pattern.
 * Adopted from Chet-stack's transaction-aware write system.
 */

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Supported operation types
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * A single write operation
 */
export interface WriteOperation<T = unknown> {
  /** Operation type */
  type: OperationType;
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Record data (for create/update) */
  data?: T;
  /** Expected version for optimistic locking (for update/delete) */
  expectedVersion?: number;
}

/**
 * A batch of operations to execute atomically
 */
export interface WriteBatch {
  /** Unique transaction ID */
  txId: string;
  /** User ID performing the write */
  authorId: string;
  /** Operations to execute */
  operations: WriteOperation[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of a single operation
 */
export interface OperationResult<T = unknown> {
  /** Operation that was executed */
  operation: WriteOperation<T>;
  /** Resulting record (undefined for delete) */
  record?: T & { id: string; version: number };
  /** Previous version (for undo support) */
  previousVersion?: number;
}

/**
 * Result of a write batch
 */
export interface WriteResult<T = unknown> {
  /** Transaction ID */
  txId: string;
  /** Whether all operations succeeded */
  success: boolean;
  /** Results for each operation */
  results: OperationResult<T>[];
  /** Error if failed */
  error?: WriteError;
}

/**
 * Write error with details
 */
export interface WriteError {
  /** Error code */
  code: 'VALIDATION' | 'PERMISSION' | 'CONFLICT' | 'NOT_FOUND' | 'INTERNAL';
  /** Human-readable message */
  message: string;
  /** Which operation failed */
  operationIndex?: number;
  /** Additional details */
  details?: Record<string, unknown>;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Write context for hooks
 */
export interface WriteContext {
  /** Transaction ID */
  txId: string;
  /** User performing the write */
  authorId: string;
  /** Timestamp of the write */
  timestamp: Date;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Hook called before validation
 */
export type BeforeValidateHook<T = unknown> = (
  operation: WriteOperation<T>,
  ctx: WriteContext,
) => Promise<WriteOperation<T>>;

/**
 * Hook called after successful write
 */
export type AfterWriteHook<T = unknown> = (
  result: OperationResult<T>,
  ctx: WriteContext,
) => Promise<void>;

/**
 * Write hooks configuration
 */
export interface WriteHooks {
  beforeValidate?: BeforeValidateHook[];
  afterWrite?: AfterWriteHook[];
}
