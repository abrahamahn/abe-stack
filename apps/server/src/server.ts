import { buildConnectionString, createDbClient } from '@abe-stack/db';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { sql } from 'drizzle-orm';
import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import { registerRoutes } from './routes';

/**
 * Create and configure Fastify server
 * This function is pure - it only creates the server without starting it
 * Perfect for testing and dependency injection
 */
type AppInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export async function createServer(): Promise<{
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
  }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  await app.register(helmet);

  // Initialize database connection
  const db = createDbClient(buildConnectionString(process.env));

  // Decorate Fastify instance with db
  app.decorate('db', db);

  // Root route
  app.get(
    '/',
    {
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    () => ({
      message: 'ABE Stack API',
      timestamp: new Date().toISOString(),
    }),
  );

  // API route
  app.get(
    '/api',
    {
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            version: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    () => ({
      message: 'ABE Stack API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }),
  );

  // Health check route with database check
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({
            status: z.enum(['ok', 'degraded']),
            database: z.boolean(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => {
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
    },
  );

  // Register application routes
  registerRoutes(app);

  return { app, db };
}
