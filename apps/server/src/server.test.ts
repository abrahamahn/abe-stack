// apps/server/src/server.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createServer, isAddrInUse, listen } from './server';

import type { AppConfig } from '@/config/index';
import type { DbClient } from '@infrastructure/index';
import type { HasContext, IServiceContainer } from '@shared/index';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('fastify', () => ({
  default: vi.fn(),
}));

vi.mock('@abe-stack/core', () => ({
  createConsoleLogger: vi.fn((level: string) => ({
    level,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  })),
}));

vi.mock('@http/index', () => ({
  registerPlugins: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    env: 'test',
    server: {
      host: 'localhost',
      port: 3000,
      portFallbacks: [3001, 3002],
      logLevel: 'info',
      trustProxy: false,
      behindProxy: false,
      apiBaseUrl: 'http://localhost:3000',
      cors: {
        origin: ['http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
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
    ...overrides,
  } as AppConfig;
}

function createMockDb(): DbClient {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as DbClient;
}

function createMockApp(): IServiceContainer & HasContext {
  return {
    context: {
      db: {} as never,
      repos: {} as never,
      config: {} as never,
      log: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      } as never,
      pubsub: {} as never,
      email: {} as never,
      storage: {} as never,
      cache: {} as never,
      billing: {} as never,
      notifications: {} as never,
      queue: {} as never,
      write: {} as never,
      search: {} as never,
    },
  } as IServiceContainer & HasContext;
}

function createMockFastifyInstance(): FastifyInstance {
  const mockInfo = vi.fn();
  const mockWarn = vi.fn();
  const mockError = vi.fn();
  const mockFatal = vi.fn();
  const mockDebug = vi.fn();
  const mockTrace = vi.fn();
  const mockChild = vi.fn().mockReturnThis();
  const mockAddHook = vi.fn();
  const mockListen = vi.fn();

  const mockInstance = {
    log: {
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      fatal: mockFatal,
      debug: mockDebug,
      trace: mockTrace,
      child: mockChild,
    },
    addHook: mockAddHook,
    listen: mockListen,
  };

  return mockInstance as unknown as FastifyInstance;
}

// ============================================================================
// Tests: createServer
// ============================================================================

describe('createServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic server creation', () => {
    it('should create Fastify instance with correct configuration in test environment', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db });

      expect(mockedFastify).toHaveBeenCalledWith({
        logger: expect.objectContaining({
          level: 'info',
          transport: expect.any(Object),
        }),
        disableRequestLogging: true,
        trustProxy: false,
        bodyLimit: 1024 * 1024, // 1MB
      });
    });

    it('should create Fastify instance with production logger configuration', async () => {
      const config = createMockConfig({ env: 'production' });
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db });

      expect(mockedFastify).toHaveBeenCalledWith({
        logger: { level: 'info' },
        disableRequestLogging: false,
        trustProxy: false,
        bodyLimit: 1024 * 1024,
      });
    });

    it('should enable trustProxy when configured', async () => {
      const config = createMockConfig();
      config.server.trustProxy = true;

      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db });

      expect(mockedFastify).toHaveBeenCalledWith(
        expect.objectContaining({
          trustProxy: true,
        }),
      );
    });

    it('should use configured log level', async () => {
      const config = createMockConfig();
      config.server.logLevel = 'debug';

      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db });

      expect(mockedFastify).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.objectContaining({
            level: 'debug',
          }),
        }),
      );
    });
  });

  describe('hybrid context hook', () => {
    it('should attach context to request when app is provided', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const app = createMockApp();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db, app });

      expect(mockFastifyInstance.addHook).toHaveBeenCalledWith(
        'onRequest',
        expect.any(Function),
      );

      // Test the hook implementation
      const addHookFn = mockFastifyInstance.addHook as ReturnType<typeof vi.fn>;
      const hookCalls = addHookFn.mock.calls;
      const onRequestHook = hookCalls.find((call) => call[0] === 'onRequest');
      expect(onRequestHook).toBeDefined();

      if (onRequestHook !== undefined) {
        const hookHandler = onRequestHook[1];
        const mockReq = {} as never;
        const mockReply = {} as never;
        const done = vi.fn();

        // Hook handler is synchronous (calls done())
        hookHandler(mockReq, mockReply, done);

        expect((mockReq as { context?: unknown }).context).toBe(app.context);
        expect(done).toHaveBeenCalled();
      }
    });

    it('should not attach context hook when app is not provided', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db });

      expect(mockFastifyInstance.addHook).not.toHaveBeenCalled();
    });

    it('should handle undefined app explicitly', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      await createServer({ config, db, app: undefined });

      expect(mockFastifyInstance.addHook).not.toHaveBeenCalled();
    });
  });

  describe('plugin registration', () => {
    it('should register plugins with config', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      const { registerPlugins } = await import('@http/index');
      const mockedRegisterPlugins = vi.mocked(registerPlugins);

      await createServer({ config, db });

      expect(mockedRegisterPlugins).toHaveBeenCalledWith(mockFastifyInstance, config);
    });
  });

  describe('return value', () => {
    it('should return configured Fastify instance', async () => {
      const config = createMockConfig();
      const db = createMockDb();
      const mockFastifyInstance = createMockFastifyInstance();

      const { default: Fastify } = await import('fastify');
      const mockedFastify = vi.mocked(Fastify);
      mockedFastify.mockReturnValue(mockFastifyInstance);

      const server = await createServer({ config, db });

      expect(server).toBe(mockFastifyInstance);
    });
  });
});

// ============================================================================
// Tests: listen
// ============================================================================

describe('listen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful port binding', () => {
    it('should bind to default port when available', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledWith({
        port: 3000,
        host: 'localhost',
      });
      expect(mockServer.log.info).toHaveBeenCalledWith(
        'Server listening on http://localhost:3000',
      );
      expect(mockServer.log.warn).not.toHaveBeenCalled();
    });

    it('should log info message on successful binding', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      expect(mockServer.log.info).toHaveBeenCalledWith(
        'Server listening on http://localhost:3000',
      );
    });
  });

  describe('port fallback mechanism', () => {
    it('should try first fallback port when default is in use', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      // First call fails with EADDRINUSE, second succeeds
      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn
        .mockRejectedValueOnce({ code: 'EADDRINUSE' })
        .mockResolvedValueOnce(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledTimes(2);
      expect(mockServer.listen).toHaveBeenNthCalledWith(1, {
        port: 3000,
        host: 'localhost',
      });
      expect(mockServer.listen).toHaveBeenNthCalledWith(2, {
        port: 3001,
        host: 'localhost',
      });
      expect(mockServer.log.warn).toHaveBeenCalledWith(
        'Port 3000 is in use, trying next...',
      );
      expect(mockServer.log.warn).toHaveBeenCalledWith(
        'Default port 3000 in use. Using fallback port 3001.',
      );
    });

    it('should try all fallback ports until one succeeds', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      // First two calls fail, third succeeds
      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn
        .mockRejectedValueOnce({ code: 'EADDRINUSE' })
        .mockRejectedValueOnce({ code: 'EADDRINUSE' })
        .mockResolvedValueOnce(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledTimes(3);
      expect(mockServer.listen).toHaveBeenNthCalledWith(3, {
        port: 3002,
        host: 'localhost',
      });
      expect(mockServer.log.info).toHaveBeenCalledWith(
        'Server listening on http://localhost:3002',
      );
    });

    it('should handle duplicate ports in configuration', async () => {
      const config = createMockConfig();
      config.server.portFallbacks = [3000, 3001, 3000]; // Duplicate 3000
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      // Should only try unique ports
      expect(mockServer.listen).toHaveBeenCalledTimes(1);
    });

    it('should log warning when using fallback port', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn
        .mockRejectedValueOnce({ code: 'EADDRINUSE' })
        .mockResolvedValueOnce(undefined);

      await listen(mockServer, config);

      expect(mockServer.log.warn).toHaveBeenCalledWith(
        'Default port 3000 in use. Using fallback port 3001.',
      );
    });
  });

  describe('error handling', () => {
    it('should throw when all ports are in use', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      // All ports fail with EADDRINUSE
      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockRejectedValue({ code: 'EADDRINUSE' });

      await expect(listen(mockServer, config)).rejects.toThrow(
        'No available ports found from: 3000, 3001, 3002',
      );

      expect(mockServer.listen).toHaveBeenCalledTimes(3);
    });

    it('should throw immediately on non-EADDRINUSE errors', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      const customError = new Error('Permission denied');

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockRejectedValue(customError);

      await expect(listen(mockServer, config)).rejects.toThrow('Permission denied');

      // Should not try fallback ports
      expect(mockServer.listen).toHaveBeenCalledTimes(1);
    });

    it('should throw on network errors', async () => {
      const config = createMockConfig();
      const mockServer = createMockFastifyInstance();

      const networkError = Object.assign(new Error('Network error'), {
        code: 'ENETUNREACH',
      });

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockRejectedValue(networkError);

      await expect(listen(mockServer, config)).rejects.toThrow('Network error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty fallback array', async () => {
      const config = createMockConfig();
      config.server.portFallbacks = [];
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledTimes(1);
      expect(mockServer.listen).toHaveBeenCalledWith({
        port: 3000,
        host: 'localhost',
      });
    });

    it('should handle different host configurations', async () => {
      const config = createMockConfig();
      config.server.host = '0.0.0.0';
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledWith({
        port: 3000,
        host: '0.0.0.0',
      });
      expect(mockServer.log.info).toHaveBeenCalledWith(
        'Server listening on http://0.0.0.0:3000',
      );
    });

    it('should handle high port numbers', async () => {
      const config = createMockConfig();
      config.server.port = 65535;
      config.server.portFallbacks = [];
      const mockServer = createMockFastifyInstance();

      const listenFn = mockServer.listen as ReturnType<typeof vi.fn>;
      listenFn.mockResolvedValue(undefined);

      await listen(mockServer, config);

      expect(mockServer.listen).toHaveBeenCalledWith({
        port: 65535,
        host: 'localhost',
      });
    });
  });
});

// ============================================================================
// Tests: isAddrInUse
// ============================================================================

describe('isAddrInUse', () => {
  describe('EADDRINUSE detection', () => {
    it('should return true for EADDRINUSE error', () => {
      const error = { code: 'EADDRINUSE' };

      expect(isAddrInUse(error)).toBe(true);
    });

    it('should return true for Error object with EADDRINUSE code', () => {
      const error = Object.assign(new Error('Address in use'), {
        code: 'EADDRINUSE',
      });

      expect(isAddrInUse(error)).toBe(true);
    });
  });

  describe('non-EADDRINUSE errors', () => {
    it('should return false for other error codes', () => {
      const error = { code: 'EACCES' };

      expect(isAddrInUse(error)).toBe(false);
    });

    it('should return false for errors without code property', () => {
      const error = new Error('Generic error');

      expect(isAddrInUse(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAddrInUse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isAddrInUse(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isAddrInUse('error')).toBe(false);
      expect(isAddrInUse(123)).toBe(false);
      expect(isAddrInUse(true)).toBe(false);
    });

    it('should return false for objects without code', () => {
      expect(isAddrInUse({})).toBe(false);
      expect(isAddrInUse({ message: 'error' })).toBe(false);
    });

    it('should return false for objects with non-string code', () => {
      expect(isAddrInUse({ code: 123 })).toBe(false);
      expect(isAddrInUse({ code: null })).toBe(false);
      expect(isAddrInUse({ code: undefined })).toBe(false);
    });
  });

  describe('type safety', () => {
    it('should handle unknown type safely', () => {
      const error: unknown = { code: 'EADDRINUSE' };

      expect(isAddrInUse(error)).toBe(true);
    });

    it('should handle nested objects', () => {
      const error = {
        inner: {
          code: 'EADDRINUSE',
        },
      };

      // Should return false because code is not at top level
      expect(isAddrInUse(error)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle case-sensitive code matching', () => {
      expect(isAddrInUse({ code: 'eaddrinuse' })).toBe(false);
      expect(isAddrInUse({ code: 'EADDRINUSE' })).toBe(true);
      expect(isAddrInUse({ code: 'EAddrInUse' })).toBe(false);
    });

    it('should handle extra whitespace in code', () => {
      expect(isAddrInUse({ code: ' EADDRINUSE' })).toBe(false);
      expect(isAddrInUse({ code: 'EADDRINUSE ' })).toBe(false);
      expect(isAddrInUse({ code: ' EADDRINUSE ' })).toBe(false);
    });

    it('should handle objects with multiple properties', () => {
      const error = {
        code: 'EADDRINUSE',
        message: 'Port already in use',
        errno: -48,
      };

      expect(isAddrInUse(error)).toBe(true);
    });

    it('should handle frozen objects', () => {
      const error = Object.freeze({ code: 'EADDRINUSE' });

      expect(isAddrInUse(error)).toBe(true);
    });

    it('should handle objects with getters', () => {
      const error = {
        get code() {
          return 'EADDRINUSE';
        },
      };

      expect(isAddrInUse(error)).toBe(true);
    });
  });
});
