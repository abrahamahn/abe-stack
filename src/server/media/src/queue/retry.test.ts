// src/server/media/src/queue/retry.test.ts
/**
 * Tests for MediaProcessingRetryHandler
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MediaProcessingRetryHandler, createMediaRetryHandler } from './retry';

import type { Logger } from '@abe-stack/shared';

function createMockLogger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

describe('MediaProcessingRetryHandler', () => {
  let handler: MediaProcessingRetryHandler;
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    handler = new MediaProcessingRetryHandler(logger, {
      maxRetries: 2,
      baseDelayMs: 10, // Very short delays for real-timer tests
      maxDelayMs: 50,
      backoffMultiplier: 2,
      jitterFactor: 0,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeoutMs: 100,
    });
  });

  afterEach(() => {
    handler.destroy();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry('op-1', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Media processing succeeded',
        expect.objectContaining({ operationId: 'op-1', attempt: 1 }),
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const result = await handler.executeWithRetry('op-2', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after all retries exhausted', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(handler.executeWithRetry('op-3', operation)).rejects.toThrow(
        'Media processing failed after 3 attempts: Persistent error',
      );
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should include context in log messages', async () => {
      const operation = vi.fn().mockResolvedValue('done');

      await handler.executeWithRetry('op-4', operation, { fileId: 'abc' });

      expect(logger.info).toHaveBeenCalledWith(
        'Media processing succeeded',
        expect.objectContaining({ fileId: 'abc' }),
      );
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold consecutive failures', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'));

      // First call exhausts retries (3 failures = maxRetries + 1)
      await expect(handler.executeWithRetry('op-5', operation)).rejects.toThrow();

      // Circuit should be open now (3 consecutive failures >= threshold of 3)
      await expect(handler.executeWithRetry('op-5', operation)).rejects.toThrow(
        'Circuit breaker open for operation op-5',
      );
    });

    it('should half-open circuit after timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'));

      // Exhaust retries to open circuit
      await expect(handler.executeWithRetry('op-6', operation)).rejects.toThrow();

      // Wait for circuit breaker timeout (100ms in test config)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Circuit should be half-open, allowing another attempt
      operation.mockResolvedValueOnce('recovered');

      const result = await handler.executeWithRetry('op-6', operation);
      expect(result).toBe('recovered');
    });
  });

  describe('getStats', () => {
    it('should return stats with no operations', () => {
      const stats = handler.getStats();

      expect(stats.totalOperations).toBe(0);
      expect(stats.openCircuits).toBe(0);
      expect(stats.averageRetries).toBe(0);
    });

    it('should track operations after execution', async () => {
      const operation = vi.fn().mockResolvedValue('ok');

      await handler.executeWithRetry('op-7', operation);

      const stats = handler.getStats();

      expect(stats.totalOperations).toBe(1);
      expect(stats.openCircuits).toBe(0);
    });
  });

  describe('resetState', () => {
    it('should clear state for a specific operation', async () => {
      const operation = vi.fn().mockResolvedValue('ok');
      await handler.executeWithRetry('op-8', operation);

      handler.resetState('op-8');

      const stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove stale states older than maxAge', async () => {
      const operation = vi.fn().mockResolvedValue('ok');
      await handler.executeWithRetry('op-9', operation);

      // Wait a small amount so the state's lastAttemptAt is in the past
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Clean up anything older than 10ms
      handler.cleanup(10);

      const stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clear all state and intervals', () => {
      handler.destroy();

      const stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);
    });
  });

  describe('createMediaRetryHandler', () => {
    it('should create a handler with default options', () => {
      const retryHandler = createMediaRetryHandler(logger);

      expect(retryHandler).toBeInstanceOf(MediaProcessingRetryHandler);

      retryHandler.destroy();
    });
  });
});
