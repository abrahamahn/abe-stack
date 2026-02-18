// main/apps/server/src/app.ts
import { SubscriptionManager } from '@bslt/shared';
import { registerRoutes } from '@routes';

import type { SystemContext } from '@bslt/core';
import type { DbClient, QueueStore, Repositories, SessionContext } from '@bslt/db';
import type {
  QueueServer,
  ServerSearchProvider,
  SmsProvider,
  WriteService,
} from '@bslt/server-system';
import type {
  BillingService,
  CacheProvider,
  EmailService,
  ErrorTracker,
  NotificationService,
  StorageClient,
} from '@bslt/shared';
import type { AppConfig } from '@bslt/shared/config';
import type { AppContext, IServiceContainer } from '@shared';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { createServer } from '@/server';

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
  queueStore?: QueueStore;
  write?: WriteService;
  cache?: CacheProvider;
  errorTracker?: ErrorTracker;
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
  public readonly queueStore: QueueStore;
  public readonly write: WriteService;
  public readonly pubsub: SubscriptionManager;
  public readonly cache: CacheProvider;
  public readonly emailTemplates: IServiceContainer['emailTemplates'];
  public readonly sms?: SmsProvider | undefined;
  public readonly errorTracker: ErrorTracker;

  private _server: FastifyInstance | null = null;

  constructor(
    config: AppConfig,
    private readonly systemContext: SystemContext,
  ) {
    this.config = config;

    // Assign Services from SystemContext
    this.db = systemContext.db as unknown as DbClient;
    this.repos = systemContext.repos;
    this.email = systemContext.email as unknown as EmailService;
    this.storage = systemContext.storage as unknown as StorageClient;
    this.notifications = systemContext.notifications as unknown as NotificationService;
    this.billing = systemContext.billing as unknown as BillingService;
    this.search = systemContext.search;
    this.queue = systemContext.queue as unknown as QueueServer;
    this.queueStore = systemContext.queueStore;
    this.write = systemContext.write;
    this.cache = systemContext.cache as unknown as CacheProvider;
    this.emailTemplates = systemContext.emailTemplates;
    this.sms = systemContext.sms;
    this.errorTracker = systemContext.errorTracker;

    // Setup PubSub Manager (Kernel)
    this.pubsub = new SubscriptionManager();

    // Enable cross-instance publishing via PostgresPubSub adapter if available
    if (systemContext.pubsub && 'publish' in systemContext.pubsub) {
      this.pubsub.setAdapter(systemContext.pubsub as any);
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
    const { host, port } = this.config.server;
    await this._server!.listen({ port, host });
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
    if (this._server === null) throw new Error('App not initialized. Call init() first.');
    return this._server;
  }

  contextualize(session: SessionContext): AppContext {
    const systemContext = this.systemContext.contextualize(session);

    // Return a scoped AppContext
    return {
      ...this.context,
      db: systemContext.db as unknown as DbClient,
      repos: systemContext.repos,
    };
  }

  get log(): FastifyBaseLogger {
    if (this._server) return this._server.log;
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
