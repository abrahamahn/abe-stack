// apps/server/src/app.ts

import { verifyToken } from '@abe-stack/core/auth';
import { requireValidSchema } from '@abe-stack/db';
import { logStartupSummary } from '@abe-stack/server-engine';
import { SubscriptionManager, createConsoleLogger } from '@abe-stack/shared';
import { getWebSocketStats, registerWebSocket } from '@abe-stack/websocket';
import { registerRoutes } from '@routes';


import { createInfrastructure } from './infrastructure';

import type { DbClient, PostgresPubSub, Repositories } from '@abe-stack/db';
import type { QueueServer, ServerSearchProvider, WriteService } from '@abe-stack/server-engine';
import type { BillingService, CacheProvider, EmailService, StorageClient } from '@abe-stack/shared';
import type { AppConfig } from '@abe-stack/shared/config';
import type { AppContext, IServiceContainer } from '@shared';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

// Temporary local declaration - NotificationService export issue in @abe-stack/shared
interface NotificationService {
  isConfigured(): boolean;
  getFcmProvider?(): unknown;
}

import { createServer, listen } from '@/server';

export interface AppOptions {
  config: AppConfig;
  db?: DbClient;
  repos?: Repositories;
  email?: EmailService;
  storage?: StorageClient;
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
  public readonly storage: StorageClient;
  public readonly notifications: NotificationService;
  public readonly billing: BillingService;
  public readonly search: ServerSearchProvider;
  public readonly queue: QueueServer;
  public readonly write: WriteService;
  public readonly pubsub: SubscriptionManager;
  public readonly cache: CacheProvider;
  public readonly emailTemplates: IServiceContainer['emailTemplates'];

  private readonly _pgPubSub: PostgresPubSub | null = null;
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
    this._fallbackLogger = {
      level: this.config.server.logLevel,
      silent: () => {},
      info: (arg1: string | object, arg2?: string) => {
        process.stdout.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      error: (arg1: string | object, arg2?: string) => {
        process.stderr.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      warn: (arg1: string | object, arg2?: string) => {
        process.stdout.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      debug: (arg1: string | object, arg2?: string) => {
        process.stdout.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      trace: (arg1: string | object, arg2?: string) => {
        process.stdout.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      fatal: (arg1: string | object, arg2?: string) => {
        process.stderr.write(
          `${typeof arg1 === 'string' ? arg1 : ''} ${arg2 ?? JSON.stringify(arg1)}\n`,
        );
      },
      child: () => this._fallbackLogger ?? ({} as FastifyBaseLogger),
    } as unknown as FastifyBaseLogger;

    // Setup PubSub Manager (Kernel)
    this.pubsub = new SubscriptionManager();

    // Initialize Infrastructure via Container
    const infra = createInfrastructure(this.config, this.log);

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

  async start(): Promise<void> {
    try {
      // Validate DB Schema before accepting traffic
      await requireValidSchema(this.db);

      // Start internal async services
      if (this._pgPubSub !== null) await this._pgPubSub.start();

      // Initialize Web Server
      // Note: Error handling is registered by registerPlugins() inside createServer()
      // via the injected isAppError/getErrorInfo callbacks (see server.ts + http/plugins.ts)
      this._server = await createServer({
        config: this.config,
        db: this.db,
        app: this,
      });

      registerRoutes(this._server, this.context);

      // Register WebSocket support for realtime features
      registerWebSocket(this._server, this.context, { verifyToken });

      await listen(this._server, this.config);

      const routeCount = Object.values(this.moduleInfo).reduce((sum, m) => sum + m.routes, 0);
      await logStartupSummary(
        this.context,
        {
          host: this.config.server.host,
          port: this.config.server.port,
          routeCount,
        },
        getWebSocketStats(),
      );
    } catch (error) {
      this.log.error({ error }, 'Failed to start application. Cleaning up...');
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
