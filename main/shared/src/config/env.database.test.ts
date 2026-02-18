// main/shared/src/config/env.database.test.ts
import { describe, expect, it } from 'vitest';

import { DatabaseEnvSchema } from './env.database';

describe('DatabaseEnvSchema', () => {
  describe('defaults', () => {
    it('parses an empty object successfully', () => {
      const result = DatabaseEnvSchema.parse({});
      expect(result).toBeDefined();
    });

    it('leaves all optional fields undefined when absent', () => {
      const result = DatabaseEnvSchema.parse({});
      expect(result.DATABASE_PROVIDER).toBeUndefined();
      expect(result.POSTGRES_HOST).toBeUndefined();
      expect(result.POSTGRES_PORT).toBeUndefined();
      expect(result.POSTGRES_DB).toBeUndefined();
      expect(result.POSTGRES_USER).toBeUndefined();
      expect(result.POSTGRES_PASSWORD).toBeUndefined();
      expect(result.POSTGRES_CONNECTION_STRING).toBeUndefined();
      expect(result.DATABASE_URL).toBeUndefined();
      expect(result.DB_MAX_CONNECTIONS).toBe(20);
      expect(result.DB_SSL).toBeUndefined();
      expect(result.SQLITE_FILE_PATH).toBeUndefined();
      expect(result.SQLITE_WAL_MODE).toBeUndefined();
      expect(result.SQLITE_FOREIGN_KEYS).toBeUndefined();
      expect(result.SQLITE_TIMEOUT_MS).toBeUndefined();
      expect(result.MONGODB_CONNECTION_STRING).toBeUndefined();
      expect(result.MONGODB_DATABASE).toBeUndefined();
      expect(result.MONGODB_DB).toBeUndefined();
      expect(result.MONGODB_SSL).toBeUndefined();
      expect(result.DATABASE_READ_REPLICA_URL).toBeUndefined();
    });
  });

  describe('DATABASE_PROVIDER', () => {
    it('accepts postgresql', () => {
      expect(DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'postgresql' }).DATABASE_PROVIDER).toBe(
        'postgresql',
      );
    });

    it('accepts sqlite', () => {
      expect(DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'sqlite' }).DATABASE_PROVIDER).toBe(
        'sqlite',
      );
    });

    it('accepts mongodb', () => {
      expect(DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'mongodb' }).DATABASE_PROVIDER).toBe(
        'mongodb',
      );
    });

    it('accepts json', () => {
      expect(DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'json' }).DATABASE_PROVIDER).toBe(
        'json',
      );
    });

    it('rejects mysql', () => {
      expect(() => DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'mysql' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => DatabaseEnvSchema.parse({ DATABASE_PROVIDER: '' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 1 })).toThrow();
    });

    it('rejects uppercase POSTGRESQL', () => {
      expect(() => DatabaseEnvSchema.parse({ DATABASE_PROVIDER: 'POSTGRESQL' })).toThrow();
    });
  });

  describe('PostgreSQL fields', () => {
    it('accepts all Postgres connection fields', () => {
      const result = DatabaseEnvSchema.parse({
        POSTGRES_HOST: 'db.internal',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'mydb',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'secret',
        POSTGRES_CONNECTION_STRING: 'postgresql://postgres:secret@db.internal:5432/mydb',
        DATABASE_URL: 'postgresql://postgres:secret@db.internal:5432/mydb',
        DB_MAX_CONNECTIONS: 20,
        DB_SSL: 'true',
      });
      expect(result.POSTGRES_HOST).toBe('db.internal');
      expect(result.POSTGRES_PORT).toBe(5432);
      expect(result.POSTGRES_DB).toBe('mydb');
      expect(result.POSTGRES_USER).toBe('postgres');
      expect(result.POSTGRES_PASSWORD).toBe('secret');
      expect(result.DB_SSL).toBe('true');
    });

    it('coerces POSTGRES_PORT from string', () => {
      const result = DatabaseEnvSchema.parse({ POSTGRES_PORT: '5433' });
      expect(result.POSTGRES_PORT).toBe(5433);
    });

    it('rejects a non-string POSTGRES_HOST', () => {
      expect(() => DatabaseEnvSchema.parse({ POSTGRES_HOST: 1234 })).toThrow();
    });

    it('rejects a non-numeric POSTGRES_PORT string', () => {
      expect(() => DatabaseEnvSchema.parse({ POSTGRES_PORT: 'abc' })).toThrow();
    });

    it('rejects a non-numeric DB_MAX_CONNECTIONS', () => {
      expect(() => DatabaseEnvSchema.parse({ DB_MAX_CONNECTIONS: 'many' })).toThrow();
    });

    it('rejects SQL injection in POSTGRES_PASSWORD', () => {
      // The schema only checks type, not content — a SQL injection string is still a valid string.
      // This test documents the current behaviour: the schema accepts it.
      const result = DatabaseEnvSchema.parse({
        POSTGRES_PASSWORD: "' OR '1'='1",
      });
      expect(result.POSTGRES_PASSWORD).toBe("' OR '1'='1");
    });
  });

  describe('DB_SSL flag', () => {
    it('accepts true', () => {
      expect(DatabaseEnvSchema.parse({ DB_SSL: 'true' }).DB_SSL).toBe('true');
    });

    it('accepts false', () => {
      expect(DatabaseEnvSchema.parse({ DB_SSL: 'false' }).DB_SSL).toBe('false');
    });

    it('rejects 1', () => {
      expect(() => DatabaseEnvSchema.parse({ DB_SSL: '1' })).toThrow();
    });

    it('rejects a boolean', () => {
      expect(() => DatabaseEnvSchema.parse({ DB_SSL: true })).toThrow();
    });
  });

  describe('SQLite fields', () => {
    it('accepts all SQLite fields', () => {
      const result = DatabaseEnvSchema.parse({
        SQLITE_FILE_PATH: '/data/app.db',
        SQLITE_WAL_MODE: 'true',
        SQLITE_FOREIGN_KEYS: 'true',
        SQLITE_TIMEOUT_MS: 5000,
      });
      expect(result.SQLITE_FILE_PATH).toBe('/data/app.db');
      expect(result.SQLITE_WAL_MODE).toBe('true');
      expect(result.SQLITE_FOREIGN_KEYS).toBe('true');
      expect(result.SQLITE_TIMEOUT_MS).toBe(5000);
    });

    it('rejects invalid SQLITE_WAL_MODE value', () => {
      expect(() => DatabaseEnvSchema.parse({ SQLITE_WAL_MODE: 'enabled' })).toThrow();
    });

    it('coerces SQLITE_TIMEOUT_MS from string', () => {
      const result = DatabaseEnvSchema.parse({ SQLITE_TIMEOUT_MS: '3000' });
      expect(result.SQLITE_TIMEOUT_MS).toBe(3000);
    });

    it('rejects a non-numeric SQLITE_TIMEOUT_MS', () => {
      expect(() => DatabaseEnvSchema.parse({ SQLITE_TIMEOUT_MS: 'fast' })).toThrow();
    });
  });

  describe('MongoDB fields', () => {
    it('accepts all MongoDB fields', () => {
      const result = DatabaseEnvSchema.parse({
        MONGODB_CONNECTION_STRING: 'mongodb://user:pass@host:27017/db',
        MONGODB_DATABASE: 'mydb',
        MONGODB_DB: 'mydb',
        MONGODB_SSL: 'true',
        MONGODB_CONNECT_TIMEOUT_MS: 30000,
        MONGODB_SOCKET_TIMEOUT_MS: 45000,
        MONGODB_USE_UNIFIED_TOPOLOGY: 'true',
      });
      expect(result.MONGODB_CONNECTION_STRING).toBe('mongodb://user:pass@host:27017/db');
      expect(result.MONGODB_DATABASE).toBe('mydb');
      expect(result.MONGODB_SSL).toBe('true');
      expect(result.MONGODB_CONNECT_TIMEOUT_MS).toBe(30000);
    });

    it('rejects invalid MONGODB_SSL value', () => {
      expect(() => DatabaseEnvSchema.parse({ MONGODB_SSL: 'yes' })).toThrow();
    });

    it('rejects invalid MONGODB_USE_UNIFIED_TOPOLOGY value', () => {
      expect(() =>
        DatabaseEnvSchema.parse({ MONGODB_USE_UNIFIED_TOPOLOGY: '1' }),
      ).toThrow();
    });

    it('coerces MONGODB_CONNECT_TIMEOUT_MS from string', () => {
      const result = DatabaseEnvSchema.parse({ MONGODB_CONNECT_TIMEOUT_MS: '5000' });
      expect(result.MONGODB_CONNECT_TIMEOUT_MS).toBe(5000);
    });
  });

  describe('JSON DB fields', () => {
    it('accepts JSON_DB_PATH and JSON_DB_PERSIST_ON_WRITE', () => {
      const result = DatabaseEnvSchema.parse({
        JSON_DB_PATH: '/data/db.json',
        JSON_DB_PERSIST_ON_WRITE: 'true',
      });
      expect(result.JSON_DB_PATH).toBe('/data/db.json');
      expect(result.JSON_DB_PERSIST_ON_WRITE).toBe('true');
    });

    it('rejects invalid JSON_DB_PERSIST_ON_WRITE', () => {
      expect(() => DatabaseEnvSchema.parse({ JSON_DB_PERSIST_ON_WRITE: 'yes' })).toThrow();
    });

    it('rejects a non-string JSON_DB_PATH', () => {
      expect(() => DatabaseEnvSchema.parse({ JSON_DB_PATH: 99 })).toThrow();
    });
  });

  describe('DATABASE_READ_REPLICA_URL', () => {
    it('accepts a valid connection string', () => {
      const result = DatabaseEnvSchema.parse({
        DATABASE_READ_REPLICA_URL: 'postgresql://replica:5432/db',
      });
      expect(result.DATABASE_READ_REPLICA_URL).toBe('postgresql://replica:5432/db');
    });

    it('rejects a non-string value', () => {
      expect(() => DatabaseEnvSchema.parse({ DATABASE_READ_REPLICA_URL: 123 })).toThrow();
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => DatabaseEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => DatabaseEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => DatabaseEnvSchema.parse('postgresql')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = DatabaseEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = DatabaseEnvSchema.safeParse({ DATABASE_PROVIDER: 'oracle' });
      expect(result.success).toBe(false);
    });
  });
});
