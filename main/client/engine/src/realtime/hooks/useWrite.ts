// main/client/engine/src/realtime/hooks/useWrite.ts
/**
 * useWrite - React hook for writing operations with optimistic updates.
 *
 * Integrates with:
 * - RecordCache for optimistic in-memory updates
 * - TransactionQueue for offline-first write support
 * - POST /api/realtime/write endpoint (via TransactionQueue)
 */

import { useCallback, useState } from 'react';

// ============================================================================
// Types — inline to avoid cross-package resolution issues at lint time
// ============================================================================

/** Minimal record shape with id + version. */
interface RecordShape {
  id: string;
  version?: number;
}

/** Minimal interface for the in-memory record cache. */
interface RecordCacheLike {
  get(table: string, id: string): RecordShape | undefined;
  set(table: string, id: string, record: RecordShape, opts: { force: boolean }): void;
}

/** A realtime operation for the transaction. */
interface RealtimeOp {
  type: 'set';
  table: string;
  id: string;
  key: string;
  value: unknown;
}

/** A queued transaction for offline-first processing. */
interface QueuedTx {
  txId: string;
  authorId: string;
  clientTimestamp: number;
  operations: RealtimeOp[];
}

/** Minimal interface for the offline-first transaction queue. */
interface TransactionQueueLike {
  enqueue(transaction: QueuedTx): Promise<void>;
}

/** A single write operation describing updates to a record. */
export interface WriteOperation {
  table: string;
  id: string;
  updates: Record<string, unknown>;
}

/** Options for a write call. */
export interface WriteOptions {
  skipUndo?: boolean;
  groupId?: string;
}

/** Return value of the useWrite hook. */
export interface UseWriteResult {
  write: (operations: WriteOperation[], options?: WriteOptions) => Promise<void>;
  isWriting: boolean;
  error: Error | undefined;
}

/** Dependencies injected into useWrite. */
export interface UseWriteDeps<_TTables = unknown> {
  userId: string;
  recordCache: RecordCacheLike;
  transactionQueue: TransactionQueueLike;
  onBeforeWrite?: (
    operations: WriteOperation[],
    previousValues: Array<Record<string, unknown> | undefined>,
    options: WriteOptions,
  ) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function generateTxId(): string {
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook for writing operations with optimistic updates.
 *
 * @param deps - Injected dependencies (userId, recordCache, transactionQueue)
 */
export function useWrite(deps: UseWriteDeps): UseWriteResult {
  const { userId, recordCache, transactionQueue, onBeforeWrite } = deps;

  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const write = useCallback(
    async (operations: WriteOperation[], options: WriteOptions = {}): Promise<void> => {
      setIsWriting(true);
      setError(undefined);

      try {
        const previousValues: Array<Record<string, unknown> | undefined> = [];

        for (const op of operations) {
          const existing: RecordShape | undefined = recordCache.get(op.table, op.id);

          if (existing !== undefined) {
            const prevValue: Record<string, unknown> = {};
            for (const key of Object.keys(op.updates)) {
              prevValue[key] = (existing as unknown as Record<string, unknown>)[key];
            }
            previousValues.push(prevValue);

            const updated: RecordShape = { ...existing, ...op.updates };
            recordCache.set(op.table, op.id, updated, { force: true });
          } else {
            previousValues.push(undefined);
          }
        }

        if (onBeforeWrite !== undefined) {
          onBeforeWrite(operations, previousValues, options);
        }

        const flatOperations: RealtimeOp[] = [];
        for (const op of operations) {
          for (const [key, value] of Object.entries(op.updates)) {
            flatOperations.push({
              type: 'set',
              table: op.table,
              id: op.id,
              key,
              value,
            });
          }
        }

        const transaction: QueuedTx = {
          txId: generateTxId(),
          authorId: userId,
          clientTimestamp: Date.now(),
          operations: flatOperations,
        };

        await transactionQueue.enqueue(transaction);
      } catch (err) {
        const writeError = err instanceof Error ? err : new Error('Write failed');
        setError(writeError);
        throw writeError;
      } finally {
        setIsWriting(false);
      }
    },
    [userId, recordCache, transactionQueue, onBeforeWrite],
  );

  return { write, isWriting, error };
}
