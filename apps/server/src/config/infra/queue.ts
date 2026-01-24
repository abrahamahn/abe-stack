// apps/server/src/config/infra/queue.ts
import type { QueueConfig } from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

/**
 * Loads Queue configuration for background job processing.
 * Designed to handle local polling or distributed Redis-backed workers.
 */
export function loadQueueConfig(env: FullEnv): QueueConfig {
  return {
    // Infrastructure settings
    pollIntervalMs: env.QUEUE_POLL_INTERVAL_MS ?? 1000,
    concurrency: env.QUEUE_CONCURRENCY ?? 5, // How many jobs to run at once

    // Retry & Resilience logic
    defaultMaxAttempts: env.QUEUE_MAX_ATTEMPTS ?? 3,
    backoffBaseMs: env.QUEUE_BACKOFF_BASE_MS ?? 1000,
    maxBackoffMs: env.QUEUE_MAX_BACKOFF_MS ?? 300000, // 5 minutes

    // Placeholder for Enterprise scaling (Redis support)
    provider: (env.QUEUE_PROVIDER || 'local') as 'local' | 'redis',
  };
}

export const DEFAULT_QUEUE_CONFIG: Required<QueueConfig> = {
  provider: 'local',
  pollIntervalMs: 1000,
  concurrency: 5,
  defaultMaxAttempts: 3,
  backoffBaseMs: 1000,
  maxBackoffMs: 300000,
};
