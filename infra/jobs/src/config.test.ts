// infra/jobs/src/config.test.ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_QUEUE_CONFIG, loadQueueConfig } from './config';

import type { FullEnv } from '@abe-stack/core/config';

/**
 * Creates a base environment with queue-related defaults (as applied by Zod schema).
 * Used to simulate properly parsed FullEnv in tests.
 */
function createBaseEnv(overrides: Partial<FullEnv> = {}): FullEnv {
  return {
    QUEUE_PROVIDER: 'local',
    QUEUE_POLL_INTERVAL_MS: 1000,
    QUEUE_CONCURRENCY: 5,
    QUEUE_MAX_ATTEMPTS: 3,
    QUEUE_BACKOFF_BASE_MS: 1000,
    QUEUE_MAX_BACKOFF_MS: 300000,
    ...overrides,
  } as unknown as FullEnv;
}

describe('Queue Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const config = loadQueueConfig(createBaseEnv());

    expect(config).toMatchObject({
      provider: 'local',
      concurrency: 5,
      defaultMaxAttempts: 3,
      pollIntervalMs: 1000,
      backoffBaseMs: 1000,
      maxBackoffMs: 300000,
    });
  });

  it('loads custom configuration from environment variables', () => {
    const env = createBaseEnv({
      QUEUE_PROVIDER: 'redis',
      QUEUE_CONCURRENCY: 10,
      QUEUE_POLL_INTERVAL_MS: 500,
      QUEUE_MAX_ATTEMPTS: 5,
      QUEUE_BACKOFF_BASE_MS: 2000,
      QUEUE_MAX_BACKOFF_MS: 600000,
    });

    const config = loadQueueConfig(env);

    expect(config).toEqual({
      provider: 'redis',
      concurrency: 10,
      pollIntervalMs: 500,
      defaultMaxAttempts: 5,
      backoffBaseMs: 2000,
      maxBackoffMs: 600000,
    });
  });

  it('correctly toggles between local and redis providers', () => {
    const local = loadQueueConfig(createBaseEnv({ QUEUE_PROVIDER: 'local' }));
    const redis = loadQueueConfig(createBaseEnv({ QUEUE_PROVIDER: 'redis' }));

    expect(local.provider).toBe('local');
    expect(redis.provider).toBe('redis');
  });

  it('exports a Required default config for internal service use', () => {
    expect(DEFAULT_QUEUE_CONFIG.provider).toBe('local');
    expect(DEFAULT_QUEUE_CONFIG.pollIntervalMs).toBe(1000);
    expect(DEFAULT_QUEUE_CONFIG.concurrency).toBe(5);
  });
});
