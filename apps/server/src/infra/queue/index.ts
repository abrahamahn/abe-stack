// apps/server/src/infra/queue/index.ts
/**
 * Background Job Queue
 *
 * Polling-based job queue with PostgreSQL persistence.
 * Adopted from Chet-stack's QueueServer pattern.
 *
 * Features:
 * - Persistent job storage with PostgreSQL
 * - Concurrent-safe dequeue with SELECT FOR UPDATE SKIP LOCKED
 * - Configurable retry with exponential backoff
 * - In-memory store for testing
 *
 * @example
 * // Define handlers
 * const handlers: TaskHandlers = {
 *   'send-email': async (args: { to: string; subject: string }) => {
 *     await emailService.send(args);
 *   },
 *   'process-upload': async (args: { fileId: string }) => {
 *     await processFile(args.fileId);
 *   },
 * };
 *
 * // Create and start queue
 * const queue = createQueueServer({
 *   store: createPostgresQueueStore(db),
 *   handlers,
 *   log: server.log,
 * });
 * queue.start();
 *
 * // Enqueue a task
 * await queue.enqueue('send-email', { to: 'user@example.com', subject: 'Hello' });
 *
 * // Graceful shutdown
 * await queue.stop();
 */

// Types
export type {
  QueueConfig,
  QueueStore,
  Task,
  TaskError,
  TaskHandler,
  TaskHandlers,
  TaskResult,
} from './types';

// Queue Server
export { createQueueServer, QueueServer } from './queueServer';
export type { QueueServerOptions } from './queueServer';

// Stores
export { createMemoryQueueStore, MemoryQueueStore } from './memoryStore';
export { createPostgresQueueStore, PostgresQueueStore } from './postgresStore';
