// apps/server/src/config/infra/database.ts
import type {
  DatabaseConfig,
  DatabaseProvider,
  FullEnv,
  JsonDatabaseConfig,
  PostgresConfig,
} from '@abe-stack/shared/config';

/**
 * Load Database Configuration.
 *
 * Supports multiple providers:
 * - **PostgreSQL**: Production-ready relational DB (Default).
 * - **MongoDB**: Document store.
 * - **SQLite**: Lightweight file-based DB (great for testing/prototyping).
 * - **JSON**: Simple file-based persistence for small apps.
 *
 * @param env - Environment variables.
 * @returns Provider-specific configuration.
 */
export function loadDatabaseConfig(env: FullEnv): DatabaseConfig {
  const provider = (env.DATABASE_PROVIDER ?? 'postgresql') as DatabaseProvider;

  switch (provider) {
    case 'json':
      return {
        provider: 'json',
        filePath: env.JSON_DB_PATH ?? '.data/db.json',
        persistOnWrite: env.JSON_DB_PERSIST_ON_WRITE !== 'false',
      };

    case 'sqlite':
      return {
        provider: 'sqlite',
        filePath: env.SQLITE_FILE_PATH ?? '.data/sqlite.db',
        walMode: env.SQLITE_WAL_MODE !== 'false',
        foreignKeys: env.SQLITE_FOREIGN_KEYS !== 'false',
        timeout: env.SQLITE_TIMEOUT_MS ?? 5000,
      };

    case 'mongodb': {
      const dbUrl = env.DATABASE_URL;
      let connectionString: string;

      if (env.MONGODB_CONNECTION_STRING !== undefined && env.MONGODB_CONNECTION_STRING !== '') {
        connectionString = env.MONGODB_CONNECTION_STRING;
      } else if (dbUrl?.includes('mongodb') === true) {
        connectionString = dbUrl;
      } else {
        connectionString = 'mongodb://localhost:27017/abe_stack_dev';
      }

      return {
        provider: 'mongodb',
        connectionString,
        database:
          env.MONGODB_DATABASE !== undefined && env.MONGODB_DATABASE !== ''
            ? env.MONGODB_DATABASE
            : (env.MONGODB_DB ?? 'abe_stack_dev'),
        options: {
          ssl: env.MONGODB_SSL === 'true',
          connectTimeoutMs: env.MONGODB_CONNECT_TIMEOUT_MS ?? 30000,
          socketTimeoutMs: env.MONGODB_SOCKET_TIMEOUT_MS ?? 30000,
          useUnifiedTopology: env.MONGODB_USE_UNIFIED_TOPOLOGY !== 'false',
        },
      };
    }

    case 'postgresql':
    default: {
      const pgDefaultPort = 5432;
      const isPgProd = env.NODE_ENV === 'production';
      const dbUrl = env.DATABASE_URL;
      const connectionString =
        (dbUrl?.includes('postgresql') === true ? dbUrl : undefined) ??
        env.POSTGRES_CONNECTION_STRING;

      const config: PostgresConfig = {
        provider: 'postgresql',
        host: env.POSTGRES_HOST ?? 'localhost',
        port: env.POSTGRES_PORT ?? pgDefaultPort,
        database: env.POSTGRES_DB ?? 'abe_stack_dev',
        user: env.POSTGRES_USER ?? 'postgres',
        password: env.POSTGRES_PASSWORD ?? '',
        maxConnections: env.DB_MAX_CONNECTIONS ?? (isPgProd ? 20 : 10),
        portFallbacks: [pgDefaultPort, pgDefaultPort + 1, pgDefaultPort + 2],
        // ssl is usually required for cloud providers in production
        ssl: env.DB_SSL !== undefined ? env.DB_SSL === 'true' : isPgProd,
      };

      if (connectionString !== undefined) {
        config.connectionString = connectionString;
      }

      return config;
    }
  }
}

/**
 * Builds a standardized connection string from discrete config parts.
 *
 * **PostgreSQL Logic**:
 * Constructs `postgresql://user:pass@host:port/db`.
 */
export function buildConnectionString(config: DatabaseConfig): string {
  switch (config.provider) {
    case 'postgresql': {
      const connStr = config.connectionString;
      if (connStr !== undefined && connStr !== '') return connStr;
      const { user, password, host, port, database } = config;
      return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${String(port)}/${database}`;
    }
    case 'mongodb':
      return config.connectionString;
    default:
      return '';
  }
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
