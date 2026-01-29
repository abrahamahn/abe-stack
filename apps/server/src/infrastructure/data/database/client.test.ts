// apps/server/src/infrastructure/data/database/client.test.ts
/**
 * Tests for database client utilities.
 *
 * These tests verify the behavior of connection string building and client creation.
 * Tests for `resolveConnectionStringWithFallback` are limited to behavior that doesn't
 * require mocking `canReachDatabase` (which is difficult due to module resolution in
 * the monorepo), primarily testing the DATABASE_URL shortcut path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
} from './client';

describe('buildConnectionString', () => {
  it('should build connection string from environment variables', () => {
    const env = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'mydb',
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpass',
    };

    const result = buildConnectionString(env);
    // The actual buildConnectionString from @abe-stack/db returns postgres:// not postgresql://
    expect(result).toContain('testuser');
    expect(result).toContain('testpass');
    expect(result).toContain('localhost');
    expect(result).toContain('5432');
    expect(result).toContain('mydb');
  });

  it('should use default environment when no env provided', () => {
    const originalEnv = process.env;
    process.env = {
      POSTGRES_HOST: 'prod-host',
      POSTGRES_PORT: '5433',
      POSTGRES_DB: 'prod',
      POSTGRES_USER: 'produser',
      POSTGRES_PASSWORD: 'prodpass',
    };

    const result = buildConnectionString();
    expect(result).toContain('prod-host');
    expect(result).toContain('5433');

    process.env = originalEnv;
  });

  it('should handle missing environment variables with defaults', () => {
    const env = {};
    const result = buildConnectionString(env);
    expect(result).toBeTruthy();
    // Should contain some default values
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(10);
  });
});

describe('createDbClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    // Clear any cached global rawDb
    delete (globalThis as { rawDb?: unknown }).rawDb;
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (globalThis as { rawDb?: unknown }).rawDb;
  });

  it('should create database client with connection string', () => {
    process.env['NODE_ENV'] = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client = createDbClient(connectionString);

    expect(client).toBeDefined();
    expect(typeof client.close).toBe('function');
  });

  it('should create client that has required methods', () => {
    process.env['NODE_ENV'] = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client = createDbClient(connectionString);

    // Verify the client has the expected structure
    expect(client).toHaveProperty('close');
  });

  it('should reuse global client in development mode', () => {
    process.env['NODE_ENV'] = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client1 = createDbClient(connectionString);
    const client2 = createDbClient(connectionString);

    expect(client1).toBe(client2);
  });

  it('should create new client instances in production mode', () => {
    process.env['NODE_ENV'] = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client1 = createDbClient(connectionString);
    const client2 = createDbClient(connectionString);

    // In production, each call creates a new client
    expect(client1).not.toBe(client2);
  });
});

describe('resolveConnectionStringWithFallback', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return DATABASE_URL if provided', async () => {
    const env = {
      DATABASE_URL: 'postgresql://user:pass@remote:5432/db',
    };

    const result = await resolveConnectionStringWithFallback(env);
    expect(result).toBe('postgresql://user:pass@remote:5432/db');
  });

  it('should return DATABASE_URL without testing connection', async () => {
    // When DATABASE_URL is set, it should be returned directly without connection tests
    const env = {
      DATABASE_URL: 'postgresql://user:pass@unreachable-host:5432/db',
    };

    // This should NOT throw, because DATABASE_URL bypasses connection testing
    const result = await resolveConnectionStringWithFallback(env);
    expect(result).toBe('postgresql://user:pass@unreachable-host:5432/db');
  });

  it('should throw error with empty fallback ports array', async () => {
    const env = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    await expect(resolveConnectionStringWithFallback(env, [])).rejects.toThrow(
      'Unable to connect to Postgres',
    );
  });

  it('should respect empty string DATABASE_URL by not using it', async () => {
    // Empty string DATABASE_URL should be treated as not set
    const env = {
      DATABASE_URL: '',
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    // With empty DATABASE_URL and empty ports array, should throw
    await expect(resolveConnectionStringWithFallback(env, [])).rejects.toThrow(
      'Unable to connect to Postgres',
    );
  });
});
