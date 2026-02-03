// infra/db/src/config/database.test.ts
import { describe, expect, test } from 'vitest';

import {
  buildConfigConnectionString,
  getSafeConnectionString,
  isJsonDatabase,
  isPostgres,
  loadDatabaseConfig,
} from './database';

import type { FullEnv } from '@abe-stack/shared/config';

describe('Database Configuration', () => {
  describe('loadDatabaseConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadDatabaseConfig({} as unknown as FullEnv);

      if (config.provider !== 'postgresql') throw new Error('Expected postgresql');

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.ssl).toBe(false);
    });

    test('should enable SSL by default in production', () => {
      const config = loadDatabaseConfig({ NODE_ENV: 'production' } as unknown as FullEnv);
      if (config.provider !== 'postgresql') throw new Error('Expected postgresql');

      expect(config.ssl).toBe(true);
    });

    test('should load JSON provider config', () => {
      const config = loadDatabaseConfig({
        DATABASE_PROVIDER: 'json',
        JSON_DB_PATH: 'test.json',
      } as unknown as FullEnv);

      expect(config.provider).toBe('json');
      if (config.provider === 'json') {
        expect(config.filePath).toBe('test.json');
      }
    });

    test('should load SQLite provider config', () => {
      const config = loadDatabaseConfig({
        DATABASE_PROVIDER: 'sqlite',
        SQLITE_FILE_PATH: 'test.db',
        SQLITE_WAL_MODE: 'true',
      } as unknown as FullEnv);

      expect(config.provider).toBe('sqlite');
      if (config.provider === 'sqlite') {
        expect(config.filePath).toBe('test.db');
        expect(config.walMode).toBe(true);
      }
    });

    test('should load MongoDB provider config', () => {
      const config = loadDatabaseConfig({
        DATABASE_PROVIDER: 'mongodb',
        MONGODB_CONNECTION_STRING: 'mongodb://atlas-host:27017',
        MONGODB_DATABASE: 'prod_db',
      } as unknown as FullEnv);

      expect(config.provider).toBe('mongodb');
      if (config.provider === 'mongodb') {
        expect(config.connectionString).toBe('mongodb://atlas-host:27017');
        expect(config.database).toBe('prod_db');
      }
    });

    test('should prioritize DATABASE_URL for postgresql', () => {
      const config = loadDatabaseConfig({
        DATABASE_URL: 'postgresql://remote-host:5432/remote-db',
        POSTGRES_HOST: 'localhost',
      } as unknown as FullEnv);

      if (config.provider !== 'postgresql') throw new Error('Expected postgresql');
      expect(config.connectionString).toBe('postgresql://remote-host:5432/remote-db');
    });
  });

  describe('Connection String Utilities', () => {
    test('should redact password for logging', () => {
      const config = loadDatabaseConfig({
        POSTGRES_USER: 'abe',
        POSTGRES_PASSWORD: 'super-secret-password',
        POSTGRES_HOST: 'localhost',
      } as unknown as FullEnv);

      const safe = getSafeConnectionString(config);
      expect(safe).toContain('abe:****@localhost');
      expect(safe).not.toContain('super-secret-password');
    });

    test('should build postgres connection string from parts', () => {
      const config = loadDatabaseConfig({
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'pass',
        POSTGRES_HOST: 'host',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'db',
      } as unknown as FullEnv);

      const result = buildConfigConnectionString(config);
      expect(result).toBe('postgresql://user:pass@host:5432/db');
    });

    test('should build mongodb connection string correctly', () => {
      const config = loadDatabaseConfig({
        DATABASE_PROVIDER: 'mongodb',
        MONGODB_CONNECTION_STRING: 'mongodb://user:pass@host:27017/db',
      } as unknown as FullEnv);

      const result = buildConfigConnectionString(config);
      expect(result).toBe('mongodb://user:pass@host:27017/db');
    });
  });

  describe('Type Guards', () => {
    test('isPostgres should correctly identify postgres config', () => {
      const config = loadDatabaseConfig({ DATABASE_PROVIDER: 'postgresql' } as unknown as FullEnv);
      expect(isPostgres(config)).toBe(true);
      expect(isJsonDatabase(config)).toBe(false);
    });

    test('isJsonDatabase should correctly identify json config', () => {
      const config = loadDatabaseConfig({ DATABASE_PROVIDER: 'json' } as unknown as FullEnv);
      expect(isJsonDatabase(config)).toBe(true);
      expect(isPostgres(config)).toBe(false);
    });
  });
});
