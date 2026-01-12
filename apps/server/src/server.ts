// apps/server/src/server.ts
import { buildConnectionString, createDbClient } from '@abe-stack/db';
import { createStorage, toStorageConfig } from '@abe-stack/storage';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerRoutes } from './routes';
import { ConsoleEmailService, SmtpEmailService } from './services';

import type { ServerEnvironment } from './services';
import type { ServerEnv } from '@abe-stack/shared';

/**
 * Create and configure Fastify server
 * This function is pure - it only creates the server without starting it
 * Perfect for testing and dependency injection
 */
type AppInstance = FastifyInstance;

export async function createServer(
  env: ServerEnv,
  connectionString?: string,
): Promise<{
  app: AppInstance;
  db: ReturnType<typeof createDbClient>;
}> {
  const isProd = process.env.NODE_ENV === 'production';
  const loggerConfig = isProd
    ? {
        level: process.env.LOG_LEVEL || 'info',
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
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

  const app: AppInstance = Fastify({
    logger: loggerConfig,
  });

  // Register plugins
  // CORS configuration - strict by default, allowing only specified origins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(helmet);

  // Rate limiting - global default, can be overridden per route
  await app.register(rateLimit, {
    global: false, // We'll apply rate limiting selectively
    max: 100,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // Cookie plugin for refresh tokens
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
    hook: 'onRequest',
    parseOptions: {},
  });

  // CSRF protection - uses double-submit cookie pattern
  // Note: For API-first architecture, this provides defense-in-depth
  // Works with SameSite cookies for additional protection
  await app.register(csrfProtection, {
    cookieOpts: {
      signed: true,
      sameSite: isProd ? 'strict' : 'lax',
      httpOnly: true,
      secure: isProd,
    },
    sessionPlugin: '@fastify/cookie',
  });

  // Initialize database connection
  const dbConnectionString = connectionString ?? buildConnectionString(env);
  const db = createDbClient(dbConnectionString);

  // Create ServerEnvironment - single context object for all services
  const serverEnv: ServerEnvironment = {
    config: env,
    db,
    storage: createStorage(toStorageConfig(env)),
    email: isProd ? new SmtpEmailService() : new ConsoleEmailService(),
    log: app.log,
  };

  // Keep db decoration for health check route
  app.decorate('db', db);

  // Root route
  app.get('/', {}, () => ({
    message: 'ABE Stack API',
    timestamp: new Date().toISOString(),
  }));

  // API route
  app.get('/api', {}, () => ({
    message: 'ABE Stack API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // Health check route with database check
  app.get('/health', {}, async () => {
    let dbHealthy = true;

    try {
      await app.db.execute(sql`SELECT 1`);
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

  // Register application routes with ServerEnvironment
  registerRoutes(app, serverEnv);

  // NOTE: Rate limiting is implemented through login attempt tracking and account lockout
  // in the security module (lib/security.ts). This provides fine-grained control per email/IP
  // and includes progressive delays and lockout mechanisms.
  // The @fastify/rate-limit plugin is registered for future use if needed for global limits.

  return { app, db };
}
