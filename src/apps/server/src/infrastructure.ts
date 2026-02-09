// src/apps/server/src/infrastructure.ts

import * as billingServiceImpl from '@abe-stack/core/billing';
import * as notificationServiceImpl from '@abe-stack/core/notifications';
import {
  createRepositories,
  escapeIdentifier,
  PostgresPubSub,
  type DbClient,
  type Repositories,
  type RepositoryContext,
} from '@abe-stack/db';
import {
  createCache,
  createMemoryQueueStore,
  createOwnerRule,
  createPermissionChecker,
  createQueueServer,
  createStorage,
  createWriteService,
  emailTemplates as engineEmailTemplates,
  MailerClient,
  SqlSearchProvider,
  type CacheProvider,
  type PermissionChecker,
  type QueueServer,
  type ServerSearchProvider,
  type StorageConfig,
  type WriteService,
  type WriteServiceOptions,
} from '@abe-stack/server-engine';

import type { AuthEmailTemplates } from '@abe-stack/core/auth';
import type {
  BillingService,
  EmailService,
  StorageClient,
  SubscriptionKey,
} from '@abe-stack/shared';
import type { AppConfig, FullEnv } from '@abe-stack/shared/config';
import type { FastifyBaseLogger } from 'fastify';

// Temporary local declaration - NotificationService export issue in @abe-stack/shared
interface NotificationService {
  isConfigured(): boolean;
  getFcmProvider?(): unknown;
}

/**
 * Infrastructure Container
 *
 * Aggregates all infrastructure adapters for the application.
 */
export interface Infrastructure {
  db: DbClient;
  repos: Repositories;
  email: EmailService;
  storage: StorageClient;
  notifications: NotificationService;
  billing: BillingService;
  search: ServerSearchProvider;
  queue: QueueServer;
  write: WriteService;
  cache: CacheProvider;
  permissions: PermissionChecker;
  pgPubSub: PostgresPubSub; // PostgresPubSub is an adapter, not a SubscriptionManager
  emailTemplates: AuthEmailTemplates;
}

/**
 * Logger adapter interface for infrastructure components
 */
interface LoggerAdapter {
  debug: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string | Error, data?: Record<string, unknown>) => void;
}

/**
 * Create infrastructure container
 *
 * @param config - Application configuration
 * @param log - Fastify logger instance
 * @returns Infrastructure container with all adapters
 */
export function createInfrastructure(config: AppConfig, log: FastifyBaseLogger): Infrastructure {
  // DB & Repos
  let dbUrl = '';
  if (config.database.provider === 'postgresql') {
    if (config.database.connectionString != null && config.database.connectionString !== '') {
      dbUrl = config.database.connectionString;
    } else {
      dbUrl = `postgres://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;
    }
  } else {
    // For other providers, attempt to extract connectionString
    const db = config.database as unknown as Record<string, unknown>;
    dbUrl = (db['connectionString'] as string | undefined) ?? '';
  }

  const { raw, repos }: RepositoryContext = createRepositories(dbUrl);

  // Email - construct FullEnv mock (MailerClient only uses these fields)
  const mailerEnv = {
    NODE_ENV: config.env,
    SMTP_HOST: config.email.smtp.host,
    SMTP_PORT: config.email.smtp.port,
    SMTP_USER: config.email.smtp.auth !== undefined ? config.email.smtp.auth.user : undefined,
    SMTP_PASS: config.email.smtp.auth !== undefined ? config.email.smtp.auth.pass : undefined,
    EMAIL_FROM_ADDRESS: config.email.from.address,
  } as FullEnv;
  const mailerClient = new MailerClient(mailerEnv);
  const email: EmailService = {
    send: mailerClient.send.bind(mailerClient),
    healthCheck: async () => Promise.resolve(true),
  };

  // Storage
  const storage = createStorage(config.storage as unknown as StorageConfig);

  // Notifications (Core)
  const notifications: NotificationService = {
    ...notificationServiceImpl,
  } as unknown as NotificationService;

  // Billing (Core)
  const billing: BillingService = {
    ...billingServiceImpl,
  } as unknown as BillingService;

  // Search — SQL-based provider for the users table
  const search: ServerSearchProvider = new SqlSearchProvider(raw, repos, {
    table: 'users',
    primaryKey: 'id',
    columns: [
      { field: 'email', column: 'email', type: 'string', filterable: true, sortable: true },
      { field: 'role', column: 'role', type: 'string', filterable: true, sortable: true },
      { field: 'status', column: 'status', type: 'string', filterable: true, sortable: true },
      { field: 'createdAt', column: 'created_at', type: 'date', filterable: true, sortable: true },
    ],
    defaultSort: { column: 'created_at', order: 'desc' },
  });

  // Logger Adapter (Fastify/Pino -> Engine Interface)
  const loggerAdapter: LoggerAdapter = {
    debug: (msg: string, data?: Record<string, unknown>): void => {
      log.debug(data ?? {}, msg);
    },
    info: (msg: string, data?: Record<string, unknown>): void => {
      log.info(data ?? {}, msg);
    },
    warn: (msg: string, data?: Record<string, unknown>): void => {
      log.warn(data ?? {}, msg);
    },
    error: (msg: string | Error, data?: Record<string, unknown>): void => {
      const message = msg instanceof Error ? msg.message : msg;
      const meta = msg instanceof Error ? { ...data, err: msg } : (data ?? {});

      log.error(meta, message);
    },
  };

  // Cache
  const cache = createCache(config.cache, { logger: loggerAdapter });

  // Queue — register background task handlers
  const queueStore = createMemoryQueueStore();
  const queue = createQueueServer({
    store: queueStore,
    handlers: {
      cleanupExpiredTokens: async () => {
        await repos.magicLinkTokens.deleteExpired();
      },
      cleanupCompletedTasks: async () => {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        await queueStore.clearCompleted(cutoff);
      },
    },
    config: config.queue,
    log: loggerAdapter,
  });

  // Postgres PubSub
  const pgPubSub: PostgresPubSub = new PostgresPubSub({
    connectionString: dbUrl,
    onMessage: (key: SubscriptionKey, version: number): void => {
      // This callback is triggered when receiving messages from other instances
      // For now, we just log it. In a full implementation, this would
      // notify local subscribers
      log.info({ key, version }, 'Received PubSub message');
    },
    onError: (err: Error): void => {
      log.error({ err }, 'PubSub Error');
    },
  });

  // Write Service - Needs DB
  // Note: PostgresPubSub is an adapter for SubscriptionManager, not a SubscriptionManager itself
  // For now we don't pass pubsub since it's optional
  const writeOptions: WriteServiceOptions = {
    db: raw,
    log: loggerAdapter,
  };
  const write: WriteService = createWriteService(writeOptions);

  // Permissions — row-level access control with default owner-based rule
  const permissions = createPermissionChecker({
    config: {
      defaultDeny: false,
      globalRules: [createOwnerRule(['read', 'write', 'delete'], 'ownerId')],
    },
    recordLoader: async (table, id) => {
      const rows = await raw.raw<{ id: string; owner_id?: string; created_by?: string }>(
        `SELECT id, owner_id, created_by FROM ${escapeIdentifier(table)} WHERE id = $1 LIMIT 1`,
        [id],
      );
      const row = (rows as Array<{ id: string; owner_id?: string; created_by?: string }>)[0];
      if (row === undefined) return null;

      // Build PermissionRecord with exact optional properties
      // (exactOptionalPropertyTypes requires omitting undefined keys)
      const record: { id: string; ownerId?: string; createdBy?: string } = { id: row.id };
      if (row.owner_id !== undefined) record.ownerId = row.owner_id;
      if (row.created_by !== undefined) record.createdBy = row.created_by;
      return record;
    },
  });

  // Email Templates — use production templates from server-engine
  const emailTemplates: AuthEmailTemplates = engineEmailTemplates;

  return {
    db: raw,
    repos,
    email,
    storage,
    notifications,
    billing,
    search,
    queue,
    write,
    cache,
    permissions,
    pgPubSub,
    emailTemplates,
  };
}
