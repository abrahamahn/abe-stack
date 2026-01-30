// packages/realtime/src/handlers/sync.ts
/**
 * Realtime Sync Handlers
 *
 * HTTP handlers for realtime record write operations.
 * Implements optimistic locking with version-based conflict detection.
 *
 * @module handlers/sync
 */

import { SubKeys } from '@abe-stack/core';
import { withTransaction } from '@abe-stack/db';

import {
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isTableAllowed,
  loadRecords,
  saveRecords,
} from '../service';
import { ERROR_MESSAGES } from '../types';

import type { ConflictResult, RealtimeModuleDeps, RealtimeRequest, WriteResult } from '../types';
import type { RealtimeTransaction, RecordPointer } from '@abe-stack/core';
import type { RouteResult } from '@abe-stack/http';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when a record is not found during a write transaction.
 *
 * @param table - Table name of the missing record
 * @param id - ID of the missing record
 */
export class RecordNotFoundError extends Error {
  constructor(
    public readonly table: string,
    public readonly id: string,
  ) {
    super(`Record not found: ${table}:${id}`);
    this.name = 'RecordNotFoundError';
  }
}

/**
 * Error thrown when version conflicts are detected during a write transaction.
 *
 * @param conflictingRecords - Array of record pointers that conflicted
 */
export class VersionConflictError extends Error {
  constructor(public readonly conflictingRecords: RecordPointer[]) {
    super('Version conflict detected');
    this.name = 'VersionConflictError';
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle write transaction.
 *
 * Applies a transaction of operations atomically with optimistic locking.
 * Returns 409 if any record has been modified since it was loaded.
 *
 * @param ctx - Realtime module dependencies
 * @param body - Transaction containing operations to apply
 * @param req - Request with authenticated user
 * @returns RouteResult with updated records or error
 * @throws Never - all errors are caught and returned as HTTP responses
 * @complexity O(n) for n operations, plus O(t) database queries for t distinct tables
 */
export async function handleWrite(
  ctx: RealtimeModuleDeps,
  body: RealtimeTransaction,
  req: RealtimeRequest,
): Promise<RouteResult<WriteResult | ConflictResult | { message: string }>> {
  const { db, log } = ctx;
  const userId = req.user?.userId;

  // Require authentication
  if (userId === undefined || userId === '') {
    return {
      status: 403,
      body: { message: ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
    };
  }

  // Validate author matches authenticated user
  if (body.authorId !== userId) {
    log.warn(
      {
        authorId: body.authorId,
        userId,
        txId: body.txId,
      },
      'Write attempt with mismatched authorId',
    );
    return {
      status: 403,
      body: { message: ERROR_MESSAGES.AUTHOR_MISMATCH },
    };
  }

  // Validate all tables are allowed
  for (const op of body.operations) {
    if (!isTableAllowed(op.table)) {
      return {
        status: 400,
        body: { message: ERROR_MESSAGES.TABLE_NOT_ALLOWED(op.table) },
      };
    }
  }

  try {
    log.debug(
      {
        txId: body.txId,
        authorId: body.authorId,
        operationCount: body.operations.length,
      },
      'Write transaction started',
    );

    // Execute in a database transaction
    const result = await withTransaction(db, async (tx) => {
      // 1. Load affected records
      const pointers = getOperationPointers(body.operations);
      const originalRecordMap = await loadRecords(tx, pointers);

      // 2. Verify all records exist
      for (const pointer of pointers) {
        if (originalRecordMap[pointer.table]?.[pointer.id] === undefined) {
          throw new RecordNotFoundError(pointer.table, pointer.id);
        }
      }

      // 3. Apply operations to get new record states
      const { recordMap: newRecordMap, modifiedRecords } = applyOperations(
        originalRecordMap,
        body.operations,
      );

      // 4. Reload records to check for concurrent modifications
      const currentRecordMap = await loadRecords(tx, modifiedRecords as RecordPointer[]);

      // 5. Check for version conflicts
      const conflicts = checkVersionConflicts(
        originalRecordMap,
        currentRecordMap,
        modifiedRecords as RecordPointer[],
      );

      if (conflicts.length > 0) {
        throw new VersionConflictError(conflicts.map((c) => ({ table: c.table, id: c.id })));
      }

      // 6. Save records to database
      await saveRecords(tx, newRecordMap, originalRecordMap);

      return { recordMap: newRecordMap, modifiedRecords: modifiedRecords as RecordPointer[] };
    });

    // Publish updates asynchronously (do not block the response)
    setImmediate(() => {
      for (const { table, id } of result.modifiedRecords) {
        const tableRecords = result.recordMap[table];
        if (tableRecords === undefined) continue;
        const record = tableRecords[id];
        if (record !== undefined && 'version' in record) {
          ctx.pubsub.publish(SubKeys.record(table, id), record.version);
        }
      }
    });

    log.debug(
      {
        txId: body.txId,
        modifiedCount: result.modifiedRecords.length,
      },
      'Write transaction completed',
    );

    return {
      status: 200,
      body: { recordMap: result.recordMap },
    };
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return {
        status: 400,
        body: { message: error.message },
      };
    }

    if (error instanceof VersionConflictError) {
      log.info(
        {
          txId: body.txId,
          conflicts: error.conflictingRecords,
        },
        'Write transaction conflict',
      );
      return {
        status: 409,
        body: {
          message: ERROR_MESSAGES.VERSION_CONFLICT,
          conflictingRecords: error.conflictingRecords,
        },
      };
    }

    log.error(
      {
        txId: body.txId,
        error: error instanceof Error ? error.message : String(error),
      },
      'Write transaction failed',
    );

    return {
      status: 500,
      body: { message: ERROR_MESSAGES.INTERNAL_ERROR },
    };
  }
}
