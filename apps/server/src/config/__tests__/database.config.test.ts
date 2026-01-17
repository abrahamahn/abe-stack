// apps/server/src/config/__tests__/database.config.test.ts
import { describe, expect, test } from 'vitest';

import { buildConnectionString, loadDatabaseConfig } from '@config/database.config';

describe('Database Configuration', () => {
  describe('loadDatabaseConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadDatabaseConfig({});

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('abe_stack_dev');
      expect(config.user).toBe('postgres');
      expect(config.password).toBe('');
      expect(config.connectionString).toBeUndefined();
      expect(config.maxConnections).toBe(10);
    });

    test('should parse host and port from env', () => {
      const env = {
        POSTGRES_HOST: 'db.example.com',
        POSTGRES_PORT: '5433',
      };

      const config = loadDatabaseConfig(env);

      expect(config.host).toBe('db.example.com');
      expect(config.port).toBe(5433);
    });

    test('should parse database name and user', () => {
      const env = {
        POSTGRES_DB: 'myapp_production',
        POSTGRES_USER: 'admin',
      };

      const config = loadDatabaseConfig(env);

      expect(config.database).toBe('myapp_production');
      expect(config.user).toBe('admin');
    });

    test('should parse password and connection string', () => {
      const env = {
        POSTGRES_PASSWORD: 'secret123',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      };

      const config = loadDatabaseConfig(env);

      expect(config.password).toBe('secret123');
      expect(config.connectionString).toBe('postgresql://user:pass@host:5432/db');
    });

    test('should parse max connections', () => {
      const env = {
        DB_MAX_CONNECTIONS: '50',
      };

      const config = loadDatabaseConfig(env);

      expect(config.maxConnections).toBe(50);
    });

    test('should include port fallbacks', () => {
      const config = loadDatabaseConfig({});

      expect(config.portFallbacks).toEqual([5432, 5433, 5434]);
    });

    test('should handle invalid port gracefully', () => {
      const env = {
        POSTGRES_PORT: 'invalid',
      };

      const config = loadDatabaseConfig(env);

      expect(config.port).toBeNaN();
    });
  });

  describe('buildConnectionString', () => {
    test('should return connectionString if provided', () => {
      const config = loadDatabaseConfig({
        DATABASE_URL: 'postgresql://custom:connection@host:5432/db',
      });

      const result = buildConnectionString(config);

      expect(result).toBe('postgresql://custom:connection@host:5432/db');
    });

    test('should build connection string from parts when not provided', () => {
      const config = loadDatabaseConfig({
        POSTGRES_HOST: 'myhost',
        POSTGRES_PORT: '5433',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypass',
        POSTGRES_DB: 'mydb',
      });

      const result = buildConnectionString(config);

      expect(result).toBe('postgresql://myuser:mypass@myhost:5433/mydb');
    });

    test('should handle empty password', () => {
      const config = loadDatabaseConfig({
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'postgres',
        POSTGRES_DB: 'testdb',
        // No password
      });

      const result = buildConnectionString(config);

      expect(result).toBe('postgresql://postgres:@localhost:5432/testdb');
    });

    test('should use default values for missing parts', () => {
      const config = loadDatabaseConfig({});

      const result = buildConnectionString(config);

      expect(result).toBe('postgresql://postgres:@localhost:5432/abe_stack_dev');
    });

    test('should prefer connectionString over parts', () => {
      const config = loadDatabaseConfig({
        DATABASE_URL: 'postgresql://url:connection@host:5432/db',
        POSTGRES_HOST: 'different-host',
        POSTGRES_PORT: '9999',
        POSTGRES_USER: 'different-user',
      });

      const result = buildConnectionString(config);

      // Should use DATABASE_URL, ignoring the individual parts
      expect(result).toBe('postgresql://url:connection@host:5432/db');
    });
  });
});
