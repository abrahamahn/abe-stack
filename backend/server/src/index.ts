// apps/server/src/index.ts
import path from 'path';

import { loadServerEnv } from '@abe-stack/shared';
import { resolveConnectionStringWithFallback } from '@db';
import dotenvFlow from 'dotenv-flow';

import { validateEnvironment } from './lib/env-validator';
import { createServer } from './server';

// Load environment variables
dotenvFlow.config({
  node_env: process.env.NODE_ENV || 'development',
  path: path.resolve(__dirname, '../../../config'),
});

// Validate environment variables at startup
validateEnvironment();

// Validate required env once at startup
const env = loadServerEnv(process.env);

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '0.0.0.0';
const API_PORT_FALLBACKS = [DEFAULT_PORT, DEFAULT_PORT + 1, DEFAULT_PORT + 2, DEFAULT_PORT + 3];

function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(new Set(ports.filter((port): port is number => Number.isFinite(port))));
}

async function listenWithFallback(
  app: Awaited<ReturnType<typeof createServer>>['app'],
  host: string,
  ports: number[],
): Promise<number> {
  const formatPort = (port: number): string => String(port);

  for (const port of ports) {
    try {
      await app.listen({ port, host });
      process.env.API_PORT = String(port);

      if (port !== ports[0]) {
        app.log.warn(`Default port in use. Fallback to ${formatPort(port)}.`);
      }

      return port;
    } catch (error: unknown) {
      if (isAddrInUse(error)) {
        app.log.warn(`Port ${formatPort(port)} is in use, trying the next one...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`No available API ports found from list: ${ports.join(', ')}`);
}

/**
 * Start the server - this is the only entry point
 * Server creation logic is in ./server.ts for testability
 */

type DbEnv = Record<string, string | number | boolean | undefined>;

async function getDbConnectionString(env: DbEnv): Promise<string> {
  const result = await resolveConnectionStringWithFallback(env);
  return result;
}
async function start(): Promise<void> {
  const host = process.env.HOST || DEFAULT_HOST;
  const apiPortPreference = Number(
    process.env.API_PORT || env.API_PORT || env.PORT || DEFAULT_PORT,
  );
  const portCandidates = uniquePorts([apiPortPreference, ...API_PORT_FALLBACKS]);

  try {
    const connectionString = await getDbConnectionString(env);

    const server = await createServer(env, connectionString);
    const app = server.app;

    const port = await listenWithFallback(app, host, portCandidates);
    app.log.info(`Server listening on http://${host}:${String(port)}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      process.stderr.write(`Failed to start server ${error.message}\n`);
    } else if (typeof error === 'string') {
      process.stderr.write(`Failed to start server ${error}\n`);
    } else {
      process.stderr.write('Failed to start server\n');
    }
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  void start();
}

function isAddrInUse(error: unknown): error is NodeJS.ErrnoException {
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code?: unknown }; // Safe: only adding optional 'code' of type unknown
    return err.code === 'EADDRINUSE';
  }
  return false;
}
