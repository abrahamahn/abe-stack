// apps/server/src//__tests__/database..test.ts
import { describe, expect, test } from 'vitest';

import { buildConnectionString, loadDatabase } from '@/database.';

describe('Database uration', () => {
  describe('loadDatabase', () => {
    test('should load default values when no env vars set', () => {
      const  = loadDatabase({});
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.host).toBe('localhost');
      expect(.port).toBe(5432);
      expect(.database).toBe('abe_stack_dev');
      expect(.user).toBe('postgres');
      expect(.password).toBe('');
      expect(.connectionString).toBeUndefined();
      expect(.maxConnections).toBe(10);
    });

    test('should parse host and port from env', () => {
      const env = {
        POSTGRES_HOST: 'db.example.com',
        POSTGRES_PORT: '5433',
      };

      const  = loadDatabase(env);
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.host).toBe('db.example.com');
      expect(.port).toBe(5433);
    });

    test('should parse database name and user', () => {
      const env = {
        POSTGRES_DB: 'myapp_production',
        POSTGRES_USER: 'admin',
      };

      const  = loadDatabase(env);
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.database).toBe('myapp_production');
      expect(.user).toBe('admin');
    });

    test('should parse password and connection string', () => {
      const env = {
        POSTGRES_PASSWORD: 'secret123',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      };

      const  = loadDatabase(env);
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.password).toBe('secret123');
      expect(.connectionString).toBe('postgresql://user:pass@host:5432/db');
    });

    test('should parse max connections', () => {
      const env = {
        DB_MAX_CONNECTIONS: '50',
      };

      const  = loadDatabase(env);
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.maxConnections).toBe(50);
    });

    test('should include port fallbacks', () => {
      const  = loadDatabase({});
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.portFallbacks).toEqual([5432, 5433, 5434]);
    });

    test('should handle invalid port gracefully', () => {
      const env = {
        POSTGRES_PORT: 'invalid',
      };

      const  = loadDatabase(env);
      if (.provider !== 'postgresql') {
        throw new Error('Expected postgresql provider');
      }

      expect(.port).toBe(5432); // Falls back to default port
    });
  });

  describe('buildConnectionString', () => {
    test('should return connectionString if provided', () => {
      const  = loadDatabase({
        DATABASE_URL: 'postgresql://custom:connection@host:5432/db',
      });

      const result = buildConnectionString();

      expect(result).toBe('postgresql://custom:connection@host:5432/db');
    });

    test('should build connection string from parts when not provided', () => {
      const  = loadDatabase({
        POSTGRES_HOST: 'myhost',
        POSTGRES_PORT: '5433',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypass',
        POSTGRES_DB: 'mydb',
      });

      const result = buildConnectionString();

      expect(result).toBe('postgresql://myuser:mypass@myhost:5433/mydb');
    });

    test('should handle empty password', () => {
      const  = loadDatabase({
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'postgres',
        POSTGRES_DB: 'testdb',
        // No password
      });

      const result = buildConnectionString();

      expect(result).toBe('postgresql://postgres:@localhost:5432/testdb');
    });

    test('should use default values for missing parts', () => {
      const  = loadDatabase({});

      const result = buildConnectionString();

      expect(result).toBe('postgresql://postgres:@localhost:5432/abe_stack_dev');
    });

    test('should prefer connectionString over parts', () => {
      const  = loadDatabase({
        DATABASE_URL: 'postgresql://url:connection@host:5432/db',
        POSTGRES_HOST: 'different-host',
        POSTGRES_PORT: '9999',
        POSTGRES_USER: 'different-user',
      });

      const result = buildConnectionString();

      // Should use DATABASE_URL, ignoring the individual parts
      expect(result).toBe('postgresql://url:connection@host:5432/db');
    });
  });
});
