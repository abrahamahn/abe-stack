// apps/server/src/infrastructure.ts

import * as billingServiceImpl from '@abe-stack/core/billing';
import * as notificationServiceImpl from '@abe-stack/core/notifications';
import {
  createRepositories,
  PostgresPubSub,
  type DbClient,
  type Repositories,
  type RepositoryContext,
} from '@abe-stack/db';
import {
  createCache,
  createMemoryQueueStore,
  createQueueServer,
  createStorage,
  createWriteService,
  MailerClient,
  type CacheProvider,
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

  // Search - Mock for now as generic search is not configured
  const search: ServerSearchProvider = {
    name: 'noop',
    getCapabilities: () => ({
      fullTextSearch: false,
      fuzzyMatching: false,
      highlighting: false,
      nestedFields: false,
      arrayOperations: false,
      cursorPagination: false,
      maxPageSize: 0,
      supportedOperators: [],
    }),
    search: async () => {
      return await Promise.resolve({
        data: [],
        limit: 10,
        hasNext: false,
        hasPrev: false,
        page: 1,
        executionTime: 0,
      });
    },
    searchWithCursor: async () => {
      return await Promise.resolve({
        data: [],
        limit: 10,
        hasNext: false,
        hasPrev: false,
        nextCursor: null,
        prevCursor: null,
        executionTime: 0,
      });
    },
    searchFaceted: async () => {
      return await Promise.resolve({
        data: [],
        limit: 10,
        hasNext: false,
        hasPrev: false,
        page: 1,
        facets: [],
        executionTime: 0,
      });
    },
    count: async () => await Promise.resolve(0),
    healthCheck: async () => await Promise.resolve(true),
    close: async () => {
      await Promise.resolve();
    },
  };

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

  // Queue
  const queueStore = createMemoryQueueStore();
  const queue = createQueueServer({
    store: queueStore,
    handlers: {},
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

  // Email Templates (Simple stub implementation)
  // Note: The 'to' field is required by AuthEmailTemplates but will be overridden by the caller
  const emailTemplates: AuthEmailTemplates = {
    passwordReset: (resetUrl: string, expiresInMinutes = 30) => ({
      to: '', // Placeholder - overridden by caller
      subject: 'Reset your password',
      text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes.`,
      html: `<p>Click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${expiresInMinutes} minutes.</p>`,
    }),
    magicLink: (loginUrl: string, expiresInMinutes = 15) => ({
      to: '', // Placeholder - overridden by caller
      subject: 'Your login link',
      text: `Click this link to log in: ${loginUrl}\n\nThis link expires in ${expiresInMinutes} minutes.`,
      html: `<p>Click this link to log in: <a href="${loginUrl}">${loginUrl}</a></p><p>This link expires in ${expiresInMinutes} minutes.</p>`,
    }),
    emailVerification: (verificationUrl: string) => ({
      to: '', // Placeholder - overridden by caller
      subject: 'Verify your email address',
      text: `Click this link to verify your email: ${verificationUrl}`,
      html: `<p>Click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    }),
    existingAccountRegistrationAttempt: () => ({
      to: '', // Placeholder - overridden by caller
      subject: 'Account registration attempt',
      text: 'Someone tried to create an account with your email address.',
      html: '<p>Someone tried to create an account with your email address.</p>',
    }),
    tokenReuseAlert: () => ({
      to: '', // Placeholder - overridden by caller
      subject: 'Security alert: Token reuse detected',
      text: 'A previously used token was attempted to be reused. All your sessions have been invalidated for security.',
      html: '<p>A previously used token was attempted to be reused. All your sessions have been invalidated for security.</p>',
    }),
  };

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
    pgPubSub,
    emailTemplates,
  };
}
