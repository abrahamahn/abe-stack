// apps/server/src/infra/database/__tests__/client.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { buildConnectionString } from '../client';

describe('buildConnectionString', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with DATABASE_URL', () => {
    test('should return DATABASE_URL when provided', () => {
      const env = { DATABASE_URL: 'postgres://user:pass@host:5432/db' };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://user:pass@host:5432/db');
    });

    test('should prioritize DATABASE_URL over other variables', () => {
      const env = {
        DATABASE_URL: 'postgres://fromurl@host:5432/db',
        POSTGRES_USER: 'otheruser',
        POSTGRES_PASSWORD: 'otherpass',
        POSTGRES_HOST: 'otherhost',
        POSTGRES_PORT: '5433',
        POSTGRES_DB: 'otherdb',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://fromurl@host:5432/db');
    });

    test('should ignore non-string DATABASE_URL', () => {
      const env = {
        DATABASE_URL: 123, // Number, not string
        POSTGRES_USER: 'testuser',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://testuser@localhost:5432/abe_stack_dev');
    });

    test('should handle empty string DATABASE_URL', () => {
      const env = {
        DATABASE_URL: '',
        POSTGRES_USER: 'testuser',
      };

      const result = buildConnectionString(env);

      // Empty string is falsy, so it should build from components
      expect(result).toBe('postgres://testuser@localhost:5432/abe_stack_dev');
    });
  });

  describe('with individual environment variables', () => {
    test('should build connection string from POSTGRES_* variables', () => {
      const env = {
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypass',
        POSTGRES_HOST: 'myhost',
        POSTGRES_PORT: '5433',
        POSTGRES_DB: 'mydb',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://myuser:mypass@myhost:5433/mydb');
    });

    test('should build connection string from DB_* variables', () => {
      const env = {
        DB_USER: 'dbuser',
        DB_PASSWORD: 'dbpass',
        DB_HOST: 'dbhost',
        DB_PORT: '5434',
        DB_NAME: 'dbname',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://dbuser:dbpass@dbhost:5434/dbname');
    });

    test('should prioritize POSTGRES_* over DB_* variables', () => {
      const env = {
        POSTGRES_USER: 'pguser',
        DB_USER: 'dbuser',
        POSTGRES_HOST: 'pghost',
        DB_HOST: 'dbhost',
      };

      const result = buildConnectionString(env);

      expect(result).toContain('pguser');
      expect(result).toContain('pghost');
      expect(result).not.toContain('dbuser');
      expect(result).not.toContain('dbhost');
    });

    test('should use defaults when no variables provided', () => {
      const env = {};

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://postgres@localhost:5432/abe_stack_dev');
    });

    test('should use defaults for missing variables', () => {
      const env = {
        POSTGRES_USER: 'customuser',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://customuser@localhost:5432/abe_stack_dev');
    });

    test('should omit password from auth when not provided', () => {
      const env = {
        POSTGRES_USER: 'useronly',
        POSTGRES_HOST: 'myhost',
      };

      const result = buildConnectionString(env);

      expect(result).toBe('postgres://useronly@myhost:5432/abe_stack_dev');
      expect(result).not.toContain(':@'); // No colon before @ when no password
    });

    test('should include password in auth when provided', () => {
      const env = {
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'secret',
      };

      const result = buildConnectionString(env);

      expect(result).toContain('user:secret@');
    });

    test('should handle empty string password', () => {
      const env = {
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: '',
      };

      const result = buildConnectionString(env);

      // Empty string is falsy, so no password
      expect(result).toBe('postgres://user@localhost:5432/abe_stack_dev');
    });
  });

  describe('edge cases', () => {
    test('should handle numeric port values', () => {
      const env = {
        POSTGRES_PORT: 5433, // Number, not string
      };

      const result = buildConnectionString(env);

      expect(result).toContain(':5433/');
    });

    test('should handle undefined values gracefully', () => {
      const env = {
        POSTGRES_USER: undefined,
        POSTGRES_PASSWORD: undefined,
      };

      const result = buildConnectionString(env);

      // Should use defaults
      expect(result).toBe('postgres://postgres@localhost:5432/abe_stack_dev');
    });

    test('should handle special characters in password', () => {
      const env = {
        POSTGRES_USER: 'user',
        POSTGRES_PASSWORD: 'p@ss:word/with#special',
      };

      const result = buildConnectionString(env);

      // Note: The function does NOT URL-encode special characters
      // This is intentional - postgres.js handles this
      expect(result).toContain('p@ss:word/with#special@');
    });

    test('should handle boolean environment values', () => {
      const env = {
        DATABASE_URL: true, // Boolean, not string
      };

      const result = buildConnectionString(env);

      // Boolean is not a string, so should build from components
      expect(result).toBe('postgres://postgres@localhost:5432/abe_stack_dev');
    });
  });
});

// Note: createDbClient and resolveConnectionStringWithFallback are tested
// in integration tests since they require actual database connections.
