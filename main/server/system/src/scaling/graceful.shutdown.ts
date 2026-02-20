// main/server/system/src/scaling/graceful.shutdown.ts
/**
 * Graceful Shutdown Handler
 *
 * Manages orderly process shutdown for horizontally-scaled services.
 * Ensures in-flight requests complete, connections are drained, and
 * resources are cleaned up before the process exits.
 *
 * @module @bslt/server-system/scaling
 */

import { getInstanceId } from './instance';

// ============================================================================
// Types
// ============================================================================

/**
 * Logger interface for shutdown operations.
 * Compatible with the project's standard logger.
 */
export interface ShutdownLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * A closable resource (DB connection, cache, server, etc.).
 */
export interface CloseableResource {
  /** Human-readable name of the resource */
  name: string;
  /** Close/cleanup function */
  close: () => Promise<void>;
}

/**
 * Options for configuring the graceful shutdown handler.
 */
export interface GracefulShutdownOptions {
  /** Maximum time in ms to wait for in-flight requests (default: 30000) */
  timeoutMs?: number;
  /** Logger for shutdown messages */
  logger?: ShutdownLogger;
  /** Resources to close during shutdown (DB, cache, etc.) */
  resources?: CloseableResource[];
  /** Callback invoked when shutdown begins (stop accepting new requests) */
  onShutdownStart?: () => void | Promise<void>;
  /** Callback invoked after all resources are closed */
  onShutdownComplete?: () => void | Promise<void>;
  /** Signals to listen for (default: ['SIGTERM', 'SIGINT']) */
  signals?: NodeJS.Signals[];
}

/**
 * Metrics collected during shutdown.
 */
export interface ShutdownMetrics {
  /** Instance ID of the shutting-down process */
  instanceId: string;
  /** Signal that triggered shutdown */
  signal: string;
  /** Total shutdown duration in ms */
  durationMs: number;
  /** Number of resources successfully closed */
  resourcesClosed: number;
  /** Number of resources that failed to close */
  resourcesFailed: number;
  /** Whether shutdown completed within the timeout */
  graceful: boolean;
}

/**
 * Handle returned by registerGracefulShutdown for cleanup.
 */
export interface ShutdownHandle {
  /** Manually trigger shutdown (for testing or programmatic use) */
  shutdown: (signal?: string) => Promise<ShutdownMetrics>;
  /** Remove all signal listeners (for cleanup in tests) */
  unregister: () => void;
  /** Whether shutdown is currently in progress */
  isShuttingDown: () => boolean;
  /** Add a resource to be closed during shutdown */
  addResource: (resource: CloseableResource) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_SIGNALS: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

// ============================================================================
// Implementation
// ============================================================================

/**
 * Register a graceful shutdown handler for the process.
 *
 * When a shutdown signal is received:
 * 1. Calls `onShutdownStart` (stop accepting new requests)
 * 2. Waits for in-flight work to complete (up to timeout)
 * 3. Closes all registered resources (DB, cache, etc.)
 * 4. Calls `onShutdownComplete`
 * 5. Logs shutdown metrics
 * 6. Exits the process
 *
 * @param options - Shutdown configuration
 * @returns A handle for manual shutdown and cleanup
 *
 * @example
 * ```ts
 * import { registerGracefulShutdown } from '@bslt/server-system';
 *
 * const handle = registerGracefulShutdown({
 *   logger,
 *   timeoutMs: 15000,
 *   resources: [
 *     { name: 'database', close: () => db.close() },
 *     { name: 'cache', close: () => cache.close() },
 *   ],
 *   onShutdownStart: () => server.close(),
 * });
 * ```
 */
export function registerGracefulShutdown(options: GracefulShutdownOptions = {}): ShutdownHandle {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    logger,
    resources: initialResources = [],
    onShutdownStart,
    onShutdownComplete,
    signals = DEFAULT_SIGNALS,
  } = options;

  const resources: CloseableResource[] = [...initialResources];
  let shuttingDown = false;

  /**
   * Execute the shutdown sequence.
   */
  const shutdown = async (signal = 'MANUAL'): Promise<ShutdownMetrics> => {
    if (shuttingDown) {
      logger?.warn('Shutdown already in progress, ignoring duplicate signal', { signal });
      return {
        instanceId: getInstanceId(),
        signal,
        durationMs: 0,
        resourcesClosed: 0,
        resourcesFailed: 0,
        graceful: false,
      };
    }

    shuttingDown = true;
    const startTime = Date.now();
    const instanceId = getInstanceId();

    logger?.info('Graceful shutdown initiated', { instanceId, signal, timeoutMs });

    let resourcesClosed = 0;
    let resourcesFailed = 0;
    let graceful = true;

    try {
      // Step 1: Stop accepting new work
      if (onShutdownStart !== undefined) {
        logger?.info('Stopping new request acceptance');
        await Promise.resolve(onShutdownStart());
      }

      // Step 2: Close all resources with timeout
      const closePromise = closeResources(resources, logger);

      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => {
          resolve('timeout');
        }, timeoutMs);
      });

      const result = await Promise.race([closePromise, timeoutPromise]);

      if (result === 'timeout') {
        logger?.warn('Shutdown timed out, forcing exit', {
          timeoutMs,
          instanceId,
        });
        graceful = false;
        // Count what we know
        resourcesFailed = resources.length;
      } else {
        resourcesClosed = result.closed;
        resourcesFailed = result.failed;
      }

      // Step 3: Final callback
      if (onShutdownComplete !== undefined) {
        await Promise.resolve(onShutdownComplete());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger?.error('Error during shutdown', { error: error.message, instanceId });
      graceful = false;
    }

    const durationMs = Date.now() - startTime;

    const metrics: ShutdownMetrics = {
      instanceId,
      signal,
      durationMs,
      resourcesClosed,
      resourcesFailed,
      graceful,
    };

    logger?.info('Shutdown complete', {
      ...metrics,
    });

    return metrics;
  };

  /**
   * Signal handler that triggers shutdown and exits.
   */
  const signalHandler = (signal: NodeJS.Signals): void => {
    void shutdown(signal).then((metrics) => {
      process.exit(metrics.graceful ? 0 : 1);
    });
  };

  // Register signal handlers
  for (const signal of signals) {
    process.on(signal, signalHandler);
  }

  return {
    shutdown,
    unregister: (): void => {
      for (const signal of signals) {
        process.removeListener(signal, signalHandler);
      }
    },
    isShuttingDown: (): boolean => shuttingDown,
    addResource: (resource: CloseableResource): void => {
      resources.push(resource);
    },
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Close all resources, collecting success/failure counts.
 * Resources are closed in reverse order (LIFO) to respect dependency ordering
 * (e.g., close the server before the database).
 *
 * @internal
 */
async function closeResources(
  resources: CloseableResource[],
  logger?: ShutdownLogger,
): Promise<{ closed: number; failed: number }> {
  let closed = 0;
  let failed = 0;

  // Close in reverse order (LIFO)
  for (let i = resources.length - 1; i >= 0; i--) {
    const resource = resources[i];
    if (resource === undefined) continue;

    try {
      logger?.info(`Closing resource: ${resource.name}`);
      await resource.close();
      closed++;
      logger?.info(`Resource closed: ${resource.name}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger?.error(`Failed to close resource: ${resource.name}`, {
        error: error.message,
      });
      failed++;
    }
  }

  return { closed, failed };
}
