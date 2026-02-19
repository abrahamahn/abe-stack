// main/server/core/src/bootstrap.ts
import { loadServerEnv } from '@bslt/server-system/config';
import {
  createLogger,
  type BaseLogger,
  type BillingService,
  type DetailedHealthResponse,
  type EmailService,
  type ErrorTracker,
  type HealthCheckCache,
  type HealthCheckQueue,
  type LogData,
  type NotificationService,
  type StorageClient,
} from '@bslt/shared';

import {
  createDbClient,
  createPostgresPubSub,
  createPostgresQueueStore, // Import store factory
  createRepositories,
  requireValidSchema,
  type PostgresPubSub,
  type RawDb,
  type Repositories,
  type SessionContext,
} from '../../db/src';
import {
  addBreadcrumb,
  captureError,
  createCache,
  createWriteService,
  emailTemplates,
  getDetailedHealth,
  initEnv,
  initSentry,
  logStartupSummary,
  setUserContext,
  type AuthEmailTemplates, // Import from server-system
  type QueueStore,
  type ServerSearchProvider,
  type WriteService,
} from '../../system/src';

import type { AppConfig, PostgresConfig } from '@bslt/server-system/config';

/**
 * Full system context assembled at bootstrap time.
 *
 * Satisfies the health-check interfaces (HealthCheckCache, HealthCheckQueue)
 * so it can be passed directly to getDetailedHealth / logStartupSummary.
 * The raw queueStore is retained for job enqueueing.
 */
export interface SystemContext {
  config: AppConfig;
  db: RawDb;
  cache: HealthCheckCache;
  queue: HealthCheckQueue;
  pubsub: PostgresPubSub;
  log: ReturnType<typeof createLogger>;
  repos: Repositories;
  write: WriteService;
  search: ServerSearchProvider;
  emailTemplates: AuthEmailTemplates;
  queueStore: QueueStore;
  errorTracker: ErrorTracker;
  notifications?: NotificationService;
  billing?: BillingService;
  /** Optional: storage client — injected at the app layer. */
  storage?: StorageClient;
  /** Optional: email service — injected at the app layer. */
  email?: EmailService;
  /** Optional: SMS provider — injected at the app layer. */
  sms?: unknown;
  health(): Promise<DetailedHealthResponse>;
  contextualize(session: SessionContext): SystemContext;
}

/**
 * Simple process-stream logger adapter to avoid both pino and no-console violations.
 * Writes structured lines to stdout (trace/debug/info) and stderr (warn/error/fatal).
 */
const consoleBaseLogger: BaseLogger = {
  trace: (_data: LogData, msg: string) => {
    process.stdout.write(`TRACE ${msg}\n`);
  },
  debug: (_data: LogData, msg: string) => {
    process.stdout.write(`DEBUG ${msg}\n`);
  },
  info: (_data: LogData, msg: string) => {
    process.stdout.write(`INFO ${msg}\n`);
  },
  warn: (_data: LogData, msg: string) => {
    process.stderr.write(`WARN ${msg}\n`);
  },
  error: (_data: LogData, msg: string) => {
    process.stderr.write(`ERROR ${msg}\n`);
  },
  fatal: (_data: LogData, msg: string) => {
    process.stderr.write(`FATAL ${msg}\n`);
  },
  child: () => consoleBaseLogger,
};

/**
 * Bootstrap the system context
 *
 * Initializes all infrastructure:
 * - Environment & Config
 * - Logger
 * - Database & Repositories
 * - Cache (Redis/Memory)
 * - Queue (Postgres/Memory)
 * - Search (SQL/Elastic)
 * - PubSub
 * - Email Templates
 * - Error Tracking (Sentry facade)
 *
 * @param options - Bootstrap options
 * @returns Fully initialized SystemContext
 */
export async function bootstrapSystem(options?: { config?: AppConfig }): Promise<SystemContext> {
  // 1. Env & Config
  let config: AppConfig;

  if (options?.config) {
    config = options.config;
  } else {
    await initEnv();
    config = loadServerEnv() as unknown as AppConfig;
  }

  // 2. Logger
  // Use the console adapter to avoid direct pino dependency in core
  const logger = createLogger(consoleBaseLogger);

  logger.info('Bootstrapping system...');

  // 2.5 Error Tracking
  initSentry({
    dsn: process.env['SENTRY_DSN'] ?? null,
    environment: config.env,
    release: process.env['RELEASE_VERSION'],
  });

  const errorTracker = {
    captureError,
    addBreadcrumb,
    setUserContext,
  };

  // 3. Database
  const dbConfig = config.database as PostgresConfig;
  // createDbClient takes a connection string text. Pool settings are read from env in client.ts
  // or we can fallback to defaults.
  const db = createDbClient(dbConfig.connectionString ?? '');

  // 4. Schema Validation (Crucial for stability)
  await requireValidSchema(db);

  // 5. Repositories
  const repos = createRepositories(db);

  // 6. Cache — wrap CacheProvider in HealthCheckCache adapter
  // CacheProvider.getStats() is synchronous; HealthCheckCache requires async with a specific shape.
  const rawCache = createCache(config.cache);
  const cache: HealthCheckCache = {
    getStats: () => {
      const { hits, misses, size } = rawCache.getStats();
      return Promise.resolve({ hits, misses, size });
    },
  };

  // 7. PubSub (for real-time events)
  const pgPubSub = createPostgresPubSub({
    connectionString: dbConfig.connectionString ?? '',
    channel: 'app_events',
    onError: (err) => {
      logger.error({ err }, 'PubSub error');
    },
  });
  await pgPubSub.start();

  // 8. Queue (Background Jobs)
  const writeService: WriteService = createWriteService({
    db,
    log: logger,
  });

  // We create the STORE here, not the server.
  // Wrap in HealthCheckQueue adapter — QueueStore uses separate getPendingCount/getFailedCount.
  const queueStore: QueueStore = createPostgresQueueStore(db);
  const queue: HealthCheckQueue = {
    getStats: async () => ({
      pending: await queueStore.getPendingCount(),
      failed: await queueStore.getFailedCount(),
    }),
  };

  // 9. Search (Safe default for SystemContext)
  const search: ServerSearchProvider = {
    name: 'noop',
    getCapabilities: () => ({
      fullTextSearch: false,
      fuzzyMatching: false,
      highlighting: false,
      nestedFields: false,
      arrayOperations: false,
      cursorPagination: false,
      supportedOperators: [],
      maxPageSize: 100,
    }),
    search: () => Promise.resolve({ data: [], page: 1, limit: 10, hasNext: false, hasPrev: false }),
    searchWithCursor: () =>
      Promise.resolve({
        data: [],
        nextCursor: null,
        prevCursor: null,
        hasNext: false,
        hasPrev: false,
        limit: 10,
      }),
    searchFaceted: () =>
      Promise.resolve({ data: [], page: 1, limit: 10, hasNext: false, hasPrev: false }),
    count: () => Promise.resolve(0),
    healthCheck: () => Promise.resolve(true),
    close: () => Promise.resolve(),
  };

  // 10. Email Templates
  const templates = emailTemplates as unknown as AuthEmailTemplates;

  // 11. Assemble Context
  const context: SystemContext = {
    config,
    log: logger,
    db,
    repos,
    cache,
    pubsub: pgPubSub,
    queue,
    queueStore,
    write: writeService,
    search,
    emailTemplates: templates,
    errorTracker: errorTracker as unknown as ErrorTracker,

    // Helper to check health — context satisfies HealthContext structurally
    health: async () => getDetailedHealth(context),

    // Add contextualize helper for RLS
    contextualize: (session: SessionContext) => {
      const scopedDb = db.withSession(session);
      return {
        ...context,
        db: scopedDb,
        repos: createRepositories(scopedDb),
      };
    },
  };

  // logStartupSummary accepts HealthContext; SystemContext satisfies it structurally
  await logStartupSummary(context, {
    host: config.server.host,
    port: config.server.port,
    routeCount: 0, // Placeholder
  });

  return context;
}
