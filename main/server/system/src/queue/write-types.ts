// main/server/system/src/queue/write-types.ts

/**
 * Write Types
 *
 * Type definitions for the unified write pattern.
 * Adopted from Chet-stack's transaction-aware write system.
 *
 * Re-exported from @bslt/db for backwards compatibility.
 */

// Re-export all write types from @bslt/db where they are defined
// alongside the queue types. This module exists for locality within
// @bslt/server-system's queue module.
export type {
  OperationType,
  WriteOperation,
  WriteBatch,
  OperationResult,
  WriteResult,
  WriteError,
  WriteContext,
  BeforeValidateHook,
  AfterWriteHook,
  WriteHooks,
} from '@bslt/db';
