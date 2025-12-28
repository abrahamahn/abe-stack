import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

type DbEnv = Record<string, string | number | undefined>;

export function buildConnectionString(env: DbEnv = process.env): string {
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

  return drizzle(client, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
