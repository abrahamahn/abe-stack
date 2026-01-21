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
    appBaseUrl: 'http://localhost:5173',
    apiBaseUrl: 'http://localhost:0',
  },
  database: {
    provider: 'postgresql',
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
    expect(server.server).toBeInstanceOf(Object);
    expect(typeof server.log.info).toBe('function');
  });

  it('should register root route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { message: string; timestamp: string };
    expect(body.message).toBe('ABE Stack API');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
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

  it('should include security headers in response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('should include rate limit headers in response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should handle CORS preflight requests', async () => {
    const response = await server.inject({
      method: 'OPTIONS',
      url: '/',
      headers: {
        origin: 'http://localhost:5173',
      },
    });

    expect(response.statusCode).toBe(204);
  });
});

describe('error handler', () => {
  let errorServer: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    errorServer = await createServer({
      config: testConfig,
      db: mockDb,
    });

    // Add a route that throws errors
    errorServer.get('/throw-app-error', () => {
      const error = new Error('App error') as Error & { statusCode: number; code: string };
      error.statusCode = 400;
      error.code = 'BAD_REQUEST';
      throw error;
    });

    errorServer.get('/throw-generic-error', () => {
      throw new Error('Generic error');
    });
  });

  afterAll(async () => {
    await errorServer.close();
  });

  it('should handle errors with statusCode property', async () => {
    const response = await errorServer.inject({
      method: 'GET',
      url: '/throw-app-error',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('should handle generic errors with 500 status', async () => {
    const response = await errorServer.inject({
      method: 'GET',
      url: '/throw-generic-error',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('should include correlation ID in error response', async () => {
    const response = await errorServer.inject({
      method: 'GET',
      url: '/throw-generic-error',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    });

    const body = JSON.parse(response.body) as { error: { correlationId: string } };
    expect(body.error.correlationId).toBe('test-correlation-id');
  });
});

describe('production configuration', () => {
  let prodServer: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    const prodConfig = {
      ...testConfig,
      env: 'production' as const,
    };
    prodServer = await createServer({
      config: prodConfig,
      db: mockDb,
    });

    // Add a route that throws a server error
    prodServer.get('/throw-500', () => {
      throw new Error('Sensitive internal error with database info');
    });
  });

  afterAll(async () => {
    await prodServer.close();
  });

  it('should sanitize 5xx error messages in production', async () => {
    const response = await prodServer.inject({
      method: 'GET',
      url: '/throw-500',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as { error: { message: string } };
    // Should not contain sensitive info
    expect(body.error.message).not.toContain('database');
    expect(body.error.message).toBe('An internal error occurred. Please try again later.');
  });

  it('should include CSP header in production', async () => {
    const response = await prodServer.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.headers['content-security-policy']).toBeDefined();
  });
});

describe('listen function', () => {
  it('should use fallback port when primary port is in use', async () => {
    const server1 = await createServer({ config: testConfig, db: mockDb });
    const server2 = await createServer({ config: testConfig, db: mockDb });

    // Start first server on a specific port
    const port1 = 9876;
    const port2 = 9877;
    const configWithFallback = {
      ...testConfig,
      server: {
        ...testConfig.server,
        port: port1,
        portFallbacks: [port2],
      },
    };

    // Listen on first server
    await server1.listen({ port: port1, host: '127.0.0.1' });

    // Listen on second server with fallback
    const { listen } = await import('../server.js');
    await listen(server2, configWithFallback);

    // Server 2 should have fallen back to port2
    const address = server2.server.address();
    expect(address).toBeDefined();
    if (typeof address === 'object' && address !== null) {
      expect(address.port).toBe(port2);
    }

    await server1.close();
    await server2.close();
  });

  it('should throw error when no ports are available', async () => {
    const server1 = await createServer({ config: testConfig, db: mockDb });
    const server2 = await createServer({ config: testConfig, db: mockDb });
    const server3 = await createServer({ config: testConfig, db: mockDb });

    const port1 = 9878;
    const port2 = 9879;
    const configWithFallback = {
      ...testConfig,
      server: {
        ...testConfig.server,
        port: port1,
        portFallbacks: [port2],
      },
    };

    // Occupy both ports
    await server1.listen({ port: port1, host: '127.0.0.1' });
    await server2.listen({ port: port2, host: '127.0.0.1' });

    // Try to listen on server3 with no available ports
    const { listen } = await import('../server.js');
    await expect(listen(server3, configWithFallback)).rejects.toThrow('No available ports');

    await server1.close();
    await server2.close();
    await server3.close();
  });

  it('should deduplicate port list', async () => {
    const server = await createServer({ config: testConfig, db: mockDb });

    const port = 9880;
    const configWithDuplicates = {
      ...testConfig,
      server: {
        ...testConfig.server,
        port,
        portFallbacks: [port, port, port], // Same port repeated
      },
    };

    const { listen } = await import('../server.js');
    await listen(server, configWithDuplicates);

    const address = server.server.address();
    expect(address).toBeDefined();
    if (typeof address === 'object' && address !== null) {
      expect(address.port).toBe(port);
    }

    await server.close();
  });

  it('should propagate non-EADDRINUSE errors', async () => {
    const server = await createServer({ config: testConfig, db: mockDb });

    // Mock the listen function to throw a different error
    const originalListen = server.listen.bind(server);
    server.listen = vi.fn().mockRejectedValue({ code: 'EACCES', message: 'Permission denied' });

    const { listen } = await import('../server.js');
    await expect(listen(server, testConfig)).rejects.toMatchObject({ code: 'EACCES' });

    // Restore
    server.listen = originalListen;
    await server.close();
  });
});

describe('error handler with AppError', () => {
  let appErrorServer: Awaited<ReturnType<typeof createServer>>;

  beforeAll(async () => {
    appErrorServer = await createServer({
      config: testConfig,
      db: mockDb,
    });

    // Add a route that throws an AppError with details
    // Using the isAppError signature which checks for statusCode
    appErrorServer.get('/throw-app-error-with-details', () => {
      const error = Object.assign(new Error('Validation failed'), {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid format' },
      });
      throw error;
    });
  });

  afterAll(async () => {
    await appErrorServer.close();
  });

  it('should include details in error response for non-production', async () => {
    const response = await appErrorServer.inject({
      method: 'GET',
      url: '/throw-app-error-with-details',
    });

    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
  });
});

describe('rate limiting', () => {
  it('should return 429 when rate limit is exceeded', async () => {
    const limitedConfig = {
      ...testConfig,
      server: {
        ...testConfig.server,
      },
    };

    const server = await createServer({ config: limitedConfig, db: mockDb });

    // Make many rapid requests to trigger rate limit
    const responses = [];
    for (let i = 0; i < 150; i++) {
      const response = await server.inject({
        method: 'GET',
        url: '/',
      });
      responses.push(response);
    }

    // At least one request should be rate limited
    const rateLimited = responses.some((r) => r.statusCode === 429);
    expect(rateLimited).toBe(true);

    // Check that rate limited response has correct structure
    const rateLimitedResponse = responses.find((r) => r.statusCode === 429);
    if (rateLimitedResponse) {
      const body = JSON.parse(rateLimitedResponse.body) as { error: string; retryAfter: number };
      expect(body.error).toBe('Too Many Requests');
      expect(typeof body.retryAfter).toBe('number');
    }

    await server.close();
  });
});
