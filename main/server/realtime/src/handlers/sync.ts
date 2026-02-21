// main/server/realtime/src/handlers/sync.ts
/**
 * Realtime Sync Handlers
 *
 * HTTP handlers for realtime record write operations.
 * Implements optimistic locking with version-based conflict detection.
 *
 * @module handlers/sync
 */

import { withTransaction } from '@bslt/db';
import {
  applyOperations,
  checkVersionConflicts,
  ERROR_CODES,
  ERROR_MESSAGES,
  getOperationPointers,
  REALTIME_ERRORS,
  SubKeys,
} from '@bslt/shared';

import { isTableAllowed, loadRecords, saveRecords } from '../service';

import type { ConflictResult, RealtimeModuleDeps, RealtimeRequest, WriteResult } from '../types';
import type { RealtimeTransaction, RecordPointer, RouteResult } from '@bslt/shared';

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const ERROR_CODES_LOCAL = {
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;

const REALTIME_ERRORS_LOCAL = {
  AUTHOR_MISMATCH: 'Author ID must match authenticated user',
  tableNotAllowed: (table: string): string =>
    `Table '${table}' is not allowed for realtime operations`,
} as const;

function isAuthenticatedWriteRequest(req: unknown): req is {
  user: { userId: string };
} {
  if (typeof req !== 'object' || req === null) return false;
  const maybeUser = (req as { user?: { userId?: unknown } }).user;
  return typeof maybeUser?.userId === 'string' && maybeUser.userId.length > 0;
}

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
): Promise<RouteResult<WriteResult | ConflictResult | { code: string; message: string }>> {
  const safeCtx = ctx as unknown as {
    db: Parameters<typeof loadRecords>[0];
    pubsub: { publish: (key: unknown, version: unknown) => void };
    log: unknown;
  };
  const db = safeCtx.db;
  const log = safeCtx.log as {
    debug: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  const writeBody = body as unknown as {
    authorId: string;
    txId: string;
    operations: Array<{ table: string }>;
  };

  // Require authentication using type guard
  if (!isAuthenticatedWriteRequest(req)) {
    return {
      status: 403,
      body: { code: 'FORBIDDEN', message: 'Authentication required' },
    };
  }

  const userId = (req as { user: { userId: string } }).user.userId;

  // Validate author matches authenticated user
  if (writeBody.authorId !== userId) {
    log.warn('Write attempt with mismatched authorId', {
      authorId: writeBody.authorId,
      userId,
      txId: writeBody.txId,
    });
    return {
      status: HTTP_STATUS.FORBIDDEN,
      body: { code: ERROR_CODES_LOCAL.FORBIDDEN, message: REALTIME_ERRORS_LOCAL.AUTHOR_MISMATCH },
    };
  }

  // Validate all tables are allowed
  for (const op of writeBody.operations) {
    if (!isTableAllowed(op.table)) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: {
          code: ERROR_CODES_LOCAL.BAD_REQUEST,
          message: REALTIME_ERRORS_LOCAL.tableNotAllowed(op.table),
        },
      };
    }
  }

  try {
    log.debug('Write transaction started', {
      txId: writeBody.txId,
      authorId: writeBody.authorId,
      operationCount: writeBody.operations.length,
    });

    // Execute in a database transaction
    const result = await withTransaction(db, async (tx) => {
      // 1. Load affected records
      const pointers = getOperationPointers(writeBody.operations as never);
      const originalRecordMap = await loadRecords(tx, pointers);

      // 2. Verify all records exist
      for (const pointer of pointers) {
        if (originalRecordMap[pointer.table]?.[pointer.id] === undefined) {
          throw new RecordNotFoundError(pointer.table, pointer.id);
        }
      }

      // 3. Apply operations to get new record states
      const { recordMap: newRecordMap, modifiedRecords } = applyOperations(
        originalRecordMap as never,
        writeBody.operations as never,
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
          safeCtx.pubsub.publish(SubKeys.record(table, id), record.version);
        }
      }
    });

    log.debug('Write transaction completed', {
      txId: body.txId,
      modifiedCount: result.modifiedRecords.length,
    });

    return {
      status: HTTP_STATUS.OK,
      body: { recordMap: result.recordMap },
    };
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return {
        status: HTTP_STATUS.BAD_REQUEST,
        body: { code: ERROR_CODES.BAD_REQUEST, message: error.message },
      };
    }

    if (error instanceof VersionConflictError) {
      log.info('Write transaction conflict', {
        txId: writeBody.txId,
        conflicts: error.conflictingRecords,
      });
      return {
        status: HTTP_STATUS.CONFLICT,
        body: {
          code: ERROR_CODES.CONFLICT,
          message: REALTIME_ERRORS.VERSION_CONFLICT,
          conflictingRecords: error.conflictingRecords,
        },
      };
    }

    log.error('Write transaction failed', {
      txId: writeBody.txId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { code: ERROR_CODES.INTERNAL_ERROR, message: ERROR_MESSAGES.INTERNAL_ERROR },
    };
  }
}
