// main/shared/src/config/env.queue.ts
/**
 * Queue Environment Configuration
 *
 * Queue types, env interface, and validation schema.
 * Merged from config/types/infra.ts (queue section) and config/env.ts.
 *
 * @module config/env.queue
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  withDefault,
} from '../primitives/schema';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

export type QueueProvider = 'local' | 'redis';

/**
 * Background job queue configuration.
 * Supports local polling or Redis-backed distributed workers.
 */
export interface QueueConfig {
  provider: QueueProvider;
  pollIntervalMs: number;
  concurrency: number;
  defaultMaxAttempts: number;
  backoffBaseMs: number;
  maxBackoffMs: number;
}

// ============================================================================
// Env Interface
// ============================================================================

/** Queue environment variables */
export interface QueueEnv {
  QUEUE_PROVIDER: 'local' | 'redis';
  QUEUE_POLL_INTERVAL_MS: number;
  QUEUE_CONCURRENCY: number;
  QUEUE_MAX_ATTEMPTS: number;
  QUEUE_BACKOFF_BASE_MS: number;
  QUEUE_MAX_BACKOFF_MS: number;
}

// ============================================================================
// Env Schema
// ============================================================================

export const QueueEnvSchema: Schema<QueueEnv> = createSchema<QueueEnv>((data: unknown) => {
  const obj = parseObject(data, 'QueueEnv');
  return {
    QUEUE_PROVIDER: createEnumSchema(['local', 'redis'] as const, 'QUEUE_PROVIDER').parse(
      withDefault(obj['QUEUE_PROVIDER'], 'local'),
    ),
    QUEUE_POLL_INTERVAL_MS: coerceNumber(
      withDefault(obj['QUEUE_POLL_INTERVAL_MS'], 1000),
      'QUEUE_POLL_INTERVAL_MS',
    ),
    QUEUE_CONCURRENCY: coerceNumber(withDefault(obj['QUEUE_CONCURRENCY'], 5), 'QUEUE_CONCURRENCY'),
    QUEUE_MAX_ATTEMPTS: coerceNumber(
      withDefault(obj['QUEUE_MAX_ATTEMPTS'], 3),
      'QUEUE_MAX_ATTEMPTS',
    ),
    QUEUE_BACKOFF_BASE_MS: coerceNumber(
      withDefault(obj['QUEUE_BACKOFF_BASE_MS'], 1000),
      'QUEUE_BACKOFF_BASE_MS',
    ),
    QUEUE_MAX_BACKOFF_MS: coerceNumber(
      withDefault(obj['QUEUE_MAX_BACKOFF_MS'], 300000),
      'QUEUE_MAX_BACKOFF_MS',
    ),
  };
});
