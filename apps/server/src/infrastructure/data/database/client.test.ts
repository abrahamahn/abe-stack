// apps/server/src/infrastructure/data/database/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
} from './client';

// Mock the @abe-stack/db module
vi.mock('@abe-stack/db', () => ({
  buildConnectionString: vi.fn((env: Record<string, string | undefined>) => {
    const host = env.POSTGRES_HOST ?? 'localhost';
    const port = env.POSTGRES_PORT ?? env.DB_PORT ?? '5432';
    const db = env.POSTGRES_DB ?? 'test';
    const user = env.POSTGRES_USER ?? 'user';
    const password = env.POSTGRES_PASSWORD ?? 'password';
    return `postgresql://${user}:${password}@${host}:${port}/${db}`;
  }),
  createRawDb: vi.fn((config) => ({
    connectionString: config.connectionString,
    maxConnections: config.maxConnections,
    idleTimeout: config.idleTimeout,
    connectTimeout: config.connectTimeout,
    close: vi.fn(),
  })),
  canReachDatabase: vi.fn(),
}));

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
    expect(result).toBe('postgresql://testuser:testpass@localhost:5432/mydb');
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
  });
});

describe('createDbClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create database client with connection string', () => {
    process.env.NODE_ENV = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client = createDbClient(connectionString);

    expect(client).toBeDefined();
    expect(client.connectionString).toBe(connectionString);
  });

  it('should use default connection pool settings when not specified', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_MAX_CONNECTIONS;
    delete process.env.DB_IDLE_TIMEOUT;
    delete process.env.DB_CONNECT_TIMEOUT;

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const client = createDbClient(connectionString);

    expect(client.maxConnections).toBe(10);
    expect(client.idleTimeout).toBe(30000);
    expect(client.connectTimeout).toBe(10000);
  });

  it('should use custom connection pool settings from environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_MAX_CONNECTIONS = '20';
    process.env.DB_IDLE_TIMEOUT = '60000';
    process.env.DB_CONNECT_TIMEOUT = '5000';

    const connectionString = 'postgresql://user:pass@localhost:5432/db';
    const client = createDbClient(connectionString);

    expect(client.maxConnections).toBe(20);
    expect(client.idleTimeout).toBe(60000);
    expect(client.connectTimeout).toBe(5000);
  });

  it('should reuse global client in development mode', () => {
    process.env.NODE_ENV = 'development';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const client1 = createDbClient(connectionString);
    const client2 = createDbClient(connectionString);

    expect(client1).toBe(client2);
  });

  it('should create new client in production mode', () => {
    process.env.NODE_ENV = 'production';
    const connectionString = 'postgresql://user:pass@localhost:5432/db';

    const { createRawDb } = await import('@abe-stack/db');

    createDbClient(connectionString);
    createDbClient(connectionString);

    expect(createRawDb).toHaveBeenCalledTimes(2);
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

  it('should not test connection when DATABASE_URL is provided', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');

    const env = {
      DATABASE_URL: 'postgresql://user:pass@remote:5432/db',
    };

    await resolveConnectionStringWithFallback(env);
    expect(canReachDatabase).not.toHaveBeenCalled();
  });

  it('should try ports in order until one is reachable', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockImplementation((connStr: string) => {
      return Promise.resolve(connStr.includes('5433'));
    });

    const env = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    const result = await resolveConnectionStringWithFallback(env, [5432, 5433, 5434]);

    expect(result).toContain('5433');
    expect(canReachDatabase).toHaveBeenCalled();
  });

  it('should try preferred port from environment first', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    const callOrder: number[] = [];

    vi.mocked(canReachDatabase).mockImplementation((connStr: string) => {
      if (connStr.includes('9999')) {
        callOrder.push(9999);
        return Promise.resolve(true);
      }
      if (connStr.includes('5432')) callOrder.push(5432);
      if (connStr.includes('5433')) callOrder.push(5433);
      return Promise.resolve(false);
    });

    const env = {
      POSTGRES_PORT: '9999',
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    await resolveConnectionStringWithFallback(env, [5432, 5433]);

    expect(callOrder[0]).toBe(9999);
  });

  it('should update process.env when connection succeeds', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(true);

    delete process.env.POSTGRES_PORT;
    delete process.env.DB_PORT;

    await resolveConnectionStringWithFallback(process.env, [5432]);

    expect(process.env.POSTGRES_PORT).toBe('5432');
    expect(process.env.DB_PORT).toBe('5432');
  });

  it('should not update process.env when using custom env object', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(true);

    const customEnv = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    const originalProcessEnv = process.env.POSTGRES_PORT;

    await resolveConnectionStringWithFallback(customEnv, [5432]);

    expect(process.env.POSTGRES_PORT).toBe(originalProcessEnv);
  });

  it('should throw error when no ports are reachable', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(false);

    const env = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    await expect(
      resolveConnectionStringWithFallback(env, [5432, 5433, 5434]),
    ).rejects.toThrow('Unable to connect to Postgres on ports: 5432, 5433, 5434');
  });

  it('should deduplicate ports before trying connections', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(false);

    const env = {
      POSTGRES_PORT: '5432',
      DB_PORT: '5432',
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    try {
      await resolveConnectionStringWithFallback(env, [5432, 5433]);
    } catch (_error) {
      // Expected to fail since all return false
    }

    // Should only try each unique port once
    const calls = vi.mocked(canReachDatabase).mock.calls;
    const ports = calls.map((call) => {
      const connStr = call[0];
      const match = connStr.match(/:(\d+)\//);
      return match?.[1];
    });

    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(ports.length);
  });

  it('should filter out invalid port numbers', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(false);

    const env = {
      POSTGRES_PORT: 'invalid' as unknown as string,
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'pass',
    };

    try {
      await resolveConnectionStringWithFallback(env, [5432]);
    } catch (_error) {
      // Expected to fail
    }

    // Should only try valid port 5432, not 'invalid'
    expect(canReachDatabase).toHaveBeenCalledTimes(1);
  });

  it('should handle empty fallback ports array', async () => {
    const { canReachDatabase } = await import('@abe-stack/db');
    vi.mocked(canReachDatabase).mockResolvedValue(false);

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
});
