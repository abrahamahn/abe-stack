// packages/sdk/src/offline/TransactionQueue.ts
/**
 * Transaction Queue for Offline-First Support
 *
 * Based on chet-stack's TransactionQueue implementation.
 * Provides:
 * - Queueing mutations when offline
 * - Processing queue when online
 * - Conflict resolution with retry logic
 * - Rollback on permanent failure
 * - Persistence to localStorage/IndexedDB
 * - Pending write tracking with subscriptions
 */

import {
  BadRequestError,
  DeferredPromise,
  ForbiddenError,
  InternalError,
  MS_PER_SECOND,
  ReactiveMap,
  type Operation,
  type Transaction,
} from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

/**
 * A record pointer identifies a specific entity for pending write tracking.
 */
export interface TransactionRecordPointer {
  /** Entity type (e.g., 'user', 'post') */
  table: string;
  /** Entity ID */
  id: string;
}

/**
 * Internal thunk that pairs a transaction with its deferred promise.
 */
interface Thunk {
  deferred: DeferredPromise<void>;
  transaction: QueuedTransaction;
}

export type QueuedTransaction = Transaction;

/**
 * Options for the TransactionQueue.
 */
export interface TransactionQueueOptions {
  /**
   * Function to send a transaction to the server.
   * Should return response status and optional error message.
   */
  submitTransaction: (transaction: QueuedTransaction) => Promise<TransactionResponse>;

  /**
   * Called when a transaction must be rolled back due to permanent failure.
   * The client should undo any optimistic updates made for this transaction.
   */
  onRollback: (transaction: QueuedTransaction) => Promise<void>;

  /**
   * Storage key prefix for localStorage persistence.
   * @default 'abe-transaction-queue'
   */
  storageKey?: string;

  /**
   * Maximum size of a batch in characters (JSON stringified).
   * @default 100_000
   */
  maxBatchSize?: number;

  /**
   * Maximum retries for transient errors before giving up.
   * @default 10
   */
  maxRetries?: number;

  /**
   * Called when online status changes.
   */
  onOnlineStatusChange?: (isOnline: boolean) => void;

  /**
   * Called when processing status changes.
   */
  onProcessingStatusChange?: (isProcessing: boolean) => void;

  /**
   * Called when queue size changes.
   */
  onQueueSizeChange?: (size: number) => void;
}

/**
 * Response from the transaction submission.
 */
export interface TransactionResponse {
  /** HTTP status code */
  status: number;
  /** Error message if any */
  message?: string;
}

/**
 * Result of attempting to write a transaction.
 */
type WriteResult =
  | { type: 'ok' }
  | { type: 'offline' }
  | { type: 'rollback'; error: Error }
  | { type: 'error'; error: Error };

/**
 * Queue status information.
 */
export interface TransactionQueueStatus {
  isOnline: boolean;
  isProcessing: boolean;
  queueSize: number;
  pendingWrites: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORAGE_KEY = 'abe-transaction-queue';
const DEFAULT_MAX_BATCH_SIZE = 100_000;
const DEFAULT_MAX_RETRIES = 10;

/** HTTP status codes */
const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_FORBIDDEN = 403;
const STATUS_CONFLICT = 409;
const STATUS_UNPROCESSABLE = 422;
const STATUS_INTERNAL_ERROR = 500;
const STATUS_OFFLINE = 0;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a record pointer to a unique string key.
 */
function pointerToKey(pointer: TransactionRecordPointer): string {
  return `${pointer.table}:${pointer.id}`;
}

/**
 * Extract unique record pointers from operations.
 */
function extractPointers(operations: Operation[]): TransactionRecordPointer[] {
  const seen = new Set<string>();
  const pointers: TransactionRecordPointer[] = [];

  for (const op of operations) {
    const table = (op as any).table;
    const id = (op as any).id;
    if (typeof table === 'string' && typeof id === 'string') {
      const key = `${table}:${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        pointers.push({ table, id });
      }
    }
  }

  return pointers;
}

/**
 * Generate a random ID for transactions.
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// TransactionQueue Class
// ============================================================================

/**
 * Queue for managing offline-first transaction processing.
 *
 * Features:
 * - Queues transactions when offline
 * - Automatically processes queue when online
 * - Batches multiple transactions for efficiency
 * - Handles conflicts with retry logic
 * - Rolls back failed transactions
 * - Persists queue to localStorage
 * - Tracks pending writes per record
 *
 * @example Basic usage
 * ```typescript
 * const queue = new TransactionQueue({
 *   submitTransaction: async (tx) => {
 *     const res = await fetch('/api/transactions', {
 *       method: 'POST',
 *       body: JSON.stringify(tx),
 *     });
 *     return { status: res.status };
 *   },
 *   onRollback: async (tx) => {
 *     // Undo optimistic updates
 *     for (const op of tx.operations.reverse()) {
 *       await undoOperation(op);
 *     }
 *   },
 * });
 *
 * // Enqueue a transaction
 * await queue.enqueue({
 *   id: 'tx-1',
 *   authorId: 'user-1',
 *   timestamp: Date.now(),
 *   operations: [{ type: 'set', path: ['posts', 'p1', 'title'], value: 'Hello' }],
 * });
 * ```
 *
 * @example Checking pending writes
 * ```typescript
 * // Check if a record has pending writes
 * const isPending = queue.isPendingWrite({ table: 'posts', id: 'p1' });
 *
 * // Subscribe to pending status changes
 * const unsubscribe = queue.subscribeIsPendingWrite(
 *   { table: 'posts', id: 'p1' },
 *   (isPending) => console.log('Pending:', isPending)
 * );
 * ```
 */
export class TransactionQueue {
  private thunks: Thunk[] = [];
  private running = false;
  private isOnline: boolean;
  private readonly pendingWrites = new ReactiveMap<string, number>();
  private readonly options: Required<TransactionQueueOptions>;
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor(options: TransactionQueueOptions) {
    this.options = {
      submitTransaction: options.submitTransaction,
      onRollback: options.onRollback,
      storageKey: options.storageKey ?? DEFAULT_STORAGE_KEY,
      maxBatchSize: options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      onOnlineStatusChange: options.onOnlineStatusChange ?? ((): void => {}),
      onProcessingStatusChange: options.onProcessingStatusChange ?? ((): void => {}),
      onQueueSizeChange: options.onQueueSizeChange ?? ((): void => {}),
    };

    // Initialize online status
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Bind event handlers
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);

    // Setup online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundHandleOnline);
      window.addEventListener('offline', this.boundHandleOffline);
    }

    // Restore queue from storage
    this.loadFromStorage();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Enqueue a transaction for processing.
   * Returns a promise that resolves when the transaction is successfully processed
   * or rejects if it fails permanently.
   *
   * @param transaction - The transaction to enqueue
   * @returns Promise that resolves when transaction is processed
   */
  enqueue(transaction: QueuedTransaction): Promise<void> {
    // Track which records have pending writes
    const pointers = extractPointers(transaction.operations);
    this.incPendingWrites(pointers);

    // Create deferred promise for this transaction
    const deferred = new DeferredPromise<void>();
    this.thunks.push({ deferred, transaction });
    this.saveToStorage();
    this.notifyQueueSizeChange();

    // Start processing if not already running
    void this.dequeue();

    // Return promise that cleans up pending writes when done
    return deferred.promise.finally(() => {
      this.decPendingWrites(pointers);
    });
  }

  /**
   * Check if a record has pending writes.
   *
   * @param pointer - The record to check
   * @returns True if there are pending writes for this record
   */
  isPendingWrite(pointer: TransactionRecordPointer): boolean {
    const count = this.pendingWrites.get(pointerToKey(pointer)) ?? 0;
    return count > 0;
  }

  /**
   * Subscribe to pending write status changes for a specific record.
   *
   * @param pointer - The record to watch
   * @param callback - Called when pending status changes
   * @returns Unsubscribe function
   */
  subscribeIsPendingWrite(
    pointer: TransactionRecordPointer,
    callback: (isPending: boolean) => void,
  ): () => void {
    let previousValue = this.isPendingWrite(pointer);

    return this.pendingWrites.subscribe(pointerToKey(pointer), () => {
      const currentValue = this.isPendingWrite(pointer);
      if (previousValue !== currentValue) {
        previousValue = currentValue;
        callback(currentValue);
      }
    });
  }

  /**
   * Get current queue status.
   */
  getStatus(): TransactionQueueStatus {
    return {
      isOnline: this.isOnline,
      isProcessing: this.running,
      queueSize: this.thunks.length,
      pendingWrites: this.pendingWrites.size,
    };
  }

  /**
   * Get all queued transactions.
   */
  getQueuedTransactions(): QueuedTransaction[] {
    return this.thunks.map((t) => t.transaction);
  }

  /**
   * Clear the queue and storage.
   * Does not reject pending promises - they will remain unresolved.
   */
  reset(): void {
    this.thunks = [];
    this.removeStorage();
    this.notifyQueueSizeChange();
  }

  /**
   * Force process the queue immediately.
   * Useful for manual retry after network issues.
   */
  async flush(): Promise<void> {
    if (!this.isOnline) {
      return;
    }
    await this.dequeue();
  }

  /**
   * Cleanup event listeners.
   * Call this when disposing of the queue.
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundHandleOnline);
      window.removeEventListener('offline', this.boundHandleOffline);
    }
  }

  // ==========================================================================
  // Queue Processing
  // ==========================================================================

  private async dequeue(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.options.onProcessingStatusChange(true);

    // Process while online and have items
    while (this.thunks.length > 0 && this.isOnline) {
      // Try writing a batch first for efficiency
      const batch = this.getBatch();
      const batchResult = await this.writeBatch(batch);

      if (batchResult.type === 'offline') {
        break; // Try again when online
      }

      if (batchResult.type === 'ok') {
        // Batch succeeded - resolve all promises and remove from queue
        for (const thunk of batch) {
          thunk.deferred.resolve();
        }
        this.thunks.splice(0, batch.length);
        this.saveToStorage();
        this.notifyQueueSizeChange();
        continue;
      }

      // Batch failed - process individually to isolate the problematic transaction
      for (const thunk of batch) {
        const result = await this.writeTransaction(thunk.transaction);

        if (result.type === 'offline') {
          break; // Try again when online
        }

        // Remove from queue regardless of success/failure
        this.thunks.shift();
        this.saveToStorage();
        this.notifyQueueSizeChange();

        if (result.type === 'ok') {
          thunk.deferred.resolve();
        } else if (result.type === 'error') {
          thunk.deferred.reject(result.error);
        } else {
          // rollback
          await this.options.onRollback(thunk.transaction);
          thunk.deferred.reject(result.error);
        }
      }
    }

    this.running = false;
    this.options.onProcessingStatusChange(false);
  }

  /**
   * Write a batch of transactions as a single combined transaction.
   */
  private async writeBatch(batch: Thunk[]): Promise<WriteResult> {
    if (batch.length === 0) {
      return { type: 'ok' };
    }

    const firstThunk = batch[0];
    if (batch.length === 1 && firstThunk) {
      // Single transaction - no need to combine
      return this.writeTransaction(firstThunk.transaction);
    }

    // Combine batch into single transaction
    // Safe to access since we checked batch.length > 0 and batch.length !== 1
    const { authorId } = (firstThunk ?? batch[1])?.transaction ?? { authorId: '' };
    const operations: Operation[] = [];
    for (const thunk of batch) {
      operations.push(...thunk.transaction.operations);
    }

    const combinedTransaction: QueuedTransaction = {
      txId: generateId(),
      authorId,
      clientTimestamp: Date.now(),
      operations,
    };

    return this.writeTransaction(combinedTransaction);
  }

  /**
   * Attempt to write a transaction with retry logic.
   */
  private async writeTransaction(transaction: QueuedTransaction): Promise<WriteResult> {
    let tries = 0;

    while (tries < this.options.maxRetries) {
      tries += 1;

      const response = await this.options.submitTransaction(transaction);

      // Success
      if (response.status === STATUS_OK) {
        return { type: 'ok' };
      }

      // Validation error - rollback
      if (response.status === STATUS_BAD_REQUEST || response.status === STATUS_UNPROCESSABLE) {
        const error = new BadRequestError(
          response.message ?? 'Validation failed',
          'VALIDATION_ERROR',
        );
        return { type: 'rollback', error };
      }

      // Permission error - rollback
      if (response.status === STATUS_FORBIDDEN) {
        const error = new ForbiddenError(response.message ?? 'Permission denied');
        return { type: 'rollback', error };
      }

      // Conflict error - retry immediately (optimistic locking)
      if (response.status === STATUS_CONFLICT) {
        continue;
      }

      // Server error - retry with exponential backoff
      if (response.status === STATUS_INTERNAL_ERROR) {
        const backoffMs = Math.min(2 ** tries, 12) * 10 * MS_PER_SECOND;
        await sleep(backoffMs);
        continue;
      }

      // Offline
      if (response.status === STATUS_OFFLINE) {
        return { type: 'offline' };
      }

      // Unknown error - fail immediately
      const error = new InternalError(
        response.message ?? `Unexpected status: ${response.status.toString()}`,
      );
      return { type: 'error', error };
    }

    // Max retries exceeded
    const error = new InternalError(`Transaction failed after ${tries.toString()} retries`);
    return { type: 'error', error };
  }

  /**
   * Get a batch of transactions that fit within the size limit.
   */
  private getBatch(): Thunk[] {
    const first = this.thunks[0];
    if (!first) return [];

    const firstSize = JSON.stringify(first.transaction).length;

    // Single item exceeds max - return just that
    if (firstSize >= this.options.maxBatchSize) {
      return [first];
    }

    let batchSize = firstSize;
    const batch: Thunk[] = [first];

    for (let i = 1; i < this.thunks.length; i++) {
      const thunk = this.thunks[i];
      if (!thunk) continue;
      const thunkSize = JSON.stringify(thunk.transaction).length;

      if (batchSize + thunkSize > this.options.maxBatchSize) {
        break;
      }

      batchSize += thunkSize;
      batch.push(thunk);
    }

    return batch;
  }

  // ==========================================================================
  // Pending Writes Tracking
  // ==========================================================================

  private incPendingWrites(pointers: TransactionRecordPointer[]): void {
    const writes = pointers.map((pointer) => {
      const key = pointerToKey(pointer);
      const current = this.pendingWrites.get(key) ?? 0;
      return { key, value: current + 1 };
    });
    this.pendingWrites.write(writes);
  }

  private decPendingWrites(pointers: TransactionRecordPointer[]): void {
    const writes = pointers.map((pointer) => {
      const key = pointerToKey(pointer);
      const current = this.pendingWrites.get(key) ?? 0;

      if (current === 0) {
        // Pending write count should never be zero
      }

      if (current > 1) {
        return { key, value: current - 1 };
      }
      return { key, value: undefined };
    });
    this.pendingWrites.write(writes);
  }

  // ==========================================================================
  // Online/Offline Handling
  // ==========================================================================

  private handleOnline(): void {
    this.isOnline = true;
    this.options.onOnlineStatusChange(true);

    // Resume processing when back online
    if (this.thunks.length > 0) {
      void this.dequeue();
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.options.onOnlineStatusChange(false);
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = this.thunks.map((t) => t.transaction);
      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
    } catch {
      // Storage save failed silently
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = localStorage.getItem(this.options.storageKey);
      if (!data) return;

      const transactions = JSON.parse(data) as QueuedTransaction[];
      for (const transaction of transactions) {
        // Re-enqueue each transaction
        const pointers = extractPointers(transaction.operations);
        this.incPendingWrites(pointers);

        const deferred = new DeferredPromise<void>();
        this.thunks.push({ deferred, transaction });

        // Clean up pending writes when the transaction completes
        void deferred.promise.finally(() => {
          this.decPendingWrites(pointers);
        });
      }

      // Start processing if we have items
      if (this.thunks.length > 0 && this.isOnline) {
        void this.dequeue();
      }
    } catch {
      // Storage load failed silently
    }
  }

  private removeStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.options.storageKey);
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  private notifyQueueSizeChange(): void {
    this.options.onQueueSizeChange(this.thunks.length);
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a TransactionQueue instance.
 *
 * @example
 * ```typescript
 * import { createTransactionQueue } from '@abe-stack/sdk/offline';
 *
 * const queue = createTransactionQueue({
 *   submitTransaction: async (tx) => {
 *     const res = await fetch('/api/transactions', {
 *       method: 'POST',
 *       body: JSON.stringify(tx),
 *     });
 *     return { status: res.status };
 *   },
 *   onRollback: async (tx) => {
 *     console.log('Rolling back transaction:', tx.id);
 *     // Undo optimistic updates
 *   },
 *   onOnlineStatusChange: (isOnline) => {
 *     console.log('Online status:', isOnline);
 *   },
 * });
 * ```
 */
export function createTransactionQueue(options: TransactionQueueOptions): TransactionQueue {
  return new TransactionQueue(options);
}
