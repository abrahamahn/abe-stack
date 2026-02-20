// main/server/system/src/scaling/graceful.shutdown.test.ts

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { registerGracefulShutdown } from './graceful.shutdown';

import type { CloseableResource, ShutdownLogger } from './graceful.shutdown';

// ============================================================================
// Helpers
// ============================================================================

function createMockLogger(): ShutdownLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockResource(name: string, delay = 0): CloseableResource & { closed: boolean } {
  const resource = {
    name,
    closed: false,
    close: vi.fn().mockImplementation(async () => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      resource.closed = true;
    }),
  };
  return resource;
}

function createFailingResource(name: string): CloseableResource {
  return {
    name,
    close: vi.fn().mockRejectedValue(new Error(`Failed to close ${name}`)),
  };
}

// ============================================================================
// Graceful Shutdown Tests
// ============================================================================

describe('registerGracefulShutdown', () => {
  let handle: ReturnType<typeof registerGracefulShutdown>;

  afterEach(() => {
    handle?.unregister();
  });

  describe('registration', () => {
    test('should return a shutdown handle', () => {
      handle = registerGracefulShutdown();

      expect(handle).toHaveProperty('shutdown');
      expect(handle).toHaveProperty('unregister');
      expect(handle).toHaveProperty('isShuttingDown');
      expect(handle).toHaveProperty('addResource');
    });

    test('should not be shutting down initially', () => {
      handle = registerGracefulShutdown();

      expect(handle.isShuttingDown()).toBe(false);
    });
  });

  describe('shutdown sequence', () => {
    test('should call onShutdownStart before closing resources', async () => {
      const callOrder: string[] = [];

      const resource = {
        name: 'db',
        close: vi.fn().mockImplementation(async () => {
          callOrder.push('resource-close');
        }),
      };

      handle = registerGracefulShutdown({
        resources: [resource],
        onShutdownStart: () => {
          callOrder.push('shutdown-start');
        },
        signals: [], // Don't register signal handlers for testing
      });

      await handle.shutdown('SIGTERM');

      expect(callOrder).toEqual(['shutdown-start', 'resource-close']);
    });

    test('should call onShutdownComplete after closing resources', async () => {
      const callOrder: string[] = [];

      const resource = {
        name: 'cache',
        close: vi.fn().mockImplementation(async () => {
          callOrder.push('resource-close');
        }),
      };

      handle = registerGracefulShutdown({
        resources: [resource],
        onShutdownComplete: () => {
          callOrder.push('shutdown-complete');
        },
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(callOrder).toEqual(['resource-close', 'shutdown-complete']);
    });

    test('should close all registered resources', async () => {
      const db = createMockResource('database');
      const cache = createMockResource('cache');
      const server = createMockResource('server');

      handle = registerGracefulShutdown({
        resources: [db, cache, server],
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(db.closed).toBe(true);
      expect(cache.closed).toBe(true);
      expect(server.closed).toBe(true);
    });

    test('should close resources in reverse order (LIFO)', async () => {
      const closeOrder: string[] = [];

      const makeResource = (name: string): CloseableResource => ({
        name,
        close: vi.fn().mockImplementation(async () => {
          closeOrder.push(name);
        }),
      });

      handle = registerGracefulShutdown({
        resources: [makeResource('first'), makeResource('second'), makeResource('third')],
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(closeOrder).toEqual(['third', 'second', 'first']);
    });

    test('should set isShuttingDown to true during shutdown', async () => {
      handle = registerGracefulShutdown({ signals: [] });

      expect(handle.isShuttingDown()).toBe(false);

      await handle.shutdown('SIGTERM');

      expect(handle.isShuttingDown()).toBe(true);
    });
  });

  describe('shutdown metrics', () => {
    test('should return metrics with instance ID and signal', async () => {
      handle = registerGracefulShutdown({ signals: [] });

      const metrics = await handle.shutdown('SIGTERM');

      expect(metrics.instanceId).toBeTruthy();
      expect(metrics.signal).toBe('SIGTERM');
    });

    test('should count successfully closed resources', async () => {
      const db = createMockResource('database');
      const cache = createMockResource('cache');

      handle = registerGracefulShutdown({
        resources: [db, cache],
        signals: [],
      });

      const metrics = await handle.shutdown('SIGTERM');

      expect(metrics.resourcesClosed).toBe(2);
      expect(metrics.resourcesFailed).toBe(0);
      expect(metrics.graceful).toBe(true);
    });

    test('should count failed resources', async () => {
      const db = createMockResource('database');
      const cache = createFailingResource('cache');

      handle = registerGracefulShutdown({
        resources: [db, cache],
        signals: [],
      });

      const metrics = await handle.shutdown('SIGTERM');

      expect(metrics.resourcesClosed).toBe(1);
      expect(metrics.resourcesFailed).toBe(1);
      expect(metrics.graceful).toBe(true);
    });

    test('should measure shutdown duration', async () => {
      const resource = createMockResource('slow-db', 50);

      handle = registerGracefulShutdown({
        resources: [resource],
        signals: [],
      });

      const metrics = await handle.shutdown('SIGTERM');

      expect(metrics.durationMs).toBeGreaterThanOrEqual(40);
    });

    test('should mark as non-graceful on timeout', async () => {
      // Resource that takes longer than timeout
      const slowResource: CloseableResource = {
        name: 'very-slow-db',
        close: () => new Promise((resolve) => setTimeout(resolve, 5000)),
      };

      handle = registerGracefulShutdown({
        resources: [slowResource],
        timeoutMs: 50,
        signals: [],
      });

      const metrics = await handle.shutdown('SIGTERM');

      expect(metrics.graceful).toBe(false);
    });
  });

  describe('duplicate shutdown prevention', () => {
    test('should ignore duplicate shutdown calls', async () => {
      const logger = createMockLogger();
      const resource = createMockResource('database');

      handle = registerGracefulShutdown({
        resources: [resource],
        logger,
        signals: [],
      });

      // First shutdown
      const metrics1 = await handle.shutdown('SIGTERM');
      expect(metrics1.resourcesClosed).toBe(1);

      // Second shutdown should be ignored
      const metrics2 = await handle.shutdown('SIGINT');
      expect(metrics2.durationMs).toBe(0);
      expect(metrics2.resourcesClosed).toBe(0);
      expect(metrics2.graceful).toBe(false);

      // Resource close should only be called once
      expect(resource.close).toHaveBeenCalledTimes(1);

      // Logger should warn about duplicate
      expect(logger.warn).toHaveBeenCalledWith(
        'Shutdown already in progress, ignoring duplicate signal',
        expect.objectContaining({ signal: 'SIGINT' }),
      );
    });
  });

  describe('addResource', () => {
    test('should allow adding resources after registration', async () => {
      handle = registerGracefulShutdown({ signals: [] });

      const resource = createMockResource('late-addition');
      handle.addResource(resource);

      await handle.shutdown('SIGTERM');

      expect(resource.closed).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should continue closing other resources when one fails', async () => {
      const db = createMockResource('database');
      const failing = createFailingResource('failing-cache');
      const server = createMockResource('server');

      handle = registerGracefulShutdown({
        resources: [db, failing, server],
        signals: [],
      });

      const metrics = await handle.shutdown('SIGTERM');

      // db and server should still be closed even though failing-cache failed
      expect(db.closed).toBe(true);
      expect(server.closed).toBe(true);
      expect(metrics.resourcesClosed).toBe(2);
      expect(metrics.resourcesFailed).toBe(1);
    });

    test('should log errors for failed resources', async () => {
      const logger = createMockLogger();
      const failing = createFailingResource('bad-cache');

      handle = registerGracefulShutdown({
        resources: [failing],
        logger,
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to close resource: bad-cache',
        expect.objectContaining({
          error: expect.stringContaining('Failed to close bad-cache'),
        }),
      );
    });
  });

  describe('logging', () => {
    test('should log shutdown initiation', async () => {
      const logger = createMockLogger();

      handle = registerGracefulShutdown({
        logger,
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(logger.info).toHaveBeenCalledWith(
        'Graceful shutdown initiated',
        expect.objectContaining({
          signal: 'SIGTERM',
          timeoutMs: 30000,
        }),
      );
    });

    test('should log shutdown completion', async () => {
      const logger = createMockLogger();

      handle = registerGracefulShutdown({
        logger,
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(logger.info).toHaveBeenCalledWith(
        'Shutdown complete',
        expect.objectContaining({
          graceful: true,
        }),
      );
    });

    test('should log each resource close', async () => {
      const logger = createMockLogger();
      const resource = createMockResource('database');

      handle = registerGracefulShutdown({
        resources: [resource],
        logger,
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(logger.info).toHaveBeenCalledWith('Closing resource: database');
      expect(logger.info).toHaveBeenCalledWith('Resource closed: database');
    });
  });

  describe('unregister', () => {
    test('should remove signal listeners', () => {
      const removeSpy = vi.spyOn(process, 'removeListener');

      handle = registerGracefulShutdown({
        signals: ['SIGTERM', 'SIGINT'],
      });

      handle.unregister();

      expect(removeSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      removeSpy.mockRestore();
    });
  });

  describe('async onShutdownStart', () => {
    test('should handle async onShutdownStart', async () => {
      let started = false;

      handle = registerGracefulShutdown({
        onShutdownStart: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          started = true;
        },
        signals: [],
      });

      await handle.shutdown('SIGTERM');

      expect(started).toBe(true);
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should respect custom timeout', async () => {
      const logger = createMockLogger();

      // Resource that never resolves
      const stuckResource: CloseableResource = {
        name: 'stuck',
        close: () => new Promise(() => {}), // Never resolves
      };

      handle = registerGracefulShutdown({
        resources: [stuckResource],
        timeoutMs: 100,
        logger,
        signals: [],
      });

      const shutdownPromise = handle.shutdown('SIGTERM');

      // Advance past timeout
      vi.advanceTimersByTime(150);

      const metrics = await shutdownPromise;

      expect(metrics.graceful).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Shutdown timed out, forcing exit',
        expect.objectContaining({ timeoutMs: 100 }),
      );
    });
  });
});
