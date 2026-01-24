// apps/server/src/config/infra/queue.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, it } from 'vitest';
import { DEFAULT_QUEUE_CONFIG, loadQueueConfig } from './queue';

describe('Queue Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const config = loadQueueConfig({} as unknown as FullEnv);

    expect(config).toMatchObject({
      provider: 'local',
      concurrency: 5,
      defaultMaxAttempts: 3,
    });
  });

  it('correctly toggles between local and redis providers', () => {
    const local = loadQueueConfig({ QUEUE_PROVIDER: 'local' } as unknown as FullEnv);
    const redis = loadQueueConfig({ QUEUE_PROVIDER: 'redis' } as unknown as FullEnv);

    expect(local.provider).toBe('local');
    expect(redis.provider).toBe('redis');
  });

  it('implements sensible retry logic defaults', () => {
    const config = loadQueueConfig({} as unknown as FullEnv);

    // Premium insight: Backoff should never be 0 or negative
    expect(config.backoffBaseMs).toBeGreaterThan(0);
    expect(config.maxBackoffMs).toBeGreaterThan(config.backoffBaseMs);
  });

  it('exports a Required default config for internal service use', () => {
    expect(DEFAULT_QUEUE_CONFIG.provider).toBe('local');
    // Using Required<QueueConfig> in the constant ensures all fields are populated
    expect(DEFAULT_QUEUE_CONFIG.pollIntervalMs).toBeDefined();
  });
});
