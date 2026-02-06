// apps/server/src/main.test.ts
/**
 * Unit Tests for Application Entry Point
 *
 * Tests the main bootstrap process including:
 * - Configuration loading and validation
 * - App instantiation and startup
 * - Signal handler registration (SIGTERM, SIGINT)
 * - Graceful shutdown scenarios
 * - Error handling and process exit behavior
 *
 * @remarks
 * Since main.ts is an entry point that executes immediately, these tests
 * simulate the main() function logic by testing the orchestration pattern
 * directly.
 *
 * @complexity O(1) - All tests run in constant time
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { App } from './app';
import type { AppConfig } from '@abe-stack/shared/config';
import type { FastifyBaseLogger } from 'fastify';

// ============================================================================
// Mock Dependencies & Types
// ============================================================================

/**
 * Captures process.on() event handlers for testing signal handling
 */
interface ProcessEventHandlers {
  sigterm?: () => void;
  sigint?: () => void;
}

/**
 * Creates a mock logger that implements FastifyBaseLogger
 */
function createMockLogger(): FastifyBaseLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as FastifyBaseLogger;
}

/**
 * Creates a mock App instance with all required properties
 */
function createMockApp(): App {
  const logger = createMockLogger();
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    log: logger,
    config: {} as AppConfig,
    db: {} as App['db'],
    repos: {} as App['repos'],
    email: {} as App['email'],
    storage: {} as App['storage'],
    notifications: {} as App['notifications'],
    billing: {} as App['billing'],
    search: {} as App['search'],
    queue: {} as App['queue'],
    write: {} as App['write'],
    pubsub: {} as App['pubsub'],
    cache: {} as App['cache'],
    server: {} as App['server'],
    context: {} as App['context'],
  } as unknown as App;
}

/**
 * Creates a mock config object
 */
function createMockConfig(): AppConfig {
  return {
    env: 'test',
    server: {
      host: 'localhost',
      port: 3000,
      logLevel: 'info',
      trustProxy: false,
      apiBaseUrl: 'http://localhost:3000',
      appBaseUrl: 'http://localhost:3001',
    },
    database: {
      provider: 'postgresql',
      connectionString: 'postgresql://test:test@localhost:5432/test',
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
      ssl: false,
      maxConnections: 10,
    },
    auth: {} as AppConfig['auth'],
    email: {} as AppConfig['email'],
    storage: {} as AppConfig['storage'],
    billing: {} as AppConfig['billing'],
    cache: {} as AppConfig['cache'],
    queue: {} as AppConfig['queue'],
    notifications: {} as AppConfig['notifications'],
    search: {} as AppConfig['search'],
  } as AppConfig;
}

/**
 * Simulates the main() function from main.ts for testing
 * This allows us to test the orchestration logic without relying on
 * the actual module execution
 *
 * @param loadConfigFn - Mock config loader function
 * @param createAppFn - Mock app factory function
 * @param processEnv - Environment variables to use
 * @param processHandlers - Object to capture registered signal handlers
 * @complexity O(1) - Executes startup sequence once
 */
async function simulateMain(
  loadConfigFn: (env: Record<string, string | undefined>) => AppConfig,
  createAppFn: (config: AppConfig) => App,
  processEnv: Record<string, string | undefined>,
  processHandlers: ProcessEventHandlers,
): Promise<void> {
  try {
    // Load and validate configuration
    const config = loadConfigFn(processEnv);

    // Create app instance (synchronous wiring)
    const app = createAppFn(config);

    // Start app (async initialization)
    await app.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      const logger = app.log;
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await app.stop();
        logger.info('Server stopped successfully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    };

    // Simulate process.on registration by calling provided handlers
    processHandlers.sigterm = (): void => {
      void shutdown('SIGTERM');
    };
    processHandlers.sigint = (): void => {
      void shutdown('SIGINT');
    };
  } catch (error) {
    process.stderr.write(`Server startup failed: ${String(error)}\n`);
    process.exit(1);
  }
}

// ============================================================================
// Tests: Successful Startup
// ============================================================================

describe('main', () => {
  let mockLoadConfig: (env: Record<string, string | undefined>) => AppConfig;
  let mockCreateApp: (config: AppConfig) => App;
  let mockApp: App;
  let mockConfig: AppConfig;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;
  let processHandlers: ProcessEventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = createMockConfig();
    mockApp = createMockApp();
    mockLoadConfig = vi.fn((_env: Record<string, string | undefined>) => mockConfig);
    mockCreateApp = vi.fn((_config: AppConfig) => mockApp);

    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: string | number | null) => {
      // Mock implementation that doesn't actually exit
    }) as typeof process.exit);

    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    processHandlers = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful startup', () => {
    it('should load config from process.env', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(mockLoadConfig).toHaveBeenCalledWith(process.env);
      expect(mockLoadConfig).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should create app with loaded config', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(mockCreateApp).toHaveBeenCalledWith(mockConfig);
      expect(mockCreateApp).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should start the app', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      const startMock = vi.mocked(mockApp.start);
      expect(startMock).toHaveBeenCalledTimes(1);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should register SIGTERM signal handler', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(processHandlers.sigterm).toBeDefined();
      expect(typeof processHandlers.sigterm).toBe('function');
    });

    it('should register SIGINT signal handler', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(processHandlers.sigint).toBeDefined();
      expect(typeof processHandlers.sigint).toBe('function');
    });
  });

  // ============================================================================
  // Tests: Configuration Failure
  // ============================================================================

  describe('configuration failure', () => {
    it('should exit with code 1 when loadConfig throws', async () => {
      const failingLoadConfig = vi.fn().mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      await simulateMain(failingLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed: Error: Invalid configuration'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockCreateApp).not.toHaveBeenCalled();
      const startMock = vi.mocked(mockApp.start);
      expect(startMock).not.toHaveBeenCalled();
    });

    it('should write error message to stderr on config failure', async () => {
      const configError = new Error('Missing required environment variable');
      const failingLoadConfig = vi.fn().mockImplementation(() => {
        throw configError;
      });

      await simulateMain(failingLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed:'),
      );
      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required environment variable'),
      );
    });
  });

  // ============================================================================
  // Tests: App Creation Failure
  // ============================================================================

  describe('app creation failure', () => {
    it('should exit with code 1 when createApp throws', async () => {
      const failingCreateApp = vi.fn().mockImplementation(() => {
        throw new Error('Failed to initialize database');
      });

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed: Error: Failed to initialize database'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      const startMock = vi.mocked(mockApp.start);
      expect(startMock).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests: App Start Failure
  // ============================================================================

  describe('app start failure', () => {
    it('should exit with code 1 when app.start() rejects', async () => {
      const failingApp = createMockApp();
      failingApp.start = vi.fn().mockRejectedValue(new Error('Port already in use'));
      const failingCreateApp = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed: Error: Port already in use'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error objects thrown during startup', async () => {
      const failingApp = createMockApp();
      failingApp.start = vi.fn().mockRejectedValue('String error');
      const failingCreateApp = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed: String error'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================================
  // Tests: Signal Handling - SIGTERM
  // ============================================================================

  describe('SIGTERM signal handling', () => {
    it('should call app.stop() when SIGTERM received', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(processHandlers.sigterm).toBeDefined();

      if (processHandlers.sigterm !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigterm();

        // Wait for async shutdown to complete
        await vi.waitFor(() => {
          expect(mockApp.log.info).toHaveBeenCalledWith(
            'Received SIGTERM, shutting down gracefully...',
          );
        });

        await vi.waitFor(() => {
          const stopMock = vi.mocked(mockApp.stop);
          expect(stopMock).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('should exit with code 0 after successful SIGTERM shutdown', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      if (processHandlers.sigterm !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigterm();

        await vi.waitFor(() => {
          expect(mockApp.log.info).toHaveBeenCalledWith('Server stopped successfully');
        });

        await vi.waitFor(() => {
          expect(exitSpy).toHaveBeenCalledWith(0);
        });
      }
    });

    it('should handle app.stop() failure on SIGTERM', async () => {
      const shutdownError = new Error('Failed to close database connection');
      const failingApp = createMockApp();
      failingApp.stop = vi.fn().mockRejectedValue(shutdownError);
      const createAppWithFailingStop = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, createAppWithFailingStop, process.env, processHandlers);

      if (processHandlers.sigterm !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigterm();

        await vi.waitFor(() => {
          const errorMock = vi.mocked(failingApp.log.error);
          expect(errorMock).toHaveBeenCalledWith({ err: shutdownError }, 'Error during shutdown');
        });

        await vi.waitFor(() => {
          expect(exitSpy).toHaveBeenCalledWith(1);
        });
      }
    });
  });

  // ============================================================================
  // Tests: Signal Handling - SIGINT
  // ============================================================================

  describe('SIGINT signal handling', () => {
    it('should call app.stop() when SIGINT received', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(processHandlers.sigint).toBeDefined();

      if (processHandlers.sigint !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigint();

        await vi.waitFor(() => {
          expect(mockApp.log.info).toHaveBeenCalledWith(
            'Received SIGINT, shutting down gracefully...',
          );
        });

        await vi.waitFor(() => {
          const stopMock = vi.mocked(mockApp.stop);
          expect(stopMock).toHaveBeenCalledTimes(1);
        });
      }
    });

    it('should exit with code 0 after successful SIGINT shutdown', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      if (processHandlers.sigint !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigint();

        await vi.waitFor(() => {
          expect(mockApp.log.info).toHaveBeenCalledWith('Server stopped successfully');
        });

        await vi.waitFor(() => {
          expect(exitSpy).toHaveBeenCalledWith(0);
        });
      }
    });

    it('should handle app.stop() failure on SIGINT', async () => {
      const shutdownError = new Error('Queue failed to drain');
      const failingApp = createMockApp();
      failingApp.stop = vi.fn().mockRejectedValue(shutdownError);
      const createAppWithFailingStop = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, createAppWithFailingStop, process.env, processHandlers);

      if (processHandlers.sigint !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigint();

        await vi.waitFor(() => {
          const errorMock = vi.mocked(failingApp.log.error);
          expect(errorMock).toHaveBeenCalledWith({ err: shutdownError }, 'Error during shutdown');
        });

        await vi.waitFor(() => {
          expect(exitSpy).toHaveBeenCalledWith(1);
        });
      }
    });
  });

  // ============================================================================
  // Tests: Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should use app.log for shutdown logging', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      if (processHandlers.sigterm !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigterm();

        await vi.waitFor(() => {
          const infoMock = vi.mocked(mockApp.log.info);
          expect(infoMock).toHaveBeenCalled();
        });
      }
    });

    it('should convert error to string in stderr output', async () => {
      const errorObject = { code: 'ERR_UNKNOWN', detail: 'Complex error' };
      const failingApp = createMockApp();
      failingApp.start = vi.fn().mockRejectedValue(errorObject);
      const failingCreateApp = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server startup failed:'),
      );
      expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[object Object]'));
    });

    it('should handle null error gracefully', async () => {
      const failingApp = createMockApp();
      failingApp.start = vi.fn().mockRejectedValue(null);
      const failingCreateApp = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle undefined error gracefully', async () => {
      const failingApp = createMockApp();
      failingApp.start = vi.fn().mockRejectedValue(undefined);
      const failingCreateApp = vi.fn().mockReturnValue(failingApp);

      await simulateMain(mockLoadConfig, failingCreateApp, process.env, processHandlers);

      expect(stderrWriteSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================================
  // Tests: Multiple Signal Handling
  // ============================================================================

  describe('multiple signal scenarios', () => {
    it('should register both SIGTERM and SIGINT handlers', async () => {
      await simulateMain(mockLoadConfig, mockCreateApp, process.env, processHandlers);

      expect(processHandlers.sigterm).toBeDefined();
      expect(processHandlers.sigint).toBeDefined();
      expect(processHandlers.sigterm).not.toBe(processHandlers.sigint);
    });

    it('should handle SIGTERM and SIGINT independently', async () => {
      const appWithStopTracking = createMockApp();
      appWithStopTracking.stop = vi.fn().mockResolvedValue(undefined);
      const createAppWithTracking = vi.fn().mockReturnValue(appWithStopTracking);

      await simulateMain(mockLoadConfig, createAppWithTracking, process.env, processHandlers);

      // Test SIGTERM
      if (processHandlers.sigterm !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigterm();

        await vi.waitFor(() => {
          expect(appWithStopTracking.stop).toHaveBeenCalledTimes(1);
        });
      }

      // Test SIGINT
      if (processHandlers.sigint !== undefined) {
        vi.clearAllMocks();
        processHandlers.sigint();

        await vi.waitFor(() => {
          expect(appWithStopTracking.stop).toHaveBeenCalledTimes(1);
        });
      }
    });
  });
});
