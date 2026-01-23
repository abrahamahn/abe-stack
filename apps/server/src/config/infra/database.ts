// apps/server/src/config/infra/database.ts
import { getBool, getInt } from '@abe-stack/core/config/utils';
import type {
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  PostgresConfig,
} from '@abe-stack/core/contracts/config';

export function loadDatabase(env: Record<string, string | undefined>): DatabaseConfig {
  const provider = (env.DATABASE_PROVIDER || 'postgresql') as DatabaseProvider;

  if (provider === 'json') {
    return {
      provider: 'json',
      filePath: env.JSON_DB_PATH || '.data/db.json',
      persistOnWrite: getBool(env.JSON_DB_PERSIST_ON_WRITE) ?? true,
    };
  }

  const defaultPort = 5432;
  const isProd = env.NODE_ENV === 'production';

  const config: PostgresConfig = {
    provider: 'postgresql',
    host: env.POSTGRES_HOST || 'localhost',
    port: getInt(env.POSTGRES_PORT, defaultPort),
    database: env.POSTGRES_DB || 'abe_stack_dev',
    user: env.POSTGRES_USER || 'postgres',
    password: env.POSTGRES_PASSWORD || '',
    connectionString: env.DATABASE_URL,
    maxConnections: getInt(env.DB_MAX_CONNECTIONS, isProd ? 20 : 10),
    portFallbacks: [defaultPort, defaultPort + 1, defaultPort + 2],
    // ssl is usually required for cloud providers in production
    ssl: getBool(env.DB_SSL) ?? isProd,
  };

  return config;
}

/**
 * Builds a full connection string.
 * Prioritizes explicit connectionString, then builds from parts.
 */
export function buildConnectionString(config: DatabaseConfig): string {
  if (config.provider === 'json') return '';

  if (config.connectionString) return config.connectionString;

  const { user, password, host, port, database } = config;
  if (!host) return '';

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
}

/**
 * Returns a connection string with the password redacted for logging.
 */
export function getSafeConnectionString(config: DatabaseConfig): string {
  const full = buildConnectionString(config);
  return full.replace(/:([^:@]+)@/, ':****@');
}

export const isPostgres = (config: DatabaseConfig): config is PostgresConfig =>
  config.provider === 'postgresql';

export const isJsonDatabase = (config: DatabaseConfig): config is JsonDatabaseConfig =>
  config.provider === 'json';
