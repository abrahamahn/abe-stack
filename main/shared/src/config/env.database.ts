// main/shared/src/config/env.database.ts
/**
 * Database Environment Configuration
 *
 * Database types, env interface, and validation schema.
 * Merged from config/types/infra.ts (database section) and config/env.ts.
 *
 * @module config/env.database
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

export type DatabaseProvider = 'postgresql' | 'sqlite' | 'mongodb' | 'json';

/** PostgreSQL database configuration. */
export interface PostgresConfig {
  provider: 'postgresql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  maxConnections: number;
  portFallbacks: number[];
  ssl: boolean;
  readReplicaConnectionString?: string;
}

/** JSON file-based database configuration. */
export interface JsonDatabaseConfig {
  provider: 'json';
  filePath: string;
  persistOnWrite: boolean;
}

/** MySQL database configuration. */
export interface MySqlConfig {
  provider: 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionString?: string;
  maxConnections: number;
  portFallbacks: number[];
  ssl: boolean;
}

/** SQLite database configuration. */
export interface SqliteConfig {
  provider: 'sqlite';
  filePath: string;
  walMode: boolean;
  foreignKeys: boolean;
  timeout: number;
}

/** MongoDB database configuration. */
export interface MongoConfig {
  provider: 'mongodb';
  connectionString: string;
  database: string;
  options?: {
    ssl?: boolean;
    connectTimeoutMs?: number;
    socketTimeoutMs?: number;
    useUnifiedTopology?: boolean;
  };
}

export type DatabaseConfig = PostgresConfig | JsonDatabaseConfig | SqliteConfig | MongoConfig;

// ============================================================================
// Env Interface
// ============================================================================

/** Database environment variables */
export interface DatabaseEnv {
  DATABASE_PROVIDER?: 'postgresql' | 'sqlite' | 'mongodb' | 'json' | undefined;
  POSTGRES_HOST?: string | undefined;
  POSTGRES_PORT?: number | undefined;
  POSTGRES_DB?: string | undefined;
  POSTGRES_USER?: string | undefined;
  POSTGRES_PASSWORD?: string | undefined;
  POSTGRES_CONNECTION_STRING?: string | undefined;
  DATABASE_URL?: string | undefined;
  DB_MAX_CONNECTIONS: number;
  DB_SSL?: 'true' | 'false' | undefined;
  SQLITE_FILE_PATH?: string | undefined;
  SQLITE_WAL_MODE?: 'true' | 'false' | undefined;
  SQLITE_FOREIGN_KEYS?: 'true' | 'false' | undefined;
  SQLITE_TIMEOUT_MS?: number | undefined;
  MONGODB_CONNECTION_STRING?: string | undefined;
  MONGODB_DATABASE?: string | undefined;
  MONGODB_DB?: string | undefined;
  MONGODB_SSL?: 'true' | 'false' | undefined;
  MONGODB_CONNECT_TIMEOUT_MS?: number | undefined;
  MONGODB_SOCKET_TIMEOUT_MS?: number | undefined;
  MONGODB_USE_UNIFIED_TOPOLOGY?: 'true' | 'false' | undefined;
  JSON_DB_PATH?: string | undefined;
  JSON_DB_PERSIST_ON_WRITE?: 'true' | 'false' | undefined;
  DATABASE_READ_REPLICA_URL?: string | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const DatabaseEnvSchema: Schema<DatabaseEnv> = createSchema<DatabaseEnv>((data: unknown) => {
  const obj = parseObject(data, 'DatabaseEnv');
  return {
    DATABASE_PROVIDER: parseOptional(obj['DATABASE_PROVIDER'], (v: unknown) =>
      createEnumSchema(
        ['postgresql', 'sqlite', 'mongodb', 'json'] as const,
        'DATABASE_PROVIDER',
      ).parse(v),
    ),
    POSTGRES_HOST: parseOptional(obj['POSTGRES_HOST'], (v: unknown) =>
      parseString(v, 'POSTGRES_HOST'),
    ),
    POSTGRES_PORT: parseOptional(obj['POSTGRES_PORT'], (v: unknown) =>
      coerceNumber(v, 'POSTGRES_PORT'),
    ),
    POSTGRES_DB: parseOptional(obj['POSTGRES_DB'], (v: unknown) => parseString(v, 'POSTGRES_DB')),
    POSTGRES_USER: parseOptional(obj['POSTGRES_USER'], (v: unknown) =>
      parseString(v, 'POSTGRES_USER'),
    ),
    POSTGRES_PASSWORD: parseOptional(obj['POSTGRES_PASSWORD'], (v: unknown) =>
      parseString(v, 'POSTGRES_PASSWORD'),
    ),
    POSTGRES_CONNECTION_STRING: parseOptional(obj['POSTGRES_CONNECTION_STRING'], (v: unknown) =>
      parseString(v, 'POSTGRES_CONNECTION_STRING'),
    ),
    DATABASE_URL: parseOptional(obj['DATABASE_URL'], (v: unknown) =>
      parseString(v, 'DATABASE_URL'),
    ),
    DB_MAX_CONNECTIONS: coerceNumber(
      withDefault(obj['DB_MAX_CONNECTIONS'], 20),
      'DB_MAX_CONNECTIONS',
    ),
    DB_SSL: parseOptional(obj['DB_SSL'], (v: unknown) => trueFalseSchema.parse(v)),
    SQLITE_FILE_PATH: parseOptional(obj['SQLITE_FILE_PATH'], (v: unknown) =>
      parseString(v, 'SQLITE_FILE_PATH'),
    ),
    SQLITE_WAL_MODE: parseOptional(obj['SQLITE_WAL_MODE'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    SQLITE_FOREIGN_KEYS: parseOptional(obj['SQLITE_FOREIGN_KEYS'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    SQLITE_TIMEOUT_MS: parseOptional(obj['SQLITE_TIMEOUT_MS'], (v: unknown) =>
      coerceNumber(v, 'SQLITE_TIMEOUT_MS'),
    ),
    MONGODB_CONNECTION_STRING: parseOptional(obj['MONGODB_CONNECTION_STRING'], (v: unknown) =>
      parseString(v, 'MONGODB_CONNECTION_STRING'),
    ),
    MONGODB_DATABASE: parseOptional(obj['MONGODB_DATABASE'], (v: unknown) =>
      parseString(v, 'MONGODB_DATABASE'),
    ),
    MONGODB_DB: parseOptional(obj['MONGODB_DB'], (v: unknown) => parseString(v, 'MONGODB_DB')),
    MONGODB_SSL: parseOptional(obj['MONGODB_SSL'], (v: unknown) => trueFalseSchema.parse(v)),
    MONGODB_CONNECT_TIMEOUT_MS: parseOptional(obj['MONGODB_CONNECT_TIMEOUT_MS'], (v: unknown) =>
      coerceNumber(v, 'MONGODB_CONNECT_TIMEOUT_MS'),
    ),
    MONGODB_SOCKET_TIMEOUT_MS: parseOptional(obj['MONGODB_SOCKET_TIMEOUT_MS'], (v: unknown) =>
      coerceNumber(v, 'MONGODB_SOCKET_TIMEOUT_MS'),
    ),
    MONGODB_USE_UNIFIED_TOPOLOGY: parseOptional(obj['MONGODB_USE_UNIFIED_TOPOLOGY'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    JSON_DB_PATH: parseOptional(obj['JSON_DB_PATH'], (v: unknown) =>
      parseString(v, 'JSON_DB_PATH'),
    ),
    JSON_DB_PERSIST_ON_WRITE: parseOptional(obj['JSON_DB_PERSIST_ON_WRITE'], (v: unknown) =>
      trueFalseSchema.parse(v),
    ),
    DATABASE_READ_REPLICA_URL: parseOptional(obj['DATABASE_READ_REPLICA_URL'], (v: unknown) =>
      parseString(v, 'DATABASE_READ_REPLICA_URL'),
    ),
  };
});
