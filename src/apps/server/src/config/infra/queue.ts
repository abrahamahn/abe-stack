// src/apps/server/src/config/infra/queue.ts
import { MS_PER_MINUTE } from '@abe-stack/shared';

import type { FullEnv, QueueConfig } from '@abe-stack/shared/config';

/**
 * Loads Queue configuration for background job processing.
 * Designed to handle local polling or distributed Redis-backed workers.
 */
/**
 * Load Job Queue Configuration.
 *
 * Defines behavior for background processing.
 * - **Local**: In-memory or simple database polling.
 * - **Redis**: Enterprise-grade distributed queue (if enabled).
 *
 * Configures concurrency, polling intervals, and exponential backoff strategies for retries.
 */
export function loadQueueConfig(env: FullEnv): QueueConfig {
  return {
    // Infrastructure settings
    pollIntervalMs: env.QUEUE_POLL_INTERVAL_MS,
    concurrency: env.QUEUE_CONCURRENCY,

    // Retry & Resilience logic
    defaultMaxAttempts: env.QUEUE_MAX_ATTEMPTS,
    backoffBaseMs: env.QUEUE_BACKOFF_BASE_MS,
    maxBackoffMs: env.QUEUE_MAX_BACKOFF_MS,

    // Placeholder for Enterprise scaling (Redis support)
    provider: env.QUEUE_PROVIDER,
  };
}

export const DEFAULT_QUEUE_CONFIG: Required<QueueConfig> = {
  provider: 'local',
  pollIntervalMs: 1000,
  concurrency: 5,
  defaultMaxAttempts: 3,
  backoffBaseMs: 1000,
  maxBackoffMs: 5 * MS_PER_MINUTE,
};
