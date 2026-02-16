// main/server/core/src/bootstrap.ts
import { loadServerEnv } from '@abe-stack/server-engine/config';
import { createLogger, type BaseLogger, type LogData } from '@abe-stack/shared';

import {
  createDbClient,
  createPostgresPubSub,
  createPostgresQueueStore, // Import store factory
  createRepositories,
  requireValidSchema,
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
  type AuthEmailTemplates, // Import from server-engine
  type QueueStore,
  type ServerSearchProvider,
  type SystemContext,
  type WriteService,
} from '../../engine/src';

export type { SystemContext };

// Removed import from @abe-stack/core/auth since we import from server-engine
import type { AppConfig, PostgresConfig } from '@abe-stack/server-engine/config';

/**
 * Simple Console Logger Adapter to avoid dependency on pino in core.
 */
const consoleBaseLogger: BaseLogger = {
  trace: (data: LogData, msg: string) => {
    console.trace(msg, data);
  },
  debug: (data: LogData, msg: string) => {
    console.debug(msg, data);
  },
  info: (data: LogData, msg: string) => {
    console.info(msg, data);
  },
  warn: (data: LogData, msg: string) => {
    console.warn(msg, data);
  },
  error: (data: LogData, msg: string) => {
    console.error(msg, data);
  },
  fatal: (data: LogData, msg: string) => {
    console.error('[FATAL]', msg, data);
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
    initEnv();
    config = loadServerEnv() as any;
  }

  // 2. Logger
  // Use the console adapter to avoid direct pino dependency in core
  const logger = createLogger(consoleBaseLogger);

  logger.info('Bootstrapping system...');

  // 2.5 Error Tracking
  initSentry({
    dsn: (process.env['SENTRY_DSN'] as string) ?? null,
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

  // 6. Cache
  const cache = createCache({
    driver: (config.cache as any).driver,
    redisUrl: (config.cache as any).redisUrl,
    ttl: config.cache.ttl,
  });

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

  // We creating the STORE here, not the server
  const queueStore: QueueStore = createPostgresQueueStore(db);

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
    search: async () => ({ data: [], page: 1, limit: 10, hasNext: false, hasPrev: false }),
    searchWithCursor: async () => ({
      data: [],
      nextCursor: null,
      prevCursor: null,
      hasNext: false,
      hasPrev: false,
      limit: 10,
    }),
    searchFaceted: async () => ({ data: [], page: 1, limit: 10, hasNext: false, hasPrev: false }),
    count: async () => 0,
    healthCheck: async () => true,
    close: async () => {},
  };

  // 10. Email Templates
  const templates = emailTemplates as unknown as AuthEmailTemplates;

  // 11. Assemble Context
  const context: SystemContext = {
    config,
    log: logger,
    db,
    repos,
    cache: cache as any,
    pubsub: pgPubSub,
    queue: queueStore as any,
    queueStore,
    write: writeService,
    search,
    emailTemplates: templates,
    errorTracker: errorTracker as any,

    // Helper to check health - uses full context
    health: async () => getDetailedHealth(context),

    // Add contextualize helper for RLS
    contextualize: (session: SessionContext) => {
      const scopedDb = db.withSession(session);
      return {
        ...context,
        db: scopedDb as any,
        repos: createRepositories(scopedDb),
      };
    },
  };

  // Corrected logStartupSummary call
  await logStartupSummary(context, {
    host: config.server.host,
    port: config.server.port,
    routeCount: 0, // Placeholder
  });

  return context;
}
