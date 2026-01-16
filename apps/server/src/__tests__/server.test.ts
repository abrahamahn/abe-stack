// apps/server/src/__tests__/server.test.ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createServer, isAddrInUse, type ServerDependencies } from '../server';

import type { AppConfig } from '../config';
import type { DbClient } from '../infra';

// Mock db client
const mockDb = {
  execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
} as unknown as DbClient;

// Test configuration
const testConfig: AppConfig = {
  env: 'test',
  server: {
    host: '127.0.0.1',
    port: 0, // Random port for tests
    portFallbacks: [],
    cors: { origin: '*', credentials: false, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
    trustProxy: false,
    logLevel: 'silent',
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: 'test',
    maxConnections: 1,
    portFallbacks: [],
  },
  auth: {
    strategies: ['local'],
    jwt: {
      secret: 'test-secret-that-is-at-least-32-characters-long',
      accessTokenExpiry: '15m',
      issuer: 'test',
      audience: 'test',
    },
    refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
    argon2: { type: 2, memoryCost: 1024, timeCost: 1, parallelism: 1 },
    password: { minLength: 8, maxLength: 64, minZxcvbnScore: 2 },
    lockout: {
      maxAttempts: 10,
      lockoutDurationMs: 1800000,
      progressiveDelay: false,
      baseDelayMs: 0,
    },
    bffMode: false,
    proxy: { trustProxy: false, trustedProxies: [], maxProxyDepth: 1 },
    rateLimit: {
      login: { max: 100, windowMs: 60000 },
      register: { max: 100, windowMs: 60000 },
      forgotPassword: { max: 100, windowMs: 60000 },
      verifyEmail: { max: 100, windowMs: 60000 },
    },
    cookie: {
      name: 'refreshToken',
      secret: 'test-cookie-secret',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    },
    oauth: {},
    magicLink: { tokenExpiryMinutes: 15, maxAttempts: 3 },
    totp: { issuer: 'Test', window: 1 },
  },
  email: {
    provider: 'console',
    smtp: { host: '', port: 587, secure: false, auth: { user: '', pass: '' } },
    from: { name: 'Test', address: 'test@test.com' },
  },
  storage: {
    provider: 'local',
    rootPath: './test-uploads',
  },
};

describe('isAddrInUse', () => {
  it('should return true for EADDRINUSE error', () => {
    const error = { code: 'EADDRINUSE' };
    expect(isAddrInUse(error)).toBe(true);
  });

  it('should return false for other error codes', () => {
    const error = { code: 'ECONNREFUSED' };
    expect(isAddrInUse(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isAddrInUse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isAddrInUse(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isAddrInUse('string')).toBe(false);
    expect(isAddrInUse(123)).toBe(false);
    expect(isAddrInUse(true)).toBe(false);
  });

  it('should return false for object without code property', () => {
    expect(isAddrInUse({})).toBe(false);
    expect(isAddrInUse({ message: 'error' })).toBe(false);
  });
});

describe('createServer', () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const deps: ServerDependencies = {
      config: testConfig,
      db: mockDb,
    };
    server = await createServer(deps);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create a Fastify server instance', () => {
    expect(server).toBeDefined();
    expect(server.log).toBeDefined();
  });

  it('should register root route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { message: string; timestamp: string };
    expect(body.message).toBe('ABE Stack API');
    expect(body.timestamp).toBeDefined();
  });

  it('should register /api route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { message: string; version: string };
    expect(body.message).toBe('ABE Stack API is running');
    expect(body.version).toBe('1.0.0');
  });

  it('should register /health route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string; database: boolean };
    expect(body.status).toBe('ok');
    expect(body.database).toBe(true);
  });

  it('should return degraded health when database fails', async () => {
    // Mock a failed database query
    mockDb.execute = vi.fn().mockRejectedValueOnce(new Error('Connection failed'));

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { status: string; database: boolean };
    expect(body.status).toBe('degraded');
    expect(body.database).toBe(false);

    // Restore mock
    mockDb.execute = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
  });
});
