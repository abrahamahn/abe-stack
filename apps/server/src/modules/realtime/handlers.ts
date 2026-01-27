// apps/server/src/modules/realtime/handlers.ts
/**
 * Realtime Handlers
 *
 * HTTP handlers for realtime record operations.
 * Implements write and getRecords endpoints with optimistic locking.
 */

import { SubKeys } from '@abe-stack/core/pubsub';
import { withTransaction } from '@database';

import {
    applyOperations,
    checkVersionConflicts,
    getOperationPointers,
    isTableAllowed,
    loadRecords,
    saveRecords,
} from './service';

import type { RealtimeTransaction, RecordPointer } from '@abe-stack/core';
import type { RouteResult } from '@router';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Types
// ============================================================================

export interface WriteResult {
  recordMap: Record<string, Record<string, unknown>>;
}

export interface GetRecordsResult {
  recordMap: Record<string, Record<string, unknown>>;
}

export interface ConflictResult {
  message: string;
  conflictingRecords?: RecordPointer[];
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle write transaction
 *
 * Applies a transaction of operations atomically with optimistic locking.
 * Returns 409 if any record has been modified since it was loaded.
 */
export async function handleWrite(
  ctx: AppContext,
  body: RealtimeTransaction,
  req: RequestWithCookies,
): Promise<RouteResult<WriteResult | ConflictResult | { message: string }>> {
  const { db, log } = ctx;
  const userId = req.user?.userId;

  // Require authentication
  if (userId === undefined || userId === '') {
    return {
      status: 403,
      body: { message: 'Authentication required' },
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
      body: { message: 'Author ID must match authenticated user' },
    };
  }

  // Validate all tables are allowed
  for (const op of body.operations) {
    if (!isTableAllowed(op.table)) {
      return {
        status: 400,
        body: { message: `Table '${op.table}' is not allowed for realtime operations` },
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
      const currentRecordMap = await loadRecords(tx, modifiedRecords);

      // 5. Check for version conflicts
      const conflicts = checkVersionConflicts(originalRecordMap, currentRecordMap, modifiedRecords);

      if (conflicts.length > 0) {
        throw new VersionConflictError(conflicts.map((c) => ({ table: c.table, id: c.id })));
      }

      // 6. Save records to database
      await saveRecords(tx, newRecordMap, originalRecordMap);

      return { recordMap: newRecordMap, modifiedRecords };
    });

    setImmediate(() => {
      for (const { table, id } of result.modifiedRecords) {
        const record = result.recordMap[table]?.[id];
        if (record && typeof record === 'object' && 'version' in record) {
          ctx.pubsub.publish(SubKeys.record(table, id), (record as { version: number }).version);
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
          message: 'Version conflict: one or more records have been modified',
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
      body: { message: 'Internal server error' },
    };
  }
}

/**
 * Handle get records request
 *
 * Fetches multiple records by their table and ID.
 * Returns a RecordMap with all found records.
 */
export async function handleGetRecords(
  ctx: AppContext,
  body: { pointers: RecordPointer[] },
  req: RequestWithCookies,
): Promise<RouteResult<GetRecordsResult | { message: string }>> {
  const { db, log } = ctx;
  const userId = req.user?.userId;

  // Require authentication (can be made public if needed)
  if (userId === undefined || userId === '') {
    return {
      status: 403,
      body: { message: 'Authentication required' },
    };
  }

  // Validate all tables are allowed
  for (const pointer of body.pointers) {
    if (!isTableAllowed(pointer.table)) {
      return {
        status: 400,
        body: { message: `Table '${pointer.table}' is not allowed for realtime operations` },
      };
    }
  }

  try {
    log.debug(
      {
        userId,
        pointerCount: body.pointers.length,
      },
      'GetRecords request',
    );

    const recordMap = await loadRecords(db, body.pointers);

    return {
      status: 200,
      body: { recordMap },
    };
  } catch (error) {
    log.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'GetRecords failed',
    );

    return {
      status: 500,
      body: { message: 'Internal server error' },
    };
  }
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when a record is not found
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
 * Error thrown when version conflicts are detected
 */
export class VersionConflictError extends Error {
  constructor(public readonly conflictingRecords: RecordPointer[]) {
    super('Version conflict detected');
    this.name = 'VersionConflictError';
  }
}
