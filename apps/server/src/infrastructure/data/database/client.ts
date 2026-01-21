// apps/server/src/infrastructure/data/database/client.ts
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

type DbEnv = Record<string, string | number | boolean | undefined>;
type GlobalWithDb = typeof globalThis & {
  db?: PostgresJsDatabase<typeof schema>;
};

export function buildConnectionString(env: DbEnv = process.env as DbEnv): string {
  if (env.DATABASE_URL && typeof env.DATABASE_URL === 'string') {
    return env.DATABASE_URL;
  }

  const user = String(env.POSTGRES_USER || env.DB_USER || 'postgres');
  const password = String(env.POSTGRES_PASSWORD || env.DB_PASSWORD || '');
  const host = String(env.POSTGRES_HOST || env.DB_HOST || 'localhost');
  const port = String(env.POSTGRES_PORT || env.DB_PORT || 5432);
  const database = String(env.POSTGRES_DB || env.DB_NAME || 'abe_stack_dev');

  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

export function createDbClient(connectionString: string): PostgresJsDatabase<typeof schema> {
  const client = postgres(connectionString, {
    max: Number(process.env.DB_MAX_CONNECTIONS || 10),
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 30000),
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  });

  if (process.env.NODE_ENV !== 'production') {
    const globalWithDb = globalThis as GlobalWithDb;

    const cachedDb = globalWithDb.db ?? drizzle(client, { schema });
    globalWithDb.db = cachedDb;
    return cachedDb;
  }

  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;

async function canReachDatabase(connectionString: string): Promise<boolean> {
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 1000),
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 1000),
  });

  try {
    await client`select 1`;
    await client.end({ timeout: 1 });
    return true;
  } catch {
    await client.end({ timeout: 1 }).catch(() => undefined);
    return false;
  }
}

function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(new Set(ports.filter((port): port is number => Number.isFinite(port))));
}

/**
 * Find the first reachable Postgres instance from a list of fallback ports.
 * Updates process.env when it succeeds so downstream consumers share the same port.
 */
export async function resolveConnectionStringWithFallback(
  env: DbEnv = process.env as DbEnv,
  fallbackPorts: number[] = [5432, 5433, 5434],
): Promise<string> {
  if (env.DATABASE_URL && typeof env.DATABASE_URL === 'string') {
    return env.DATABASE_URL;
  }

  const preferredPorts = uniquePorts([
    Number(env.POSTGRES_PORT ?? Number.NaN),
    Number(env.DB_PORT ?? Number.NaN),
    ...fallbackPorts,
  ]);

  for (const port of preferredPorts) {
    const connectionString = buildConnectionString({
      ...env,
      POSTGRES_PORT: port,
      DB_PORT: port,
    });

    // Return on the first reachable port
    if (await canReachDatabase(connectionString)) {
      if (env === process.env) {
        process.env.POSTGRES_PORT = String(port);
        process.env.DB_PORT = String(port);
      }
      return connectionString;
    }
  }

  throw new Error(
    `Unable to connect to Postgres on ports: ${preferredPorts.map(String).join(', ')}`,
  );
}
