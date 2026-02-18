// main/shared/src/config/env.queue.test.ts
import { describe, expect, it } from 'vitest';

import { QueueEnvSchema } from './env.queue';

describe('QueueEnvSchema', () => {
  describe('defaults', () => {
    it('defaults QUEUE_PROVIDER to local', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_PROVIDER).toBe('local');
    });

    it('defaults QUEUE_POLL_INTERVAL_MS to 1000', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_POLL_INTERVAL_MS).toBe(1000);
    });

    it('defaults QUEUE_CONCURRENCY to 5', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_CONCURRENCY).toBe(5);
    });

    it('defaults QUEUE_MAX_ATTEMPTS to 3', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_MAX_ATTEMPTS).toBe(3);
    });

    it('defaults QUEUE_BACKOFF_BASE_MS to 1000', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_BACKOFF_BASE_MS).toBe(1000);
    });

    it('defaults QUEUE_MAX_BACKOFF_MS to 300000', () => {
      const result = QueueEnvSchema.parse({});
      expect(result.QUEUE_MAX_BACKOFF_MS).toBe(300000);
    });
  });

  describe('QUEUE_PROVIDER', () => {
    it('accepts local', () => {
      expect(QueueEnvSchema.parse({ QUEUE_PROVIDER: 'local' }).QUEUE_PROVIDER).toBe('local');
    });

    it('accepts redis', () => {
      expect(QueueEnvSchema.parse({ QUEUE_PROVIDER: 'redis' }).QUEUE_PROVIDER).toBe('redis');
    });

    it('rejects sqs', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_PROVIDER: 'sqs' })).toThrow();
    });

    it('rejects rabbitmq', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_PROVIDER: 'rabbitmq' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_PROVIDER: '' })).toThrow();
    });

    it('rejects uppercase LOCAL', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_PROVIDER: 'LOCAL' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_PROVIDER: 0 })).toThrow();
    });
  });

  describe('QUEUE_POLL_INTERVAL_MS', () => {
    it('accepts a custom interval', () => {
      const result = QueueEnvSchema.parse({ QUEUE_POLL_INTERVAL_MS: 500 });
      expect(result.QUEUE_POLL_INTERVAL_MS).toBe(500);
    });

    it('coerces a string number', () => {
      const result = QueueEnvSchema.parse({ QUEUE_POLL_INTERVAL_MS: '2000' });
      expect(result.QUEUE_POLL_INTERVAL_MS).toBe(2000);
    });

    it('rejects a non-numeric string', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_POLL_INTERVAL_MS: 'fast' })).toThrow();
    });

    it('accepts zero (no minimum enforced)', () => {
      const result = QueueEnvSchema.parse({ QUEUE_POLL_INTERVAL_MS: 0 });
      expect(result.QUEUE_POLL_INTERVAL_MS).toBe(0);
    });

    it('accepts a negative value (no minimum enforced at schema level)', () => {
      const result = QueueEnvSchema.parse({ QUEUE_POLL_INTERVAL_MS: -100 });
      expect(result.QUEUE_POLL_INTERVAL_MS).toBe(-100);
    });
  });

  describe('QUEUE_CONCURRENCY', () => {
    it('accepts a custom concurrency value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_CONCURRENCY: 10 });
      expect(result.QUEUE_CONCURRENCY).toBe(10);
    });

    it('coerces a string concurrency value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_CONCURRENCY: '1' });
      expect(result.QUEUE_CONCURRENCY).toBe(1);
    });

    it('rejects an alphabetic value', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_CONCURRENCY: 'unlimited' })).toThrow();
    });

    it('accepts very high concurrency (no max enforced)', () => {
      const result = QueueEnvSchema.parse({ QUEUE_CONCURRENCY: 10000 });
      expect(result.QUEUE_CONCURRENCY).toBe(10000);
    });
  });

  describe('QUEUE_MAX_ATTEMPTS', () => {
    it('accepts a custom max attempts value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_MAX_ATTEMPTS: 5 });
      expect(result.QUEUE_MAX_ATTEMPTS).toBe(5);
    });

    it('coerces a string value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_MAX_ATTEMPTS: '10' });
      expect(result.QUEUE_MAX_ATTEMPTS).toBe(10);
    });

    it('rejects an alphabetic value', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_MAX_ATTEMPTS: 'many' })).toThrow();
    });

    it('accepts 1 as minimal retry count', () => {
      const result = QueueEnvSchema.parse({ QUEUE_MAX_ATTEMPTS: 1 });
      expect(result.QUEUE_MAX_ATTEMPTS).toBe(1);
    });
  });

  describe('QUEUE_BACKOFF_BASE_MS', () => {
    it('accepts a custom base backoff', () => {
      const result = QueueEnvSchema.parse({ QUEUE_BACKOFF_BASE_MS: 500 });
      expect(result.QUEUE_BACKOFF_BASE_MS).toBe(500);
    });

    it('coerces a string value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_BACKOFF_BASE_MS: '2000' });
      expect(result.QUEUE_BACKOFF_BASE_MS).toBe(2000);
    });

    it('rejects a non-numeric string', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_BACKOFF_BASE_MS: 'slow' })).toThrow();
    });
  });

  describe('QUEUE_MAX_BACKOFF_MS', () => {
    it('accepts a custom max backoff', () => {
      const result = QueueEnvSchema.parse({ QUEUE_MAX_BACKOFF_MS: 600000 });
      expect(result.QUEUE_MAX_BACKOFF_MS).toBe(600000);
    });

    it('coerces a string value', () => {
      const result = QueueEnvSchema.parse({ QUEUE_MAX_BACKOFF_MS: '60000' });
      expect(result.QUEUE_MAX_BACKOFF_MS).toBe(60000);
    });

    it('rejects a non-numeric string', () => {
      expect(() => QueueEnvSchema.parse({ QUEUE_MAX_BACKOFF_MS: 'forever' })).toThrow();
    });
  });

  describe('full configuration', () => {
    it('accepts a complete redis queue setup', () => {
      const result = QueueEnvSchema.parse({
        QUEUE_PROVIDER: 'redis',
        QUEUE_POLL_INTERVAL_MS: 500,
        QUEUE_CONCURRENCY: 20,
        QUEUE_MAX_ATTEMPTS: 5,
        QUEUE_BACKOFF_BASE_MS: 2000,
        QUEUE_MAX_BACKOFF_MS: 120000,
      });
      expect(result.QUEUE_PROVIDER).toBe('redis');
      expect(result.QUEUE_CONCURRENCY).toBe(20);
      expect(result.QUEUE_MAX_ATTEMPTS).toBe(5);
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => QueueEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => QueueEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => QueueEnvSchema.parse('local')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = QueueEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = QueueEnvSchema.safeParse({ QUEUE_PROVIDER: 'kafka' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for a non-numeric concurrency without throwing', () => {
      const result = QueueEnvSchema.safeParse({ QUEUE_CONCURRENCY: 'infinite' });
      expect(result.success).toBe(false);
    });
  });
});
