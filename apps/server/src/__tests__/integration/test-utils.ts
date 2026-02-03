// apps/server/src/__tests__/integration/test-utils.ts
/**
 * Integration Test Utilities
 *
 * Provides mock factories, test fixtures, and helpers for
 * integration testing with fastify.inject().
 */

import {
  applyCors,
  applySecurityHeaders,
  registerCookies,
  registerCorrelationIdHook,
  registerCsrf,
  registerPrototypePollutionProtection,
  registerRequestInfoHook,
} from '@abe-stack/db';
import { RateLimiter } from '@abe-stack/db';
import fastify from 'fastify';
import { vi, type Mock } from 'vitest';

import type { AppConfig } from '@abe-stack/shared/config';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';

// Mock function type that is callable
type MockFn<T = unknown> = Mock<(...args: unknown[]) => T> & ((...args: unknown[]) => T);

// ============================================================================
// Mock Database Client Factory
// ============================================================================

export interface MockDbClient {
  execute: MockFn;
  insert: MockFn;
  select: MockFn;
  update: MockFn;
  delete: MockFn;
  query: {
    users: {
      findFirst: MockFn;
      findMany: MockFn;
    };
    refreshTokens: {
      findFirst: MockFn;
      findMany: MockFn;
    };
    refreshTokenFamilies: {
      findFirst: MockFn;
    };
    securityEvents: {
      findMany: MockFn;
    };
    loginAttempts: {
      findMany: MockFn;
    };
    passwordResetTokens: {
      findFirst: MockFn;
    };
    emailVerificationTokens: {
      findFirst: MockFn;
    };
  };
}

export function createMockDb(): MockDbClient {
  const mockChain = () => ({
    values: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  });

  const mockSelectChain = () => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });

  return {
    execute: vi.fn().mockResolvedValue([{ ['?column?']: 1 }]) as MockFn,
    insert: vi.fn().mockReturnValue(mockChain()) as MockFn,
    select: vi.fn().mockReturnValue(mockSelectChain()),
    update: vi.fn().mockReturnValue(mockChain()),
    delete: vi.fn().mockReturnValue(mockChain()),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      refreshTokens: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      refreshTokenFamilies: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      securityEvents: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      loginAttempts: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      passwordResetTokens: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      emailVerificationTokens: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
}

// ============================================================================
// Mock Email Service Factory
// ============================================================================

export interface MockEmailService {
  send: MockFn;
}

export function createMockEmailService(): MockEmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' }),
  };
}

// ============================================================================
// Mock Storage Provider Factory
// ============================================================================

export interface MockStorageProvider {
  upload: MockFn;
  download: MockFn;
  delete: MockFn;
  exists: MockFn;
  getSignedUrl: MockFn;
  list: MockFn;
}

export function createMockStorageProvider(): MockStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue({ key: 'test-key', url: 'https://example.com/test-key' }),
    download: vi.fn().mockResolvedValue(Buffer.from('test content')),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
    getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed-url'),
    list: vi.fn().mockResolvedValue([]),
  };
}

// ============================================================================
// Test User Fixtures
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'user-test-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    // Hash for password "TestPassword123!"
    passwordHash: '$argon2id$v=19$m=1024,t=1,p=1$dGVzdHNhbHQ$hash-placeholder-for-testing',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    id: 'admin-test-456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    ...overrides,
  });
}

export function createUnverifiedUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    id: 'unverified-test-789',
    email: 'unverified@example.com',
    name: 'Unverified User',
    emailVerified: false,
    ...overrides,
  });
}

// ============================================================================
// Test uration
// ============================================================================

export function createTest(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    env: 'test',
    server: {
      host: '127.0.0.1',
      port: 0, // Random port
      portFallbacks: [],
      cors: { origin: '*', credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] },
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
        secret: 'test-secret-that-is-at-least-32-chars-long!!',
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
        secret: 'test-cookie-secret-32-chars-long!',
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
    ...overrides,
  } as AppConfig;
}

// ============================================================================
// CSRF Token Helper
// ============================================================================

export interface CsrfTokenPair {
  token: string;
  cookie: string;
}

/**
 * Get a valid CSRF token pair from a test server
 */
export async function getCsrfToken(server: FastifyInstance): Promise<CsrfTokenPair> {
  const response = await server.inject({
    method: 'GET',
    url: '/csrf-token',
  });

  const body = JSON.parse(response.body) as { token: string };
  const cookies = response.headers['set-cookie'];
  const csrfCookie = Array.isArray(cookies)
    ? cookies.find((c) => c.startsWith('_csrf='))
    : cookies?.startsWith('_csrf=') === true
      ? cookies
      : undefined;

  if (csrfCookie === undefined) {
    throw new Error('CSRF cookie not set');
  }

  return {
    token: body.token,
    cookie: csrfCookie.split(';')[0]!,
  };
}

// ============================================================================
// Test Server Factory
// ============================================================================

export interface TestServerOptions {
  config?: Partial<AppConfig>;
  db?: MockDbClient;
  email?: MockEmailService;
  storage?: MockStorageProvider;
  enableCsrf?: boolean;
  enableRateLimit?: boolean;
  enableCors?: boolean;
  enableSecurityHeaders?: boolean;
  production?: boolean;
}

export interface TestServer {
  server: FastifyInstance;
  db: MockDbClient;
  email: MockEmailService;
  storage: MockStorageProvider;
  config: AppConfig;
  inject: (options: InjectOptions) => Promise<LightMyRequestResponse>;
  close: () => Promise<void>;
  getCsrfToken: () => Promise<CsrfTokenPair>;
  ready: () => Promise<void>;
}

/**
 * Create a ured test server using fastify.inject()
 * This creates a server without actually listening on a port.
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const {
    config: configOverrides = {},
    db = createMockDb(),
    email = createMockEmailService(),
    storage = createMockStorageProvider(),
    enableCsrf = true,
    enableRateLimit = false,
    enableCors = true,
    enableSecurityHeaders = true,
    production = false,
  } = options;

  const config = createTest({
    ...configOverrides,
    env: production ? 'production' : 'test',
  });

  await Promise.resolve();

  const server = fastify({
    logger: false,
    trustProxy: config.server.trustProxy,
  });

  // Register prototype pollution protection first
  registerPrototypePollutionProtection(server);

  // Register correlation ID hook
  registerCorrelationIdHook(server);

  // Register request info hook
  registerRequestInfoHook(server);

  // Rate limiter (optional)
  let limiter: RateLimiter | null = null;
  if (enableRateLimit) {
    limiter = new RateLimiter({ windowMs: 60_000, max: 100 });
  }

  // Security headers, CORS, and rate limiting hook
  server.addHook('onRequest', async (req, res) => {
    if (enableSecurityHeaders) {
      applySecurityHeaders(res, production ? { enableCSP: true } : {});
    }

    if (enableCors) {
      applyCors(req, res, {
        origin: config.server.cors.origin.join(','),
        credentials: config.server.cors.credentials,
        allowedMethods: config.server.cors.methods,
      });
    }

    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }

    if (limiter !== null) {
      const rateLimitInfo = await limiter.check(req.ip);
      res.header('X-RateLimit-Limit', String(rateLimitInfo.limit));
      res.header('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
      res.header('X-RateLimit-Reset', String(Math.ceil(rateLimitInfo.resetMs / 1000)));

      if (!rateLimitInfo.allowed) {
        res.status(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        });
        return;
      }
    }
  });

  // Register cookies
  registerCookies(server, { secret: config.auth.cookie.secret });

  // Register CSRF protection
  if (enableCsrf) {
    registerCsrf(server, {
      secret: config.auth.cookie.secret,
      encrypted: production,
      cookieOpts: {
        signed: true,
        sameSite: production ? 'strict' : 'lax',
        httpOnly: true,
        secure: production,
      },
    });
  }

  // Add CSRF token endpoint for tests
  server.get('/csrf-token', async (_req, reply) => {
    const token = reply.generateCsrf();
    return { token };
  });

  // Add basic health endpoint
  server.get('/health', async () => {
    let dbHealthy = true;
    try {
      await db.execute();
    } catch {
      dbHealthy = false;
    }
    return { status: dbHealthy ? 'ok' : 'degraded', database: dbHealthy };
  });

  // Make mocks available via decorators
  server.decorate('testDb', db);
  server.decorate('testEmail', email);
  server.decorate('testStorage', storage);
  server.decorate('test', config);

  // NOTE: server.ready() is NOT called here to allow tests to add routes
  // Tests should call server.ready() after adding their routes

  return {
    server,
    db,
    email,
    storage,
    config,
    inject: async (opts: InjectOptions) => {
      // Ensure server is ready before injecting
      await server.ready();
      return server.inject(opts);
    },
    close: async () => {
      if (limiter !== null) {
        await limiter.destroy();
      }
      await server.close();
    },
    getCsrfToken: async () => {
      await server.ready();
      return getCsrfToken(server);
    },
    ready: async () => {
      await server.ready();
    },
  };
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Parse JSON response body. Returns unknown - callers should cast or validate the result.
 * Example: const data = parseJsonResponse(response) as MyType;
 */
export function parseJsonResponse(response: LightMyRequestResponse): unknown {
  return JSON.parse(response.body) as unknown;
}

export function getResponseCookie(
  response: LightMyRequestResponse,
  name: string,
): string | undefined {
  const cookies = response.headers['set-cookie'];
  if (cookies === undefined) return undefined;

  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  const targetCookie = cookieArray.find((c) => c.startsWith(`${name}=`));

  return targetCookie?.split(';')[0]?.split('=')[1];
}

export function getAllCookies(response: LightMyRequestResponse): string[] {
  const cookies = response.headers['set-cookie'];
  if (cookies === undefined) return [];
  return Array.isArray(cookies) ? cookies : [cookies];
}

// ============================================================================
// Request Builders
// ============================================================================

export interface AuthenticatedRequestOptions extends InjectOptions {
  accessToken?: string;
  csrfToken?: string;
  csrfCookie?: string;
  cookies?: Record<string, string>;
}

export function buildAuthenticatedRequest(options: AuthenticatedRequestOptions): InjectOptions {
  const { accessToken, csrfToken, csrfCookie, cookies = {}, headers = {}, ...rest } = options;

  const allHeaders: Record<string, string> = { ...headers } as Record<string, string>;
  const cookieParts: string[] = [];

  // Add authorization header
  if (accessToken !== undefined) {
    allHeaders['authorization'] = `Bearer ${accessToken}`;
  }

  // Add CSRF token header
  if (csrfToken !== undefined) {
    allHeaders['x-csrf-token'] = csrfToken;
  }

  // Add CSRF cookie
  if (csrfCookie !== undefined) {
    cookieParts.push(csrfCookie);
  }

  // Add other cookies
  for (const [name, value] of Object.entries(cookies)) {
    cookieParts.push(`${name}=${value}`);
  }

  if (cookieParts.length > 0) {
    allHeaders['cookie'] = cookieParts.join('; ');
  }

  return {
    ...rest,
    headers: allHeaders,
  };
}

// ============================================================================
// Type Declarations for Server Decorators
// ============================================================================

declare module 'fastify' {
  interface FastifyInstance {
    testDb: MockDbClient;
    testEmail: MockEmailService;
    testStorage: MockStorageProvider;
    test: AppConfig;
  }
}
