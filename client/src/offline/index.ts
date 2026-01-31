// client/src/offline/index.ts
/**
 * Offline-First Transaction Queue
 *
 * Provides robust offline support for mutations:
 * - Queue transactions when offline
 * - Process queue when back online
 * - Handle conflicts with retry logic
 * - Rollback on permanent failure
 * - Track pending writes per record
 */

export {
  TransactionQueue,
  createTransactionQueue,
  type QueuedTransaction,
  type TransactionRecordPointer,
  type TransactionQueueOptions,
  type TransactionQueueStatus,
  type TransactionResponse,
} from './TransactionQueue';
