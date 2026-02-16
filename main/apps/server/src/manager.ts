// main/apps/server/src/manager.ts
import http from 'node:http';

import { bootstrapSystem, type SystemContext } from '@abe-stack/core';
import { verifyToken } from '@abe-stack/core/auth';
import { registerScheduledTasks, stopScheduledTasks } from '@abe-stack/core/scheduled-tasks';
import { requireValidSchema } from '@abe-stack/db';
import { resolveTableName } from '@abe-stack/realtime';
import { logStartupSummary } from '@abe-stack/server-engine';
import { getWebSocketStats, registerWebSocket } from '@abe-stack/websocket';

import { createApp, type App } from './app';

import type { AppConfig } from '@abe-stack/shared/config';

/**
 * Server Manager
 *
 * Orchestrates the lifecycle of the application:
 * 1. Bootstraps infrastructure (via Core)
 * 2. Configures the application (Fastify)
 * 3. Starts/Stops the HTTP server & Background Services
 */
export class ServerManager {
  private server?: http.Server;
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
      const { log, db, pubsub, queue, repos, queueStore } = this.context;

      log.info('System bootstrapped successfully');

      // 2. Validate DB Schema
      await requireValidSchema(db);

      // 3. Start Internal Services
      if (pubsub && 'start' in pubsub && typeof pubsub.start === 'function') {
        await (pubsub as any).start();
      }
      // queue.start(); // QueueStore is passive, no start needed

      // 4. Create App (Fastify)
      this.app = await createApp(this.config, this.context);

      // 5. Register WebSocket Support
      // We use the raw Fastify instance from the App
      registerWebSocket(this.app.server, { ...this.context, resolveTableName } as any, {
        verifyToken,
      });

      // 6. Register Scheduled Tasks
      // Adapted logger to match FastifyBaseLogger expectation if needed, or update registerScheduledTasks signature
      // registerScheduledTasks expects FastifyBaseLogger. SystemContext.logger is generic Logger.
      // We might need an adapter or use the app.log (which is Fastify logger)
      registerScheduledTasks(repos, this.app.log, db, queueStore, this.config.auth);

      // 7. Find Port & Listen
      this.port = await this.findAvailablePort(this.config.server.port);

      await this.app.server.ready();
      this.server = this.app.server.server;

      await this.app.server.listen({ port: this.port, host: this.config.server.host });

      log.info(`Server listening on ${this.config.server.host}:${this.port}`);

      // 8. Log Summary
      const routeCount = this.app.countRegisteredRoutes();
      await logStartupSummary(
        this.context,
        {
          host: this.config.server.host,
          port: this.port,
          routeCount,
        },
        getWebSocketStats(),
      );

      // Setup graceful shutdown
      this.setupSignalHandlers();
    } catch (error) {
      console.error('Failed to start server:', error);
      // Ensure we try to cleanup if start failed midway
      if (this.context) {
        await this.stop().catch((err) => {
          console.error('Failed to stop during startup error:', err);
        });
      }
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    const log = this.context?.log || console;
    log.info('Stopping server...');

    // 1. Stop Background Tasks
    if (this.context) {
      const { pubsub, write, cache } = this.context;
      if (pubsub && 'stop' in pubsub && typeof pubsub.stop === 'function') {
        await (pubsub as any).stop();
      }
      // await queue.stop(); // QueueStore is passive
      stopScheduledTasks();
      write.close();
      await (cache as any).close();
    }

    // 2. Stop HTTP Server
    if (this.app) {
      await this.app.server.close();
    }

    log.info('Server stopped');
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
      throw new Error(`Could not find an available port starting from ${preferredPort}`);
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

  private displayStatus(): void {
    // Redundant with logStartupSummary, but kept for method completeness
    if (!this.context || !this.app) return;
    const { log } = this.context;
    log.info(`Application active on port ${this.port}`);
  }
}
