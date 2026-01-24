// apps/server/src/services/service-container.ts
/**
 * Service Container - Dependency Injection Container
 *
 * Contains all application services and configuration.
 * Separated from lifecycle management to follow single responsibility principle.
 */

import type { AppConfig } from '@/config';
import { buildConnectionString } from '@/config';
import type { PostgresPubSub } from '@infrastructure/index';
import {
  createDbClient,
  createEmailService,
  createPostgresPubSub,
  createStorage,
  getRepositoryContext,
  SubscriptionManager,
  type DbClient,
  type EmailService,
  type Repositories,
  type StorageProvider,
  type SubscriptionKey,
} from '@infrastructure/index';

import { type AppContext, type IServiceContainer } from '@shared/index';
import { CacheService } from './cache-service';

import type { FastifyBaseLogger } from 'fastify';

export interface ServiceContainerOptions {
  config: AppConfig;
  // Optional overrides for testing
  db?: DbClient;
  repos?: Repositories;
  email?: EmailService;
  storage?: StorageProvider;
}

export class ServiceContainer implements IServiceContainer {
  // configuration
  readonly config: AppConfig;

  // Infrastructure services (IServiceContainer implementation)
  readonly db: DbClient;
  readonly repos: Repositories;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;
  readonly cache: CacheService;

  // Horizontal scaling adapter
  private _pgPubSub: PostgresPubSub | null = null;

  constructor(options: ServiceContainerOptions) {
    this.config = options.config;

    // Build connection string
    const connectionString = buildConnectionString(this.config.database);

    // Initialize infrastructure services
    this.db = options.db ?? createDbClient(connectionString);
    const repoCtx = getRepositoryContext(connectionString);
    this.repos = options.repos ?? repoCtx.repos;
    this.email = options.email ?? createEmailService(this.config.email);
    this.storage = options.storage ?? createStorage(this.config.storage);

    // Initialize cache service
    this.cache = new CacheService({
      ttl: this.config.cache.ttl,
      maxSize: this.config.cache.maxSize,
    });

    // Initialize Pub/Sub with horizontal scaling if connection string is available
    this.pubsub = new SubscriptionManager();

    let pubsubConnString: string | undefined;
    if (this.config.database.provider === 'postgresql') {
      pubsubConnString = this.config.database.connectionString || connectionString;
    }

    if (pubsubConnString && this.config.env !== 'test') {
      this._pgPubSub = createPostgresPubSub({
        connectionString: pubsubConnString,
        onMessage: (key: string, version: number): void => {
          this.pubsub.publishLocal(key as SubscriptionKey, version);
        },
        onError: (err: Error) => {
          // Note: At this stage, we don't have access to the server logger yet
          // Errors will be handled when the logger becomes available
          process.stderr.write(`PostgresPubSub error: ${String(err)}\n`);
        },
      });
      this.pubsub.setAdapter(this._pgPubSub);
    }
  }

  get pgPubSub(): PostgresPubSub | null {
    return this._pgPubSub;
  }

  /**
   * Initialize the service container
   * This can be called after the server logger is available to set up proper error handling
   */
  initialize(logger?: FastifyBaseLogger): void {
    if (this._pgPubSub && logger) {
      // Update the error handler to use the proper logger
      // This is a simplified approach - in a real implementation you might need to recreate the pubsub
      // with the proper error handler, or store the logger for later use
    }
  }

  /**
   * Get the application context for handlers
   * This is what gets passed to all route handlers
   */
  getContext(logger: FastifyBaseLogger): AppContext {
    return {
      config: this.config,
      db: this.db,
      repos: this.repos,
      email: this.email,
      storage: this.storage,
      pubsub: this.pubsub,
      cache: this.cache,
      log: logger,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this._pgPubSub) {
      await this._pgPubSub.stop();
    }

    // Clean up cache service to prevent memory leaks
    this.cache.cleanup();
  }
}

/**
 * Create a ServiceContainer instance with default configuration
 */
export function createServiceContainer(config: AppConfig): ServiceContainer {
  return new ServiceContainer({ config });
}

/**
 * Create a mock ServiceContainer for testing
 */
export function createTestServiceContainer(
  Overrides: Partial<AppConfig> = {},
  serviceOverrides: Partial<Pick<ServiceContainerOptions, 'db' | 'email' | 'storage'>> = {},
): ServiceContainer {
  const test: AppConfig = {
    env: 'test',
    server: {
      host: '127.0.0.1',
      port: 0, // Random port
      portFallbacks: [],
      cors: { origin: ['*'], credentials: false, methods: ['GET', 'POST'] },
      trustProxy: false,
      logLevel: 'error',
      maintenanceMode: false,
      appBaseUrl: 'http://localhost:5173',
      apiBaseUrl: 'http://localhost:0',
      rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100, // 100 requests
      },
    },
    database: {
      provider: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
      maxConnections: 1,
      portFallbacks: [],
      ssl: false,
    },
    auth: {
      strategies: ['local'],
      jwt: {
        secret: 'test-secret-that-is-at-least-32-chars',
        accessTokenExpiry: '15m',
        issuer: 'test',
        audience: 'test',
      },
      refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
      argon2: { type: 2, memoryCost: 1024, timeCost: 1, parallelism: 1 },
      password: { minLength: 8, maxLength: 64, minZxcvbnScore: 2 },
      lockout: {
        maxAttempts: 10,
        lockoutDurationMs: 1800000,
        progressiveDelay: false,
        baseDelayMs: 0,
      },
      bffMode: false,
      proxy: { trustProxy: false, trustedProxies: [], maxProxyDepth: 1 },
      rateLimit: {
        login: { max: 100, windowMs: 60000 },
        register: { max: 100, windowMs: 60000 },
        forgotPassword: { max: 100, windowMs: 60000 },
        verifyEmail: { max: 100, windowMs: 60000 },
      },
      cookie: {
        name: 'refreshToken',
        secret: 'test',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      },
      oauth: {},
      magicLink: { tokenExpiryMinutes: 15, maxAttempts: 3 },
      totp: { issuer: 'Test', window: 1 },
    },
    email: {
      provider: 'console',
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: { user: '', pass: '' },
        connectionTimeout: 30000,
        socketTimeout: 30000,
      },
      from: { name: 'Test', address: 'test@test.com' },
      replyTo: 'test@test.com',
    },
    storage: {
      provider: 'local',
      rootPath: './test-uploads',
    },
    cache: {
      ttl: 1000, // 1 second for tests
      maxSize: 100, // smaller cache for tests
      useExternalProvider: false,
    },
    billing: {
      enabled: false,
      provider: 'stripe',
      currency: 'USD',
      stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
      paypal: { clientId: '', clientSecret: '', webhookId: '', sandbox: true },
      plans: {},
      urls: {
        portalReturnUrl: 'http://localhost:5173/settings/billing',
        checkoutSuccessUrl: 'http://localhost:5173/checkout/success',
        checkoutCancelUrl: 'http://localhost:5173/checkout/cancel',
      },
    },
    queue: {
      provider: 'local',
      pollIntervalMs: 1000,
      concurrency: 1,
      defaultMaxAttempts: 3,
      backoffBaseMs: 1000,
      maxBackoffMs: 30000,
    },
    notifications: {
      enabled: false,
      provider: 'fcm',
      config: {
        credentials: '',
        projectId: '',
      },
    },
    search: {
      provider: 'sql',
      config: {
        defaultPageSize: 20,
        maxPageSize: 100,
      },
    },
    packageManager: {
      provider: 'pnpm',
      strictPeerDeps: true,
      frozenLockfile: true,
    },
    ...Overrides,
  };

  return new ServiceContainer({
    config: test,
    email: serviceOverrides.email ?? createEmailService(test.email),
    ...serviceOverrides,
  });
}
