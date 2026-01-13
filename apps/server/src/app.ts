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

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import Fastify from 'fastify';

import { buildConnectionString } from './config';
import { createDbClient } from './infra/database';
import { ConsoleEmailService, SmtpEmailService } from './infra/email';
import { SubscriptionManager } from './infra/pubsub';
import { createStorage } from './infra/storage';
import { registerRoutes } from './modules';

import type { AppConfig } from './config';
import type { DbClient } from './infra/database';
import type { EmailService } from './infra/email';
import type { StorageConfig, StorageProvider } from './infra/storage';
import type { AppContext } from './shared/types';
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

export class App {
  // Configuration
  readonly config: AppConfig;

  // Infrastructure services
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;

  // HTTP server (Fastify)
  private _server: FastifyInstance | null = null;
  private _connectionString: string;

  constructor(options: AppOptions) {
    this.config = options.config;

    // Build connection string
    this._connectionString = buildConnectionString(this.config.database);

    // Initialize infrastructure services
    this.db = options.db ?? createDbClient(this._connectionString);
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
    this._server = await this.createServer();

    // Register routes with context
    registerRoutes(this._server, this.context);

    // Try to bind to port with fallback
    await this.listen();
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

  private async createServer(): Promise<FastifyInstance> {
    const isProd = this.config.env === 'production';

    // Logger configuration
    const loggerConfig = isProd
      ? { level: this.config.server.logLevel }
      : {
          level: this.config.server.logLevel,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              singleLine: true,
              ignore: 'pid,hostname',
            },
          },
        };

    const app = Fastify({ logger: loggerConfig });

    // Register core plugins
    await this.registerPlugins(app);

    // Decorate with db for health check
    app.decorate('db', this.db);
    app.decorate('pubsub', this.pubsub);

    // Register core routes
    this.registerCoreRoutes(app);

    return app;
  }

  private async registerPlugins(app: FastifyInstance): Promise<void> {
    const isProd = this.config.env === 'production';

    // CORS
    await app.register(cors, {
      origin: this.config.server.cors.origin,
      credentials: this.config.server.cors.credentials,
      methods: this.config.server.cors.methods,
    });

    // Security headers
    await app.register(helmet);

    // Rate limiting (global config, routes can override)
    await app.register(rateLimit, {
      global: false,
      max: 100,
      timeWindow: '1 minute',
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
      },
    });

    // Cookies
    await app.register(cookie, {
      secret: this.config.auth.cookie.secret,
      hook: 'onRequest',
      parseOptions: {},
    });

    // CSRF protection
    await app.register(csrfProtection, {
      cookieOpts: {
        signed: true,
        sameSite: isProd ? 'strict' : 'lax',
        httpOnly: true,
        secure: isProd,
      },
      sessionPlugin: '@fastify/cookie',
    });

    // Note: WebSocket pub/sub can be added when @fastify/websocket types are installed
  }

  private registerCoreRoutes(app: FastifyInstance): void {
    // Root route
    app.get('/', {}, () => ({
      message: 'ABE Stack API',
      timestamp: new Date().toISOString(),
    }));

    // API info route
    app.get('/api', {}, () => ({
      message: 'ABE Stack API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }));

    // Health check with database check
    app.get('/health', {}, async () => {
      let dbHealthy = true;

      try {
        await this.db.execute(sql`SELECT 1`);
      } catch (error) {
        dbHealthy = false;
        app.log.error({ err: error }, 'Database health check failed');
      }

      return {
        status: dbHealthy ? ('ok' as const) : ('degraded' as const),
        database: dbHealthy,
        timestamp: new Date().toISOString(),
      };
    });
  }

  private async listen(): Promise<void> {
    if (!this._server) {
      throw new Error('Server not initialized');
    }
    const app = this._server;
    const { host, port, portFallbacks } = this.config.server;

    // Build unique port list
    const ports = [...new Set([port, ...portFallbacks])];

    for (const p of ports) {
      try {
        await app.listen({ port: p, host });

        if (p !== port) {
          app.log.warn(`Default port ${String(port)} in use. Using fallback port ${String(p)}.`);
        }

        app.log.info(`Server listening on http://${host}:${String(p)}`);
        return;
      } catch (error: unknown) {
        if (this.isAddrInUse(error)) {
          app.log.warn(`Port ${String(p)} is in use, trying next...`);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`No available ports found from: ${ports.join(', ')}`);
  }

  private isAddrInUse(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'EADDRINUSE'
    );
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
      lockout: { maxAttempts: 10, durationMs: 1800000, progressiveDelay: false, baseDelayMs: 0 },
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
    ...configOverrides,
  };

  return new App({
    config: testConfig,
    email: serviceOverrides.email ?? new ConsoleEmailService(),
    ...serviceOverrides,
  });
}
