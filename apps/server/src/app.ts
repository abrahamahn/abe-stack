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

import { buildConnectionString, type AppConfig } from '@config/index';
import {
  createDbClient,
  createEmailService,
  createPostgresPubSub,
  createStorage,
  getDetailedHealth,
  logStartupSummary,
  registerWebSocket,
  SubscriptionManager,
  type DbClient,
  type DetailedHealthResponse,
  type EmailService,
  type LiveResponse,
  type PostgresPubSub,
  type ReadyResponse,
  type RoutesResponse,
  type StorageProvider,
} from '@infra/index';
import { registerRoutes } from '@modules/index';
import { type AppContext, type IServiceContainer } from '@shared/index';
import { sql } from 'drizzle-orm';

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { createServer, listen } from '@/server';

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

  // Horizontal scaling adapter
  private _pgPubSub: PostgresPubSub | null = null;

  // HTTP server (Fastify)
  private _server: FastifyInstance | null = null;

  // Module info for startup summary
  private readonly moduleInfo = {
    auth: { routes: 5 },
    users: { routes: 1 },
    admin: { routes: 1 },
    health: { routes: 4 }, // detailed, routes, ready, live
  };

  constructor(options: AppOptions) {
    this.config = options.config;

    // Build connection string
    const connectionString = buildConnectionString(this.config.database);

    // Initialize infrastructure services
    this.db = options.db ?? createDbClient(connectionString);
    this.email = options.email ?? createEmailService(this.config.email);
    this.storage = options.storage ?? createStorage(this.config.storage);

    // Initialize Pub/Sub with horizontal scaling if connection string is available
    this.pubsub = new SubscriptionManager();
    const pubsubConnString = this.config.database.connectionString || connectionString;

    if (pubsubConnString && this.config.env !== 'test') {
      this._pgPubSub = createPostgresPubSub({
        connectionString: pubsubConnString,
        onMessage: (key, version) => {
          this.pubsub.publishLocal(key, version);
        },
        onError: (err) => {
          // Use server logger if available, otherwise fallback to console
          if (this._server) {
            this.log.error({ err }, 'PostgresPubSub error');
          } else {
            // eslint-disable-next-line no-console
            console.error('PostgresPubSub error:', err);
          }
        },
      });
      this.pubsub.setAdapter(this._pgPubSub);
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the application
   * Initializes the HTTP server and starts listening
   */
  async start(): Promise<void> {
    // Start horizontal scaling if configured
    if (this._pgPubSub) {
      await this._pgPubSub.start();
    }

    // Create Fastify instance
    this._server = await createServer({
      config: this.config,
      db: this.db,
    });

    // Register routes with context
    registerRoutes(this._server, this.context);

    // Register WebSocket support
    await registerWebSocket(this._server, this.context);

    // Register health endpoints
    this.registerHealthEndpoints();

    // Start listening
    await listen(this._server, this.config);

    // Log startup summary
    const routeCount = Object.values(this.moduleInfo).reduce((sum, m) => sum + m.routes, 0);
    await logStartupSummary(this.context, {
      host: this.config.server.host,
      port: this.config.server.port,
      routeCount,
    });
  }

  /**
   * Register health check endpoints
   */
  private registerHealthEndpoints(): void {
    if (!this._server) return;

    // Detailed health check
    this._server.get<{ Reply: DetailedHealthResponse }>(
      '/health/detailed',
      {},
      async (): Promise<DetailedHealthResponse> => {
        return getDetailedHealth(this.context);
      },
    );

    // Route tree view
    this._server.get<{ Reply: RoutesResponse }>('/health/routes', {}, (): RoutesResponse => {
      const routes = this._server?.printRoutes({ commonPrefix: false }) ?? '';
      return {
        routes,
        timestamp: new Date().toISOString(),
      };
    });

    // Readiness probe (503 if DB is down)
    this._server.get<{ Reply: ReadyResponse }>(
      '/health/ready',
      {},
      async (_request, reply): Promise<ReadyResponse> => {
        try {
          await this.db.execute(sql`SELECT 1`);
          return { status: 'ready', timestamp: new Date().toISOString() };
        } catch {
          void reply.status(503);
          return { status: 'not_ready', timestamp: new Date().toISOString() };
        }
      },
    );

    // Liveness probe (always 200)
    this._server.get<{ Reply: LiveResponse }>('/health/live', {}, (): LiveResponse => {
      return { status: 'alive', uptime: Math.round(process.uptime()) };
    });
  }

  /**
   * Stop the application
   * Gracefully shuts down all services
   */
  async stop(): Promise<void> {
    // Stop horizontal scaling
    if (this._pgPubSub) {
      await this._pgPubSub.stop();
    }

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
    email: serviceOverrides.email ?? createEmailService(testConfig.email),
    ...serviceOverrides,
  });
}
