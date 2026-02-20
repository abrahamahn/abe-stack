// main/server/system/src/queue/write-types.ts
/**
 * Write Types
 *
 * Re-exported from @bslt/db for locality within @bslt/server-system's queue module.
 */

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
