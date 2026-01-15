// apps/server/src/app.ts
/**
 * Application Class - Dependency Injection Container
 *
 * Single source of truth for all application services and configuration.
 * Manages lifecycle (start/stop) and provides context to all handlers.
 *
 * Benefits:
 * - All dependencies initialized in one place
 * - Easy to test (mock individual services)
 * - Clear lifecycle management
 * - Single entry point for the application
 */

import { buildConnectionString, type AppConfig } from './config';
import {
  ConsoleEmailService,
  createDbClient,
  createStorage,
  SmtpEmailService,
  SubscriptionManager,
  type DbClient,
  type EmailService,
  type StorageConfig,
  type StorageProvider,
} from './infra';
import { registerRoutes } from './modules';
import { createServer, listen } from './server';
import { type AppContext, type IServiceContainer } from './shared';

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

// ============================================================================
// App Class
// ============================================================================

export interface AppOptions {
  config: AppConfig;
  // Optional overrides for testing
  db?: DbClient;
  email?: EmailService;
  storage?: StorageProvider;
}

export class App implements IServiceContainer {
  // Configuration
  readonly config: AppConfig;

  // Infrastructure services (IServiceContainer implementation)
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;

  // HTTP server (Fastify)
  private _server: FastifyInstance | null = null;

  constructor(options: AppOptions) {
    this.config = options.config;

    // Build connection string
    const connectionString = buildConnectionString(this.config.database);

    // Initialize infrastructure services
    this.db = options.db ?? createDbClient(connectionString);
    this.email = options.email ?? this.createEmailService();
    this.storage = options.storage ?? this.createStorageService();
    this.pubsub = new SubscriptionManager();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the application
   * Initializes the HTTP server and starts listening
   */
  async start(): Promise<void> {
    // Create Fastify instance
    this._server = await createServer({
      config: this.config,
      db: this.db,
    });

    // Register routes with context
    registerRoutes(this._server, this.context);

    // Start listening
    await listen(this._server, this.config);
  }

  /**
   * Stop the application
   * Gracefully shuts down all services
   */
  async stop(): Promise<void> {
    if (this._server) {
      await this._server.close();
      this._server = null;
    }
  }

  // ============================================================================
  // Context (for handlers)
  // ============================================================================

  /**
   * Get the application context for handlers
   * This is what gets passed to all route handlers
   */
  get context(): AppContext {
    if (!this._server) {
      throw new Error('App not started - call start() first');
    }

    return {
      config: this.config,
      db: this.db,
      email: this.email,
      storage: this.storage,
      pubsub: this.pubsub,
      log: this._server.log,
    };
  }

  /**
   * Get the Fastify server instance
   * Useful for testing or advanced configuration
   */
  get server(): FastifyInstance {
    if (!this._server) {
      throw new Error('App not started - call start() first');
    }
    return this._server;
  }

  /**
   * Get the logger
   */
  get log(): FastifyBaseLogger {
    return this.server.log;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createEmailService(): EmailService {
    if (this.config.email.provider === 'smtp') {
      return new SmtpEmailService(this.config.email);
    }
    return new ConsoleEmailService();
  }

  private createStorageService(): StorageProvider {
    // Create local storage config - S3 can be added via config extension
    const storageConfig: StorageConfig = {
      provider: 'local',
      rootPath: './uploads',
    };
    return createStorage(storageConfig);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an App instance with default configuration
 */
export function createApp(config: AppConfig): App {
  return new App({ config });
}

/**
 * Create a mock App for testing
 */
export function createTestApp(
  configOverrides: Partial<AppConfig> = {},
  serviceOverrides: Partial<Pick<AppOptions, 'db' | 'email' | 'storage'>> = {},
): App {
  const testConfig: AppConfig = {
    env: 'test',
    server: {
      host: '127.0.0.1',
      port: 0, // Random port
      portFallbacks: [],
      cors: { origin: '*', credentials: false, methods: ['GET', 'POST'] },
      trustProxy: false,
      logLevel: 'silent',
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
      maxConnections: 1,
      portFallbacks: [],
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
      smtp: { host: '', port: 587, secure: false, auth: { user: '', pass: '' } },
      from: { name: 'Test', address: 'test@test.com' },
    },
    storage: {
      provider: 'local',
      rootPath: './test-uploads',
    },
    ...configOverrides,
  };

  return new App({
    config: testConfig,
    email: serviceOverrides.email ?? new ConsoleEmailService(),
    ...serviceOverrides,
  });
}
