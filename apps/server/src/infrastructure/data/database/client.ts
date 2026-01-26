// apps/server/src/infrastructure/data/database/client.ts
/**
 * Database Client
 *
 * Raw SQL database client using @abe-stack/db.
 * Provides connection management and transaction support.
 */

import {
    buildConnectionString as buildConnString,
    canReachDatabase,
    createRawDb,
    type RawDb,
} from '@abe-stack/db';

type DbEnv = Record<string, string | number | boolean | undefined>;
type GlobalWithDb = typeof globalThis & {
  rawDb?: RawDb;
};

/**
 * Build a database connection string from environment variables
 */
export function buildConnectionString(env: DbEnv = process.env as DbEnv): string {
  return buildConnString(env as Record<string, string | undefined>);
}

/**
 * Create a raw SQL database client
 */
export function createDbClient(connectionString: string): RawDb {
  if (process.env.NODE_ENV !== 'production') {
    const globalWithDb = globalThis as GlobalWithDb;

    globalWithDb.rawDb ??= createRawDb({
      connectionString,
      maxConnections: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
      idleTimeout: Number(process.env.DB_IDLE_TIMEOUT ?? 30000),
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10000),
    });

    return globalWithDb.rawDb;
  }

  return createRawDb({
    connectionString,
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT ?? 30000),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10000),
  });
}

/** Database client type (RawDb from @abe-stack/db) */
export type DbClient = RawDb;

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
  if (typeof env.DATABASE_URL === 'string' && env.DATABASE_URL !== '') {
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
