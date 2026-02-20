// main/apps/server/src/app.ts
import { SubscriptionManager } from '@bslt/shared';
import { registerRoutes } from '@routes';

import type { SystemContext } from '@bslt/server-system';
import type { DbClient, QueueStore, Repositories, SessionContext } from '@bslt/db';
import type {
  ServerSearchProvider,
  SmsProvider,
  WriteService,
} from '@bslt/server-system';
import type {
  BillingService,
  EmailService,
  ErrorTracker,
  HealthCheckCache,
  HealthCheckQueue,
  NotificationService,
  PostgresPubSub,
  StorageClient,
} from '@bslt/shared';
import type { AppConfig } from '@bslt/shared/config';
import type { AppContext, IServiceContainer } from '@shared';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

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
  queue?: HealthCheckQueue;
  queueStore?: QueueStore;
  write?: WriteService;
  cache?: HealthCheckCache;
  errorTracker?: ErrorTracker;
}

export class App implements IServiceContainer {
  readonly config: AppConfig;

  public readonly db: DbClient;
  public readonly repos: Repositories;
  public readonly email?: EmailService | undefined;
  public readonly storage?: StorageClient | undefined;
  public readonly notifications?: NotificationService | undefined;
  public readonly billing?: BillingService | undefined;
  public readonly search: ServerSearchProvider;
  public readonly queue: HealthCheckQueue;
  public readonly queueStore: QueueStore;
  public readonly write: WriteService;
  public readonly pubsub: SubscriptionManager;
  public readonly cache: HealthCheckCache;
  public readonly emailTemplates: IServiceContainer['emailTemplates'];
  public readonly sms?: SmsProvider | undefined;
  public readonly errorTracker: ErrorTracker;

  private _server: FastifyInstance | null = null;

  constructor(
    config: AppConfig,
    private readonly systemContext: SystemContext,
  ) {
    this.config = config;

    // Assign Services from SystemContext — types are now aligned, no casts needed
    this.db = systemContext.db;
    this.repos = systemContext.repos;
    this.email = systemContext.email;
    this.storage = systemContext.storage;
    this.notifications = systemContext.notifications;
    this.billing = systemContext.billing;
    this.search = systemContext.search;
    this.queue = systemContext.queue;
    this.queueStore = systemContext.queueStore;
    this.write = systemContext.write;
    this.cache = systemContext.cache;
    this.emailTemplates = systemContext.emailTemplates;
    this.sms = systemContext.sms;
    this.errorTracker = systemContext.errorTracker;

    // Setup PubSub Manager (Kernel)
    this.pubsub = new SubscriptionManager();

    // Enable cross-instance publishing via PostgresPubSub adapter if available
    // pubsub is typed as always present but may be undefined in test environments
    const pubsub: unknown = systemContext.pubsub;
    if (
      pubsub !== null &&
      pubsub !== undefined &&
      typeof pubsub === 'object' &&
      'publish' in pubsub
    ) {
      this.pubsub.setAdapter(pubsub as PostgresPubSub);
    }
  }

  async init(): Promise<void> {
    // We assume createServer is the one that creates Fastify instance
    this._server = await createServer({
      config: this.config,
      db: this.db,
      app: this,
    });

    registerRoutes(this._server, this.context);
  }

  async start(): Promise<void> {
    if (!this._server) {
      await this.init();
    }
    const server = this._server;
    if (!server) throw new Error('Failed to initialize server');
    await listen(server, this.config);
  }

  async stop(): Promise<void> {
    if (this._server) {
      await this._server.close();
      this._server = null;
    }
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
      queueStore: this.queueStore,
      write: this.write,
      pubsub: this.pubsub,
      cache: this.cache,
      emailTemplates: this.emailTemplates,
      sms: this.sms,
      errorTracker: this.errorTracker,
      log: this.log,
      contextualize: this.contextualize.bind(this),
    };
  }

  get server(): FastifyInstance {
    if (this._server === null) throw new Error('App not started');
    return this._server;
  }

  contextualize(session: SessionContext): AppContext {
    const systemContext = this.systemContext.contextualize(session);

    // Return a scoped AppContext — db type is already DbClient, no cast needed
    return {
      ...this.context,
      db: systemContext.db,
      repos: systemContext.repos,
    };
  }

  get log(): FastifyBaseLogger {
    if (this._server) return this._server.log;
    // SystemContext logger is structurally compatible with FastifyBaseLogger
    // at runtime; the cast bridges the nominal type difference
    return this.systemContext.log as unknown as FastifyBaseLogger;
  }

  countRegisteredRoutes(): number {
    if (this._server === null) return 0;
    const maybePrintRoutes = (this._server as { printRoutes?: () => unknown }).printRoutes;
    if (typeof maybePrintRoutes !== 'function') return 0;

    const routes = maybePrintRoutes();
    if (typeof routes !== 'string') return 0;

    return routes
      .split('\n')
      .filter((line) => line.trim().startsWith('│') || line.trim().startsWith('└')).length;
  }
}

export async function createApp(config: AppConfig, context: SystemContext): Promise<App> {
  const app = new App(config, context);
  await app.init();
  return app;
}
