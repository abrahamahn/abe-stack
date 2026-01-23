// apps/server/src/__tests__/app.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock infra module - class must be defined inside factory due to hoisting
vi.mock('@infrastructure/index', () => {
  const MockSubscriptionManager = class {
    setAdapter = vi.fn();
    getSubscriptionCount = vi.fn(() => 0);
  };

  class MockSchemaValidationError extends Error {
    constructor(public readonly missingTables: string[]) {
      super(`Missing tables: ${missingTables.join(', ')}`);
      this.name = 'SchemaValidationError';
    }
  }

  return {
    createDbClient: vi.fn(() => ({
      execute: vi.fn(() => Promise.resolve()),
      query: {},
    })),
    createEmailService: vi.fn(() => ({
      send: vi.fn(() => Promise.resolve({ success: true })),
    })),
    createStorage: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
    })),
    createPostgresPubSub: vi.fn(() => ({
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(() => Promise.resolve()),
      publish: vi.fn(() => Promise.resolve()),
    })),
    registerWebSocket: vi.fn(() => Promise.resolve()),
    getDetailedHealth: vi.fn(() =>
      Promise.resolve({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        services: {
          database: { status: 'up', message: 'connected' },
          schema: { status: 'up', message: '7 tables present' },
          email: { status: 'up', message: 'console' },
          storage: { status: 'up', message: 'local' },
          pubsub: { status: 'up', message: '0 active subscriptions' },
          websocket: { status: 'up', message: 'plugin registered' },
          rateLimit: { status: 'up', message: 'token bucket active' },
        },
      }),
    ),
    logStartupSummary: vi.fn(() => Promise.resolve()),
    SubscriptionManager: MockSubscriptionManager,
    // Schema validation mocks
    requireValidSchema: vi.fn(() => Promise.resolve()),
    SchemaValidationError: MockSchemaValidationError,
    // Repository context mock
    getRepositoryContext: vi.fn(() => ({
      raw: {
        close: vi.fn(() => Promise.resolve()),
      },
      repos: {
        users: {
          findById: vi.fn(),
          findByEmail: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
        },
        refreshTokens: { findByToken: vi.fn(), create: vi.fn(), delete: vi.fn() },
        refreshTokenFamilies: { findById: vi.fn(), create: vi.fn(), delete: vi.fn() },
        loginAttempts: { findByIp: vi.fn(), create: vi.fn() },
        passwordResetTokens: { findByToken: vi.fn(), create: vi.fn(), delete: vi.fn() },
        emailVerificationTokens: { findByToken: vi.fn(), create: vi.fn(), delete: vi.fn() },
        securityEvents: { create: vi.fn(), findByUserId: vi.fn() },
        magicLinkTokens: { findByToken: vi.fn(), create: vi.fn(), delete: vi.fn() },
        oauthConnections: { findByProvider: vi.fn(), create: vi.fn() },
        pushSubscriptions: { findByEndpoint: vi.fn(), create: vi.fn() },
        notificationPreferences: { findByUserId: vi.fn(), create: vi.fn() },
      },
    })),
  };
});

// Mock modules
vi.mock('@modules/index', () => ({
  registerRoutes: vi.fn(),
}));

// Mock server
vi.mock('@/server', () => ({
  createServer: vi.fn(() =>
    Promise.resolve({
      listen: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      get: vi.fn(),
      printRoutes: vi.fn(() => ''),
    }),
  ),
  listen: vi.fn(() => Promise.resolve()),
}));

import type { AppConfig } from '@config/index';

import { App, createApp } from '@/app';

describe('App', () => {
  const mockConfig: AppConfig = {
    env: 'test',
    server: {
      host: '127.0.0.1',
      port: 0,
      portFallbacks: [],
      cors: { origin: '*', credentials: false, methods: ['GET', 'POST'] },
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
        secret: 'test-secret-that-is-at-least-32-chars',
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
        secret: 'test',
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

  let app: App | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('constructor', () => {
    it('should create an app instance with config', () => {
      app = new App({ config: mockConfig });
      expect(app.config).toBe(mockConfig);
    });
  });

  describe('createApp', () => {
    it('should create an app with default configuration', () => {
      app = createApp(mockConfig);
      expect(app).toBeInstanceOf(App);
      expect(app.config).toBe(mockConfig);
    });
  });

  describe('lifecycle', () => {
    it('should start and stop without errors', async () => {
      app = createApp(mockConfig);
      await expect(app.start()).resolves.not.toThrow();
      await expect(app.stop()).resolves.not.toThrow();
    });
  });

  describe('context', () => {
    it('should throw error when accessing context before start', () => {
      app = createApp(mockConfig);
      expect(() => app!.context).toThrow('App not started');
    });

    it('should throw error when accessing server before start', () => {
      app = createApp(mockConfig);
      expect(() => app!.server).toThrow('App not started');
    });

    it('should provide context after start', async () => {
      app = createApp(mockConfig);
      await app.start();

      const context = app.context;
      expect(context.config).toBe(mockConfig);
      expect(context.db).toBeDefined();
      expect(context.email).toBeDefined();
      expect(context.storage).toBeDefined();
      expect(context.pubsub).toBeDefined();
      expect(context.log).toBeDefined();
    });

    it('should provide server after start', async () => {
      app = createApp(mockConfig);
      await app.start();

      const server = app.server;
      expect(server).toBeDefined();
      expect(typeof server.log.info).toBe('function');
    });

    it('should provide logger via log property', async () => {
      app = createApp(mockConfig);
      await app.start();

      const log = app.log;
      expect(log).toBeDefined();
      expect(typeof log.info).toBe('function');
    });
  });

  describe('health endpoints', () => {
    it('should register health endpoints via get calls', async () => {
      app = createApp(mockConfig);
      await app.start();

      // The mock server's get method should have been called for health endpoints
      const server = app.server;
      expect(server.get).toHaveBeenCalled();
    });
  });
});
