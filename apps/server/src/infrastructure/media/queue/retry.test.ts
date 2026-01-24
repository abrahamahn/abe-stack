// apps/server/src/infrastructure/media/queue/retry.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaProcessingRetryHandler, createMediaRetryHandler } from './retry';

import type { Logger } from '@logger';

describe('MediaProcessingRetryHandler', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create handler with default options', () => {
      const handler = new MediaProcessingRetryHandler(mockLogger);
      expect(handler).toBeDefined();
      handler.destroy();
    });

    it('should create handler with partial options', () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 5,
      });
      expect(handler).toBeDefined();
      handler.destroy();
    });

    it('should create handler with custom options', () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        jitterFactor: 0,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeoutMs: 5000,
      });
      expect(handler).toBeDefined();
      handler.destroy();
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 3,
        baseDelayMs: 10,
        jitterFactor: 0,
      });

      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry('op-1', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Media processing succeeded',
        expect.objectContaining({ operationId: 'op-1', attempt: 1 }),
      );

      handler.destroy();
    });

    it('should retry on failure and succeed eventually', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 3,
        baseDelayMs: 10,
        jitterFactor: 0,
        circuitBreakerThreshold: 10,
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await handler.executeWithRetry('op-retry', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);

      handler.destroy();
    });

    it('should throw error after exhausting retries', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 2,
        baseDelayMs: 10,
        jitterFactor: 0,
        circuitBreakerThreshold: 10,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(handler.executeWithRetry('op-fail', operation)).rejects.toThrow(
        'Media processing failed after 3 attempts: Always fails',
      );
      expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries

      handler.destroy();
    });

    it('should pass context to logger', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        jitterFactor: 0,
      });

      const operation = vi.fn().mockResolvedValue('done');
      const context = { fileId: 'file-123', userId: 'user-456' };

      await handler.executeWithRetry('op-context', operation, context);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Media processing succeeded',
        expect.objectContaining({
          operationId: 'op-context',
          fileId: 'file-123',
          userId: 'user-456',
        }),
      );

      handler.destroy();
    });

    it('should handle non-Error exceptions', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        jitterFactor: 0,
        circuitBreakerThreshold: 10,
      });

      const operation = vi.fn().mockRejectedValue('string error');

      await expect(handler.executeWithRetry('op-string-error', operation)).rejects.toThrow(
        'string error',
      );

      handler.destroy();
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold consecutive failures', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeoutMs: 60000,
        jitterFactor: 0,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      // Execute to trigger circuit breaker (1 initial + 1 retry = 2 failures)
      await expect(handler.executeWithRetry('op-cb', operation)).rejects.toThrow();

      // Circuit should be open now
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Circuit breaker opened',
        expect.objectContaining({
          operationId: 'op-cb',
        }),
      );

      handler.destroy();
    });

    it('should reject immediately when circuit is open', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 0,
        baseDelayMs: 10,
        circuitBreakerThreshold: 1,
        circuitBreakerTimeoutMs: 60000,
        jitterFactor: 0,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      // First call opens the circuit
      await expect(handler.executeWithRetry('op-circuit', operation)).rejects.toThrow();

      // Second call should fail immediately with circuit open error
      await expect(handler.executeWithRetry('op-circuit', operation)).rejects.toThrow(
        'Circuit breaker open for operation op-circuit',
      );

      // Operation should only be called once (second call blocked by circuit)
      expect(operation).toHaveBeenCalledTimes(1);

      handler.destroy();
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay exponentially', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 3,
        baseDelayMs: 50,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0,
        circuitBreakerThreshold: 10,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      await expect(handler.executeWithRetry('backoff-op', operation)).rejects.toThrow();

      // Check that scheduling retry was logged with increasing delays
      const scheduleCalls = (mockLogger.info as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'Scheduling retry',
      );

      // Should have 3 retries scheduled
      expect(scheduleCalls.length).toBe(3);

      // Verify delays increase: 50, 100, 200 (base * 2^attempt)
      const delay0 = scheduleCalls[0]?.[1]?.delay;
      const delay1 = scheduleCalls[1]?.[1]?.delay;
      const delay2 = scheduleCalls[2]?.[1]?.delay;

      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);

      handler.destroy();
    });

    it('should cap delay at maxDelayMs', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 4,
        baseDelayMs: 10,
        maxDelayMs: 20,
        backoffMultiplier: 3,
        jitterFactor: 0,
        circuitBreakerThreshold: 20,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      await expect(handler.executeWithRetry('capped-op', operation)).rejects.toThrow();

      const scheduleCalls = (mockLogger.info as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'Scheduling retry',
      );

      // All delays should be <= maxDelayMs
      for (const call of scheduleCalls) {
        expect(call[1]?.delay).toBeLessThanOrEqual(20);
      }

      handler.destroy();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        jitterFactor: 0,
        circuitBreakerThreshold: 5,
      });

      // Add some operations
      await handler.executeWithRetry('stat-op-1', () => Promise.resolve('done'));
      await handler.executeWithRetry('stat-op-2', () => Promise.resolve('done'));

      const stats = handler.getStats();

      expect(stats.totalOperations).toBe(2);
      expect(stats.openCircuits).toBe(0);
      expect(stats.averageRetries).toBeGreaterThanOrEqual(0);

      handler.destroy();
    });

    it('should track open circuits', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 0,
        baseDelayMs: 10,
        circuitBreakerThreshold: 1,
        circuitBreakerTimeoutMs: 60000,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      await expect(handler.executeWithRetry('cb-stat-op', operation)).rejects.toThrow();

      const stats = handler.getStats();
      expect(stats.openCircuits).toBe(1);

      handler.destroy();
    });
  });

  describe('resetState', () => {
    it('should reset state for an operation', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        circuitBreakerThreshold: 5,
      });

      await handler.executeWithRetry('reset-op', () => Promise.resolve('done'));

      let stats = handler.getStats();
      expect(stats.totalOperations).toBe(1);

      handler.resetState('reset-op');

      stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);

      handler.destroy();
    });
  });

  describe('cleanup', () => {
    it('should clean up old retry states', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        circuitBreakerThreshold: 5,
      });

      await handler.executeWithRetry('old-op', () => Promise.resolve('done'));

      let stats = handler.getStats();
      expect(stats.totalOperations).toBe(1);

      // Wait a tiny bit and then clean with very small maxAge
      await new Promise((resolve) => setTimeout(resolve, 50));
      handler.cleanup(10); // Clean operations older than 10ms

      stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);

      handler.destroy();
    });

    it('should keep recent states during cleanup', async () => {
      const handler = new MediaProcessingRetryHandler(mockLogger, {
        maxRetries: 1,
        baseDelayMs: 10,
        circuitBreakerThreshold: 5,
      });

      await handler.executeWithRetry('recent-op', () => Promise.resolve('done'));

      // Clean with large maxAge should keep recent states
      handler.cleanup(3600000); // 1 hour

      const stats = handler.getStats();
      expect(stats.totalOperations).toBe(1);

      handler.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up resources on destroy', () => {
      const handler = new MediaProcessingRetryHandler(mockLogger);

      // Should not throw
      handler.destroy();
      handler.destroy(); // Multiple calls should be safe

      const stats = handler.getStats();
      expect(stats.totalOperations).toBe(0);
    });
  });
});

describe('createMediaRetryHandler', () => {
  it('should create a configured retry handler', () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    const handler = createMediaRetryHandler(mockLogger);

    expect(handler).toBeInstanceOf(MediaProcessingRetryHandler);
    handler.destroy();
  });
});
