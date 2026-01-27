// apps/server/src/app.test.ts
import { BaseError } from '@abe-stack/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App, createApp, type AppOptions } from './app';

import type { AppConfig } from '@abe-stack/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@/config', () => ({
  buildConnectionString: vi.fn(() => 'postgresql://test:test@localhost:5432/test'),
}));

vi.mock('@/server', () => ({
  createServer: vi.fn(),
  listen: vi.fn(),
}));

vi.mock('@infrastructure/index', () => ({
  createBillingProvider: vi.fn(() => ({
    createCheckoutSession: vi.fn(),
  })),
  createDbClient: vi.fn(() => ({
    query: vi.fn(),
    execute: vi.fn(),
  })),
  createEmailService: vi.fn(() => ({
    send: vi.fn(),
  })),
  createNotificationService: vi.fn(() => ({
    send: vi.fn(),
  })),
  createPostgresPubSub: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    publish: vi.fn(),
  })),
  createPostgresQueueStore: vi.fn(() => ({
    enqueue: vi.fn(),
  })),
  createQueueServer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createStorage: vi.fn(() => ({
    put: vi.fn(),
  })),
  createWriteService: vi.fn(() => ({
    write: vi.fn(),
  })),
  getRepositoryContext: vi.fn(() => ({
    repos: {
      users: {},
      refreshTokens: {},
    },
  })),
  getSearchProviderFactory: vi.fn(() => ({
    createSqlProvider: vi.fn(() => ({
      search: vi.fn(),
    })),
  })),
  logStartupSummary: vi.fn(),
  registerRoutes: vi.fn(),
  registerWebSocket: vi.fn(),
  requireValidSchema: vi.fn(),
  SubscriptionManager: vi.fn(() => ({
    setAdapter: vi.fn(),
    publishLocal: vi.fn(),
  })),
  ['DEFAULT_SEARCH_SCHEMAS']: {
    users: { fields: [] },
  },
}));

vi.mock('@modules/index', () => ({
  registerRoutes: vi.fn(),
}));

vi.mock('./services/cache-service', () => ({
  createCacheService: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    cleanup: vi.fn(),
  })),
}));

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    createConsoleLogger: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
    })),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(): AppConfig {
  return {
    env: 'test',
    server: {
      host: 'localhost',
      port: 3000,
      logLevel: 'info',
      trustProxy: false,
      behindProxy: false,
    },
    database: {
      provider: 'postgresql',
      connectionString: 'postgresql://test:test@localhost:5432/test',
      host: 'localhost',
      port: 5432,
      name: 'test',
      user: 'test',
      password: 'test',
      ssl: false,
      maxConnections: 10,
    },
    storage: {
      provider: 'local',
      basePath: '/tmp',
      publicUrl: 'http://localhost:3000',
    },
    email: {
      provider: 'console',
      from: 'noreply@test.com',
    },
    notifications: {
      provider: 'console',
      config: {},
    },
    billing: {
      enabled: false,
      provider: 'stripe',
      currency: 'usd',
      plans: [],
      stripe: {
        secretKey: 'sk_test_123',
        webhookSecret: 'whsec_test_123',
      },
      paypal: {
        clientId: 'test',
        clientSecret: 'test',
        webhookId: 'test',
      },
      urls: {
        success: 'http://localhost:3000/success',
        cancel: 'http://localhost:3000/cancel',
      },
    },
    cache: {
      ttl: 3600,
      maxSize: 100,
    },
    queue: {
      pollInterval: 1000,
      maxRetries: 3,
    },
  } as unknown as AppConfig;
}

function createMockServer(): FastifyInstance {
  const server = {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
    },
    setErrorHandler: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  (server.log as { child: ReturnType<typeof vi.fn> }).child.mockReturnValue(server.log);
  return server as unknown as FastifyInstance;
}

// ============================================================================
// Tests: App Constructor
// ============================================================================

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create app with default services', () => {
      const config = createMockConfig();
      const app = new App({ config });

      expect(app.config).toBe(config);
      expect(app.db).toBeDefined();
      expect(app.repos).toBeDefined();
      expect(app.email).toBeDefined();
      expect(app.storage).toBeDefined();
      expect(app.notifications).toBeDefined();
      expect(app.billing).toBeDefined();
      expect(app.search).toBeDefined();
      expect(app.queue).toBeDefined();
      expect(app.write).toBeDefined();
      expect(app.pubsub).toBeDefined();
      expect(app.cache).toBeDefined();
    });

    it('should use provided services when passed', () => {
      const config = createMockConfig();
      const mockDb = { query: vi.fn(), execute: vi.fn() };
      const mockRepos = { users: {} };
      const mockEmail = { send: vi.fn() };
      const mockStorage = { put: vi.fn() };
      const mockNotifications = { send: vi.fn() };
      const mockBilling = { createCheckoutSession: vi.fn() };
      const mockSearch = { search: vi.fn() };
      const mockQueue = { start: vi.fn(), stop: vi.fn() };
      const mockWrite = { write: vi.fn() };
      const mockCache = { get: vi.fn(), set: vi.fn(), cleanup: vi.fn() };

      const options: AppOptions = {
        config,
        db: mockDb as AppOptions['db'],
        repos: mockRepos as AppOptions['repos'],
        email: mockEmail as AppOptions['email'],
        storage: mockStorage as AppOptions['storage'],
        notifications: mockNotifications as AppOptions['notifications'],
        billing: mockBilling as AppOptions['billing'],
        search: mockSearch as AppOptions['search'],
        queue: mockQueue as AppOptions['queue'],
        write: mockWrite as AppOptions['write'],
        cache: mockCache as AppOptions['cache'],
      };

      const app = new App(options);

      expect(app.db).toBe(mockDb);
      expect(app.repos).toBe(mockRepos);
      expect(app.email).toBe(mockEmail);
      expect(app.storage).toBe(mockStorage);
      expect(app.notifications).toBe(mockNotifications);
      expect(app.billing).toBe(mockBilling);
      expect(app.search).toBe(mockSearch);
      expect(app.queue).toBe(mockQueue);
      expect(app.write).toBe(mockWrite);
      expect(app.cache).toBe(mockCache);
    });

    it('should setup PostgresPubSub for postgresql provider in non-test env', async () => {
      const config = createMockConfig();
      config.env = 'production';

      const mockCreatePostgresPubSub = vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        publish: vi.fn(),
      }));

      const { createPostgresPubSub } = await import('@infrastructure/index');
      vi.mocked(createPostgresPubSub).mockImplementation(mockCreatePostgresPubSub);

      const app = new App({ config });

      expect(app.pubsub).toBeDefined();
    });

    it('should not setup PostgresPubSub for test env', () => {
      const config = createMockConfig();
      config.env = 'test';

      const app = new App({ config });

      expect(app.pubsub).toBeDefined();
    });

    it('should throw if user search schema not found', async () => {
      const config = createMockConfig();

      const infrastructure = await import('@infrastructure/index');
      (infrastructure as Record<string, unknown>)['DEFAULT_SEARCH_SCHEMAS'] = {
        users: undefined,
      };

      expect(() => new App({ config })).toThrow('User search schema not found');
    });
  });

  // ============================================================================
  // Tests: start
  // ============================================================================

  describe('start', () => {
    it('should start successfully with valid schema', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const { requireValidSchema, logStartupSummary } = await import('@infrastructure/index');
      vi.mocked(requireValidSchema).mockResolvedValue(undefined);
      vi.mocked(logStartupSummary).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      expect(requireValidSchema).toHaveBeenCalledWith(app.db);
      expect(createServer).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
          db: app.db,
          app,
        }),
      );
      expect(mockServer).toHaveProperty('setErrorHandler');
      expect((mockServer.setErrorHandler as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
      expect(listen).toHaveBeenCalledWith(mockServer, config);
      expect(logStartupSummary).toHaveBeenCalled();
    });

    it('should start PostgresPubSub if configured', async () => {
      const config = createMockConfig();
      config.env = 'production';

      const mockPgPubSub = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        publish: vi.fn(),
      };

      const { createPostgresPubSub } = await import('@infrastructure/index');
      vi.mocked(createPostgresPubSub).mockReturnValue(mockPgPubSub);

      const mockServer = createMockServer();
      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      expect(mockPgPubSub.start).toHaveBeenCalled();
    });

    it('should cleanup and rethrow on startup failure', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);

      const { requireValidSchema } = await import('@infrastructure/index');
      vi.mocked(requireValidSchema).mockRejectedValue(new Error('Invalid schema'));

      const app = new App({ config });
      const mockStop = vi.spyOn(app, 'stop').mockResolvedValue(undefined);

      await expect(app.start()).rejects.toThrow('Invalid schema');
      expect(mockStop).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Tests: stop
  // ============================================================================

  describe('stop', () => {
    it('should stop all services gracefully', async () => {
      const config = createMockConfig();
      config.env = 'production';

      const mockPgPubSub = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        publish: vi.fn(),
      };

      const { createPostgresPubSub } = await import('@infrastructure/index');
      vi.mocked(createPostgresPubSub).mockReturnValue(mockPgPubSub);

      const mockQueue = {
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        cleanup: vi.fn(),
      };

      const mockServer = createMockServer();
      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({
        config,
        queue: mockQueue as AppOptions['queue'],
        cache: mockCache as AppOptions['cache'],
      });

      await app.start();
      await app.stop();

      expect((mockPgPubSub.stop as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
      expect((mockQueue.stop as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
      expect((mockCache.cleanup as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
      expect((mockServer.close as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle stop when server not started', async () => {
      const config = createMockConfig();
      const app = new App({ config });

      await expect(app.stop()).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // Tests: Error Handler
  // ============================================================================

  describe('error handler', () => {
    it('should handle BaseError with status < 500 as warning', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      const mockCalls = (mockServer.setErrorHandler as ReturnType<typeof vi.fn>).mock.calls;
      const errorHandler = mockCalls[0]?.[0];
      expect(errorHandler).toBeDefined();

      if (errorHandler !== undefined) {
        const error = new BaseError('Test error', 400);
        const logWarnMock = vi.fn();
        const logErrorMock = vi.fn();
        const mockRequest = {
          log: {
            warn: logWarnMock,
            error: logErrorMock,
          },
        } as unknown as FastifyRequest;
        const replyStatusMock = vi.fn().mockReturnThis();
        const replySendMock = vi.fn();
        const mockReply = {
          status: replyStatusMock,
          send: replySendMock,
        } as unknown as FastifyReply;

        await errorHandler(error, mockRequest, mockReply);

        expect(logWarnMock).toHaveBeenCalledWith({ err: error }, 'Operational Error');
        expect(replyStatusMock).toHaveBeenCalledWith(400);
        expect(replySendMock).toHaveBeenCalledWith({
          error: 'BaseError',
          message: 'Test error',
          code: undefined,
        });
      }
    });

    it('should handle BaseError with status >= 500 as error', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      const mockCalls = (mockServer.setErrorHandler as ReturnType<typeof vi.fn>).mock.calls;
      const errorHandler = mockCalls[0]?.[0];
      expect(errorHandler).toBeDefined();

      if (errorHandler !== undefined) {
        const error = new BaseError('Server error', 500);
        const logWarnMock = vi.fn();
        const logErrorMock = vi.fn();
        const mockRequest = {
          log: {
            warn: logWarnMock,
            error: logErrorMock,
          },
        } as unknown as FastifyRequest;
        const replyStatusMock = vi.fn().mockReturnThis();
        const replySendMock = vi.fn();
        const mockReply = {
          status: replyStatusMock,
          send: replySendMock,
        } as unknown as FastifyReply;

        await errorHandler(error, mockRequest, mockReply);

        expect(logErrorMock).toHaveBeenCalledWith({ err: error }, 'Domain Error');
        expect(replyStatusMock).toHaveBeenCalledWith(500);
      }
    });

    it('should handle validation errors', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      const mockCalls = (mockServer.setErrorHandler as ReturnType<typeof vi.fn>).mock.calls;
      const errorHandler = mockCalls[0]?.[0];
      expect(errorHandler).toBeDefined();

      if (errorHandler !== undefined) {
        const error = { validation: [{ message: 'Invalid field' }] };
        const logWarnMock = vi.fn();
        const logErrorMock = vi.fn();
        const mockRequest = {
          log: {
            warn: logWarnMock,
            error: logErrorMock,
          },
        } as unknown as FastifyRequest;
        const replyStatusMock = vi.fn().mockReturnThis();
        const replySendMock = vi.fn();
        const mockReply = {
          status: replyStatusMock,
          send: replySendMock,
        } as unknown as FastifyReply;

        await errorHandler(error as Error, mockRequest, mockReply);

        expect(replyStatusMock).toHaveBeenCalledWith(400);
        expect(replySendMock).toHaveBeenCalledWith({
          error: 'ValidationError',
          message: 'Invalid request data',
          details: [{ message: 'Invalid field' }],
        });
      }
    });

    it('should handle unexpected errors', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      const mockCalls = (mockServer.setErrorHandler as ReturnType<typeof vi.fn>).mock.calls;
      const errorHandler = mockCalls[0]?.[0];
      expect(errorHandler).toBeDefined();

      if (errorHandler !== undefined) {
        const error = new Error('Unexpected error');
        const logWarnMock = vi.fn();
        const logErrorMock = vi.fn();
        const mockRequest = {
          log: {
            warn: logWarnMock,
            error: logErrorMock,
          },
        } as unknown as FastifyRequest;
        const replyStatusMock = vi.fn().mockReturnThis();
        const replySendMock = vi.fn();
        const mockReply = {
          status: replyStatusMock,
          send: replySendMock,
        } as unknown as FastifyReply;

        await errorHandler(error, mockRequest, mockReply);

        expect(logErrorMock).toHaveBeenCalledWith({ err: error }, 'Unexpected Crash');
        expect(replyStatusMock).toHaveBeenCalledWith(500);
        expect(replySendMock).toHaveBeenCalledWith({
          error: 'InternalServerError',
          message: 'Something went wrong',
        });
      }
    });
  });

  // ============================================================================
  // Tests: Getters
  // ============================================================================

  describe('context', () => {
    it('should return app context with all services', () => {
      const config = createMockConfig();
      const app = new App({ config });
      const context = app.context;

      expect(context.config).toBe(app.config);
      expect(context.db).toBe(app.db);
      expect(context.repos).toBe(app.repos);
      expect(context.email).toBe(app.email);
      expect(context.storage).toBe(app.storage);
      expect(context.notifications).toBe(app.notifications);
      expect(context.billing).toBe(app.billing);
      expect(context.search).toBe(app.search);
      expect(context.queue).toBe(app.queue);
      expect(context.write).toBe(app.write);
      expect(context.pubsub).toBe(app.pubsub);
      expect(context.cache).toBe(app.cache);
      expect(context.log).toBeDefined();
    });
  });

  describe('server', () => {
    it('should return server instance when started', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      expect(app.server).toBe(mockServer);
    });

    it('should throw when accessing server before start', () => {
      const config = createMockConfig();
      const app = new App({ config });

      expect(() => app.server).toThrow('App not started');
    });
  });

  describe('log', () => {
    it('should return server logger when server is started', async () => {
      const config = createMockConfig();
      const mockServer = createMockServer();

      const { createServer, listen } = await import('@/server');
      vi.mocked(createServer).mockResolvedValue(mockServer);
      vi.mocked(listen).mockResolvedValue(undefined);

      const app = new App({ config });
      await app.start();

      expect(app.log).toBe(mockServer.log);
    });

    it('should return fallback logger when server not started', () => {
      const config = createMockConfig();
      const app = new App({ config });

      const logger = app.log;
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
    });
  });

  // ============================================================================
  // Tests: Factory Function
  // ============================================================================

  describe('createApp', () => {
    it('should create app instance', () => {
      const config = createMockConfig();
      const app = createApp(config);

      expect(app).toBeInstanceOf(App);
      expect(app.config).toBe(config);
    });
  });

  // ============================================================================
  // Tests: Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle FCM notification provider', () => {
      const config = createMockConfig();
      config.notifications = {
        provider: 'fcm',
        config: {
          projectId: 'test-project',
          privateKey: 'test-key',
          clientEmail: 'test@test.iam.gserviceaccount.com',
        },
      };

      const app = new App({ config });
      expect(app.notifications).toBeDefined();
    });

    it('should handle empty pubsub connection string', () => {
      const config = createMockConfig();
      config.database.connectionString = '';
      config.env = 'production';

      const app = new App({ config });
      expect(app.pubsub).toBeDefined();
    });

    it('should handle non-postgresql database provider', () => {
      const config = createMockConfig();
      config.database.provider = 'sqlite' as typeof config.database.provider;
      config.env = 'production';

      const app = new App({ config });
      expect(app.pubsub).toBeDefined();
    });
  });
});
