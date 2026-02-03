// apps/server/src/app.ts

import { verifyToken } from '@abe-stack/auth';
import {
  createConsoleLogger,
  createInfrastructure, requireValidSchema
} from '@abe-stack/db';
import { BaseError, SubscriptionManager } from '@abe-stack/shared';

import { logStartupSummary } from '@abe-stack/system';
import { registerWebSocket } from '@abe-stack/websocket';
import { registerRoutes } from '@routes';
import { type AppContext, type IServiceContainer } from '@shared';

import type { CacheProvider, DbClient, PostgresPubSub, QueueServer, Repositories, ServerSearchProvider, StorageProvider, WriteService } from '@abe-stack/db';
import type { AppConfig, BillingService, EmailService, NotificationService } from '@abe-stack/shared';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { createServer, listen } from '@/server';

export interface AppOptions {
  config: AppConfig;
  db?: DbClient;
  repos?: Repositories;
  email?: EmailService;
  storage?: StorageProvider;
  notifications?: NotificationService;
  billing?: BillingService;
  search?: ServerSearchProvider;
  queue?: QueueServer;
  write?: WriteService;
  cache?: CacheProvider;
}

export class App implements IServiceContainer {
  readonly config: AppConfig;

  public readonly db: DbClient;
  public readonly repos: Repositories;
  public readonly email: EmailService;
  public readonly storage: StorageProvider;
  public readonly notifications: NotificationService;
  public readonly billing: BillingService;
  public readonly search: ServerSearchProvider;
  public readonly queue: QueueServer;
  public readonly write: WriteService;
  public readonly pubsub: SubscriptionManager;
  public readonly cache: CacheProvider;
  public readonly emailTemplates: IServiceContainer['emailTemplates'];

  private _pgPubSub: PostgresPubSub | null = null;
  private _server: FastifyInstance | null = null;
  private _fallbackLogger: FastifyBaseLogger | null = null;

  private readonly moduleInfo = {
    auth: { routes: 5 },
    users: { routes: 1 },
    admin: { routes: 1 },
    health: { routes: 4 },
  };

  constructor(options: AppOptions) {
    this.config = options.config;

    // Setup Logger immediately
    this._fallbackLogger = createConsoleLogger(this.config.server.logLevel) as unknown as FastifyBaseLogger;

    // Setup PubSub Manager (Kernel)
    this.pubsub = new SubscriptionManager();

    // Initialize Infrastructure via Container
    const infra = createInfrastructure(this.config, this.log, this.pubsub);

    // Assign Services (allow overrides from options for testing)
    this.db = options.db ?? infra.db;
    this.repos = options.repos ?? infra.repos;
    this.email = options.email ?? infra.email;
    this.storage = options.storage ?? infra.storage;
    this.notifications = options.notifications ?? infra.notifications;
    this.billing = options.billing ?? infra.billing;
    this.search = options.search ?? infra.search;
    this.queue = options.queue ?? infra.queue;
    this.write = options.write ?? infra.write;
    this.cache = options.cache ?? infra.cache;
    this.emailTemplates = infra.emailTemplates;

    this._pgPubSub = infra.pgPubSub;
  }



  private setupErrorHandler(server: FastifyInstance): void {
    server.setErrorHandler((error, request, reply) => {
      // 1. Handle Known Domain Errors (Clean Architecture)
      if (error instanceof BaseError) {
        // Log "operational" errors as info/warn, not error, to reduce noise
        if (error.statusCode < 500) {
          request.log.warn({ err: error }, 'Operational Error');
        } else {
          request.log.error({ err: error }, 'Domain Error');
        }

        return reply.status(error.statusCode).send({
          error: error.name,
          message: error.message,
          code: (error as unknown as Record<string, unknown>)['code'],
        });
      }

      // 2. Handle Schema Validation Errors (Fastify native)
      if (
        error !== null &&
        typeof error === 'object' &&
        'validation' in error &&
        (error as { validation?: unknown }).validation !== undefined
      ) {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'Invalid request data',
          details: (error as Record<string, unknown>)['validation'],
        });
      }

      // 3. Fallback: Unexpected Crash
      request.log.error({ err: error }, 'Unexpected Crash');
      return reply.status(500).send({
        error: 'InternalServerError',
        message: 'Something went wrong',
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Validate DB Schema before accepting traffic
      await requireValidSchema(this.db);

      // Start internal async services
      if (this._pgPubSub !== null) await this._pgPubSub.start();

      // Initialize Web Server
      this._server = await createServer({
        config: this.config,
        db: this.db,
        app: this,
      });

      // Register Centralized Error Handler
      this.setupErrorHandler(this._server);

      registerRoutes(this._server, this.context);

      if (this.config.features.realtime) {
        registerWebSocket(this._server, this.context, { verifyToken });
      }

      await listen(this._server, this.config);

      const routeCount = Object.values(this.moduleInfo).reduce((sum, m) => sum + m.routes, 0);
      await logStartupSummary(this.context, {
        host: this.config.server.host,
        port: this.config.server.port,
        routeCount,
      });
    } catch (error) {
      this.log.fatal({ error }, 'Failed to start application. Cleaning up...');
      await this.stop(); // Ensure partial connections are closed
      throw error;
    }
  }

  async stop(): Promise<void> {
    // 1. Stop processing new background work
    if (this._pgPubSub !== null) await this._pgPubSub.stop();
    await this.queue.stop();

    // 2. Close cache provider
    await this.cache.close();

    // 3. Stop receiving HTTP traffic
    if (this._server !== null) {
      await this._server.close();
      this._server = null;
    }

    this.log.info('Application stopped gracefully.');
  }

  get context(): AppContext {
    return {
      config: this.config,
      db: this.db,
      repos: this.repos,
      email: this.email,
      storage: this.storage,
      notifications: this.notifications,
      billing: this.billing,
      search: this.search,
      queue: this.queue,
      write: this.write,
      pubsub: this.pubsub,
      cache: this.cache,
      emailTemplates: this.emailTemplates,
      log: this.log,
    };
  }

  get server(): FastifyInstance {
    if (this._server === null) throw new Error('App not started');
    return this._server;
  }

  get log(): FastifyBaseLogger {
    if (this._server !== null) return this._server.log;
    this._fallbackLogger ??= createConsoleLogger(
      this.config.server.logLevel,
    ) as unknown as FastifyBaseLogger;
    return this._fallbackLogger;
  }
}

export function createApp(config: AppConfig): App {
  return new App({ config });
}
