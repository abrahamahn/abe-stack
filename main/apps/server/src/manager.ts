// main/apps/server/src/manager.ts
import http from 'node:http';

import { bootstrapSystem, type SystemContext } from '@bslt/core';
import { verifyToken } from '@bslt/core/auth';
import { registerScheduledTasks, stopScheduledTasks } from '@bslt/core/scheduled-tasks';
import { REQUIRED_TABLES, requireValidSchema, validateSchema } from '@bslt/db';
import { resolveTableName } from '@bslt/realtime';
import { logStartupSummary } from '@bslt/server-system';
import { getWebSocketStats, registerWebSocket } from '@bslt/websocket';

import { createApp, type App } from './app';

import type { AppConfig } from '@bslt/shared/config';

/** Narrowed type for pubsub objects that support start/stop lifecycle */
interface LifecyclePubSub {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Narrowed type for cache objects that support close */
interface ClosableCache {
  close(): Promise<void>;
}

/**
 * Server Manager
 *
 * Orchestrates the lifecycle of the application:
 * 1. Bootstraps infrastructure (via Core)
 * 2. Configures the application (Fastify)
 * 3. Starts/Stops the HTTP server & Background Services
 */
export class ServerManager {
  private app?: App;
  private context?: SystemContext;
  private port = 0;

  constructor(private readonly config: AppConfig) {}

  /**
   * Start the server and all services
   */
  async start(): Promise<void> {
    try {
      // 1. Bootstrap System (Infra & Core Services)
      // Note: We don't pass a logger here, allowing bootstrap to create the default console logger
      // tailored for the engine.
      this.context = await bootstrapSystem({ config: this.config });
      const { log, db, pubsub, repos, queueStore } = this.context;

      log.info('System bootstrapped successfully');

      // 2. Validate DB Schema
      await requireValidSchema(db);

      // 3. Start Internal Services
      if ('start' in pubsub && typeof (pubsub as Partial<LifecyclePubSub>).start === 'function') {
        await (pubsub as unknown as LifecyclePubSub).start();
      }

      // 4. Create App (Fastify)
      this.app = await createApp(this.config, this.context);

      // 5. Register WebSocket Support
      // We use the raw Fastify instance from the App
      registerWebSocket(
        this.app.server,
        {
          db: this.app.db,
          pubsub: this.app.pubsub,
          log: this.context.log,
          config: this.config,
          resolveTableName,
        },
        { verifyToken },
      );

      // 6. Register Scheduled Tasks

      // Adapted logger to match FastifyBaseLogger expectation if needed, or update registerScheduledTasks signature
      // registerScheduledTasks expects FastifyBaseLogger. SystemContext.logger is generic Logger.
      // We might need an adapter or use the app.log (which is Fastify logger)
      registerScheduledTasks(repos, this.app.log, db, queueStore, this.config.auth);

      // 7. Find Port & Listen
      this.port = await this.findAvailablePort(this.config.server.port);

      await this.app.server.ready();

      await this.app.server.listen({ port: this.port, host: this.config.server.host });

      log.info(`Server listening on ${this.config.server.host}:${String(this.port)}`);

      // 8. Log Summary
      const routeCount = this.app.countRegisteredRoutes();
      await logStartupSummary(
        this.context,
        {
          host: this.config.server.host,
          port: this.port,
          routeCount,
        },
        {
          schemaValidator: () => validateSchema(db),
          totalTableCount: REQUIRED_TABLES.length,
          websocketStats: getWebSocketStats(),
        },
      );

      // Setup graceful shutdown
      this.setupSignalHandlers();
    } catch (error: unknown) {
      process.stderr.write(`Failed to start server: ${String(error)}\n`);
      // Ensure we try to cleanup if start failed midway
      if (this.context) {
        await this.stop().catch((err: unknown) => {
          process.stderr.write(`Failed to stop during startup error: ${String(err)}\n`);
        });
      }
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    const log = this.context?.log;
    log?.info('Stopping server...');

    // 1. Stop Background Tasks
    if (this.context) {
      const { pubsub, write, cache } = this.context;
      if ('stop' in pubsub && typeof (pubsub as Partial<LifecyclePubSub>).stop === 'function') {
        await (pubsub as unknown as LifecyclePubSub).stop();
      }
      stopScheduledTasks();
      write.close();
      if ('close' in cache && typeof (cache as Partial<ClosableCache>).close === 'function') {
        await (cache as ClosableCache).close();
      }
    }

    // 2. Stop HTTP Server
    if (this.app) {
      await this.app.server.close();
    }

    log?.info('Server stopped');
  }

  /**
   * Find an available port
   */
  private async findAvailablePort(preferredPort: number): Promise<number> {
    const isPortAvailable = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const tempServer = http.createServer();
        tempServer.once('error', () => {
          resolve(false);
        });
        tempServer.once('listening', () => {
          tempServer.close(() => {
            resolve(true);
          });
        });
        tempServer.listen(port);
      });
    };

    let port = preferredPort;
    let isAvailable = await isPortAvailable(port);
    let attempts = 0;

    while (!isAvailable && attempts < 10) {
      port++;
      attempts++;
      isAvailable = await isPortAvailable(port);
    }

    if (!isAvailable) {
      throw new Error(`Could not find an available port starting from ${String(preferredPort)}`);
    }

    return port;
  }

  private setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.context?.log.info(`Received ${signal}, shutting down...`);
        await this.stop();
        process.exit(0);
      });
    });
  }
}
