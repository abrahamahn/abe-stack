import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import dotenvFlow from 'dotenv-flow';
import path from 'path';

// Load environment variables
dotenvFlow.config({
  node_env: process.env.NODE_ENV || 'development',
  path: path.resolve(__dirname, '../../../config/env'),
});

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Build PostgreSQL connection string from environment variables
 */
function buildConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || '';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = Number(process.env.POSTGRES_PORT || 5432);
  const database = process.env.POSTGRES_DB || 'abe_stack_dev';

  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

/**
 * Create and configure Fastify server
 */
export async function createServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
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
  const sqlClient = postgres(buildConnectionString(), {
    max: Number(process.env.DB_MAX_CONNECTIONS || 10),
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 30000),
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  });

  const db = drizzle(sqlClient);

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
    async () => ({
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
    async () => ({
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
        await db.execute(sql`SELECT 1`);
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

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await sqlClient.end({ timeout: 5 });
  });

  return { app, db, sqlClient };
}

/**
 * Start the server
 */
async function start() {
  const port = Number(process.env.API_PORT || DEFAULT_PORT);
  const host = process.env.HOST || DEFAULT_HOST;

  try {
    const { app } = await createServer();

    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start();
}
