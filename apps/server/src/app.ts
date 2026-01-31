// apps/server/src/app.ts

import { verifyToken } from '@abe-stack/auth';
import { createMemoryCache } from '@abe-stack/cache';
import { BaseError, createConsoleLogger, SubscriptionManager } from '@abe-stack/core';
import { createPostgresPubSub } from '@abe-stack/core/pubsub/postgres';
import { createDbClient, getRepositoryContext, getSearchProviderFactory, requireValidSchema } from '@abe-stack/db';
import { createEmailService, emailTemplates } from '@abe-stack/email';
import { createPostgresQueueStore, createQueueServer, createWriteService } from '@abe-stack/jobs';
import { createNotificationProviderService } from '@abe-stack/notifications';
import { registerWebSocket } from '@abe-stack/realtime';
import { createStorage } from '@abe-stack/storage';
import { logStartupSummary } from '@health';
import { registerRoutes } from '@routes';
import { type AppContext, type IServiceContainer } from '@shared';

import { createBillingProvider } from '../../../modules/billing/src';

import type { CacheProvider } from '@abe-stack/cache';
import type { AppConfig, BillingService, EmailService, NotificationService } from '@abe-stack/core';
import type { PostgresPubSub } from '@abe-stack/core/pubsub/postgres';
import type { DbClient, Repositories, ServerSearchProvider } from '@abe-stack/db';
import type { QueueServer, WriteService } from '@abe-stack/jobs';
import type { FcmConfig, NotificationFactoryOptions } from '@abe-stack/notifications';
import type { StorageProvider } from '@abe-stack/storage';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { buildConnectionString, DEFAULT_SEARCH_SCHEMAS } from '@/config';
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
    const connectionString = buildConnectionString(this.config.database);

    // 1. Data Persistence
    this.db = options.db ?? createDbClient(connectionString);
    const repoCtx = getRepositoryContext(connectionString);
    this.repos = options.repos ?? repoCtx.repos;

    // 2. Storage & Messaging
    this.storage = options.storage ?? createStorage(this.config.storage);
    this.email = options.email ?? createEmailService(this.config.email);

    // 3. Notifications
    if (options.notifications !== undefined) {
      this.notifications = options.notifications;
    } else {
      const notificationOptions: NotificationFactoryOptions = {};
      if (this.config.notifications.provider === 'fcm') {
        notificationOptions.fcm = this.config.notifications.config as FcmConfig;
      }
      this.notifications = createNotificationProviderService(notificationOptions);
    }

    // 4. Billing
    this.billing =
      options.billing ??
      createBillingProvider({
        enabled: this.config.billing.enabled,
        currency: this.config.billing.currency,
        plans: this.config.billing.plans,
        provider: this.config.billing.provider,
        stripe: this.config.billing.stripe,
        paypal: this.config.billing.paypal,
        urls: this.config.billing.urls,
      });

    // 5. Search
    const userSearchSchema = DEFAULT_SEARCH_SCHEMAS['users'];
    if (userSearchSchema === undefined) {
      throw new Error('User search schema not found');
    }

    this.search =
      options.search ??
      getSearchProviderFactory().createSqlProvider(this.db, this.repos, userSearchSchema);

    // 6. Async Patterns (Write & Queue)
    this.pubsub = new SubscriptionManager();
    this.write = options.write ?? createWriteService({ db: this.db, pubsub: this.pubsub });

    this.queue =
      options.queue ??
      createQueueServer({
        store: createPostgresQueueStore(this.db),
        config: this.config.queue,
        log: this.log,
        handlers: {},
      });

    // 7. Email Templates (for auth package handlers)
    this.emailTemplates = emailTemplates;

    // 8. Cache
    this.cache =
      options.cache ??
      createMemoryCache({
        defaultTtl: this.config.cache.ttl,
        maxSize: this.config.cache.maxSize,
      });

    // 9. Scaling Adapter
    this.setupPubSub(connectionString);
  }

  private setupPubSub(connectionString: string): void {
    const pubsubConnString =
      this.config.database.provider === 'postgresql'
        ? (this.config.database.connectionString ?? connectionString)
        : null;

    if (pubsubConnString !== null && pubsubConnString !== '' && this.config.env !== 'test') {
      this._pgPubSub = createPostgresPubSub({
        connectionString: pubsubConnString,
        onMessage: (key, version) => {
          this.pubsub.publishLocal(key, version);
        },
        onError: (err: Error) => {
          this.log.error({ err }, 'PostgresPubSub error');
        },
      });
      // Do not start() here, wait for app.start()
      this.pubsub.setAdapter(this._pgPubSub);
    }
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
      if (error !== null && typeof error === 'object' && 'validation' in error && (error as { validation?: unknown }).validation !== undefined) {
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
      registerWebSocket(this._server, this.context, { verifyToken });

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
