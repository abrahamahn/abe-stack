// apps/server/src/infra/write/index.ts
/**
 * Unified Write Pattern
 *
 * Transaction-aware write system with automatic PubSub publishing.
 * Adopted from Chet-stack's write pattern.
 *
 * Features:
 * - Atomic batch operations
 * - Optimistic locking with version checks
 * - Automatic PubSub after commit
 * - Extensible hooks for validation and side effects
 *
 * @example
 * const writer = createWriteService({
 *   db: ctx.db,
 *   pubsub: ctx.pubsub,
 *   log: ctx.log,
 * });
 *
 * const result = await writer.writeOne(userId, {
 *   type: 'update',
 *   table: 'users',
 *   id: userId,
 *   data: { name: 'New Name' },
 *   expectedVersion: 1,
 * });
 *
 * const batchResult = await writer.write({
 *   txId: crypto.randomUUID(),
 *   authorId: userId,
 *   operations: [
 *     { type: 'create', table: 'messages', id: msgId, data: { content: 'Hello' } },
 *     { type: 'update', table: 'threads', id: threadId, data: { replied_at: new Date() } },
 *   ],
 * });
 */

// Types
export type {
  AfterWriteHook, BeforeValidateHook, OperationResult, OperationType, WriteBatch, WriteContext, WriteError, WriteHooks, WriteOperation, WriteResult
} from './types';

// Write Service
export { createWriteService, WriteService } from './writeService';
export type { WriteServiceOptions } from './writeService';

