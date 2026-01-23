// apps/server/src/config/infra/queue.ts
import { getInt } from '@abe-stack/core/config/utils';
import type { QueueConfig } from '@abe-stack/core/contracts/config';

/**
 * Loads Queue configuration for background job processing.
 * Designed to handle local polling or distributed Redis-backed workers.
 */
export function loadQueueConfig(env: Record<string, string | undefined>): QueueConfig {
  return {
    // Infrastructure settings
    pollIntervalMs: getInt(env.QUEUE_POLL_INTERVAL_MS, 1000),
    concurrency: getInt(env.QUEUE_CONCURRENCY, 5), // How many jobs to run at once

    // Retry & Resilience logic
    defaultMaxAttempts: getInt(env.QUEUE_MAX_ATTEMPTS, 3),
    backoffBaseMs: getInt(env.QUEUE_BACKOFF_BASE_MS, 1000),
    maxBackoffMs: getInt(env.QUEUE_MAX_BACKOFF_MS, 300000), // 5 minutes

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
