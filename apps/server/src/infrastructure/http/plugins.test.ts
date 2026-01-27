// apps/server/src/infrastructure/http/plugins.test.ts
/**
 * Tests for HTTP Plugins Registration
 *
 * Verifies that all middleware and plugins are properly registered with Fastify,
 * including security headers, CORS, rate limiting, CSRF, error handling, and static files.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { registerPlugins } from './plugins';

import type { AppConfig } from '@/config/index';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('@rate-limit/index', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    check: vi.fn().mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetMs: 60000,
    }),
  })),
}));

vi.mock('@shared/index', () => ({
  isAppError: vi.fn((error: unknown) => {
    return (
      error != null &&
      typeof error === 'object' &&
      'statusCode' in error &&
      'code' in error
    );
  }),
}));

vi.mock('./middleware', () => ({
  applyCors: vi.fn(),
  applySecurityHeaders: vi.fn(),
  getProductionSecurityDefaults: vi.fn(() => ({
    'Content-Security-Policy': 'default-src self',
  })),
  handlePreflight: vi.fn(() => false),
  registerCookies: vi.fn(),
  registerCorrelationIdHook: vi.fn(),
  registerCsrf: vi.fn(),
  registerPrototypePollutionProtection: vi.fn(),
  registerRequestInfoHook: vi.fn(),
  registerStaticServe: vi.fn(),
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock Fastify instance with all required methods
 */
function createMockFastify(): FastifyInstance {
  const hooks: {
    onRequest: Array<(req: FastifyRequest, reply: FastifyReply, done: () => void) => void>;
    onResponse: Array<(req: FastifyRequest, reply: FastifyReply, done: () => void) => void>;
  } = {
    onRequest: [],
    onResponse: [],
  };

  const fastifyMock = {
    addHook: vi.fn((hookName: string, handler: () => void) => {
      if (hookName === 'onRequest') {
        hooks.onRequest.push(handler as () => void);
      } else if (hookName === 'onResponse') {
        hooks.onResponse.push(handler as () => void);
      }
    }),
    setErrorHandler: vi.fn(),
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    _hooks: hooks,
  } as unknown as FastifyInstance;

  return fastifyMock;
}

/**
 * Create a mock AppConfig with sensible defaults
 */
function createMockConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    env: 'development',
    server: {
      host: 'localhost',
      port: 3000,
      cors: {
        origin: ['http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
    },
    storage: {
      provider: 'local',
      rootPath: '/tmp/uploads',
    },
    auth: {
      cookie: {
        secret: 'test-secret',
      },
    },
    ...overrides,
  } as AppConfig;
}

// ============================================================================
// Tests
// ============================================================================

describe('registerPlugins', () => {
  let mockFastify: FastifyInstance;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFastify = createMockFastify();
    mockConfig = createMockConfig();
  });

  describe('middleware registration order', () => {
    it('should register prototype pollution protection first', () => {
      const { registerPrototypePollutionProtection } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      expect(registerPrototypePollutionProtection).toHaveBeenCalledWith(mockFastify);
      expect(registerPrototypePollutionProtection).toHaveBeenCalledTimes(1);
    });

    it('should register correlation ID hook', () => {
      const { registerCorrelationIdHook } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      expect(registerCorrelationIdHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register request info hook', () => {
      const { registerRequestInfoHook } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      expect(registerRequestInfoHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register cookies with correct secret', () => {
      const { registerCookies } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      expect(registerCookies).toHaveBeenCalledWith(mockFastify, {
        secret: 'test-secret',
      });
    });

    it('should register CSRF with production encryption', () => {
      const { registerCsrf } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      expect(registerCsrf).toHaveBeenCalledWith(mockFastify, {
        secret: 'test-secret',
        encrypted: true,
        cookieOpts: {
          signed: true,
          sameSite: 'strict',
          httpOnly: true,
          secure: true,
        },
      });
    });

    it('should register CSRF without encryption in development', () => {
      const { registerCsrf } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      expect(registerCsrf).toHaveBeenCalledWith(mockFastify, {
        secret: 'test-secret',
        encrypted: false,
        cookieOpts: {
          signed: true,
          sameSite: 'lax',
          httpOnly: true,
          secure: false,
        },
      });
    });
  });

  describe('security and request hooks', () => {
    it('should add onRequest hook for security headers and rate limiting', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(mockFastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    });

    it('should apply security headers in production with strict defaults', async () => {
      const { applySecurityHeaders, getProductionSecurityDefaults } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );
      expect(onRequestCalls.length).toBeGreaterThan(0);

      const mockReq = {} as FastifyRequest;
      const mockRes = {} as FastifyReply;

      const onRequestHandler = onRequestCalls[0]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(getProductionSecurityDefaults).toHaveBeenCalled();
      expect(applySecurityHeaders).toHaveBeenCalledWith(mockRes, {
        'Content-Security-Policy': 'default-src self',
      });
    });

    it('should apply CORS with configured origins', async () => {
      const { applyCors } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = {} as FastifyRequest;
      const mockRes = {} as FastifyReply;

      const onRequestHandler = onRequestCalls[0]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(applyCors).toHaveBeenCalledWith(mockReq, mockRes, {
        origin: 'http://localhost:5173',
        credentials: true,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      });
    });

    it('should skip rate limiting for preflight requests', async () => {
      const { handlePreflight } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );
      handlePreflight.mockReturnValueOnce(true);

      const { RateLimiter } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@rate-limit/index'),
      );
      const mockCheck = vi.fn();
      RateLimiter.mockImplementationOnce(() => ({
        check: mockCheck,
      }));

      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = {} as FastifyRequest;
      const mockRes = {} as FastifyReply;

      const onRequestHandler = onRequestCalls[0]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(mockCheck).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting and set headers', async () => {
      const { RateLimiter } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@rate-limit/index'),
      );
      const mockCheck = vi.fn().mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 50,
        resetMs: 30000,
      });
      RateLimiter.mockImplementationOnce(() => ({
        check: mockCheck,
      }));

      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await (onRequestCalls[0][1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>)(
        mockReq,
        mockRes,
      );

      expect(mockCheck).toHaveBeenCalledWith('127.0.0.1');
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '50');
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Reset', '30');
    });

    it('should return 429 when rate limit exceeded', async () => {
      const { RateLimiter } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@rate-limit/index'),
      );
      const mockCheck = vi.fn().mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetMs: 60000,
      });
      RateLimiter.mockImplementationOnce(() => ({
        check: mockCheck,
      }));

      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '192.168.1.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await (onRequestCalls[0][1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>)(
        mockReq,
        mockRes,
      );

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60,
      });
    });
  });

  describe('development logging hooks', () => {
    it('should add request timing hooks in development', () => {
      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );
      const onResponseCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onResponse',
      );

      // Should have multiple onRequest hooks (timing + security/rate limit)
      expect(onRequestCalls.length).toBeGreaterThan(1);
      // Should have onResponse hook for logging
      expect(onResponseCalls.length).toBeGreaterThan(0);
    });

    it('should not add timing hooks in production', () => {
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );
      const onResponseCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onResponse',
      );

      // Only security/rate limit hook, no timing hook
      expect(onRequestCalls.length).toBe(1);
      // No response logging in production
      expect(onResponseCalls.length).toBe(0);
    });

    it('should log request details in development', () => {
      registerPlugins(mockFastify, mockConfig);

      const onResponseCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onResponse',
      );

      const mockReq = {
        method: 'GET',
        url: '/api/users',
        ip: '127.0.0.1',
        correlationId: 'test-correlation-id',
        _startAt: process.hrtime.bigint(),
      } as unknown as FastifyRequest;

      const mockReply = {
        statusCode: 200,
        elapsedTime: 50,
      } as FastifyReply;

      const done = vi.fn();
      const onResponseHandler = onResponseCalls[0]?.[1];

      if (onResponseHandler) {
        onResponseHandler(mockReq, mockReply, done);
      }

      expect(mockFastify.log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          ip: '127.0.0.1',
          correlationId: 'test-correlation-id',
          durationMs: expect.any(Number),
        }),
        'request',
      );
      expect(done).toHaveBeenCalled();
    });
  });

  describe('error handler', () => {
    it('should register global error handler', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(mockFastify.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle AppError with correct status and details', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(true);

      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      };

      const mockReq = { correlationId: 'corr-123' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
          correlationId: 'corr-123',
        },
      });
    });

    it('should handle standard Error with Fastify properties', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(false);

      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = Object.assign(new Error('Not found'), {
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const mockReq = { correlationId: 'corr-456' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Not found',
          correlationId: 'corr-456',
          details: undefined,
        },
      });
    });

    it('should sanitize 5xx errors in production', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(false);

      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = new Error('Internal database error: connection failed');

      const mockReq = { correlationId: 'corr-789' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred. Please try again later.',
          details: undefined,
          correlationId: 'corr-789',
        },
      });
    });

    it('should not sanitize 4xx errors in production', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(true);

      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = {
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        details: { reason: 'password mismatch' },
      };

      const mockReq = { correlationId: 'corr-999' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          details: { reason: 'password mismatch' },
          correlationId: 'corr-999',
        },
      });
    });

    it('should always log errors server-side', () => {
      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = new Error('Test error');
      const mockReq = { correlationId: 'corr-log' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockFastify.log.error).toHaveBeenCalledWith(
        { err: mockError, correlationId: 'corr-log' },
        'Request error',
      );
    });
  });

  describe('static file serving', () => {
    it('should register static serve when using local storage', () => {
      const { registerStaticServe } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      const localConfig = createMockConfig({
        storage: {
          provider: 'local',
          rootPath: '/var/uploads',
        },
      });

      registerPlugins(mockFastify, localConfig);

      expect(registerStaticServe).toHaveBeenCalledWith(mockFastify, {
        root: expect.stringContaining('/var/uploads'),
        prefix: '/uploads/',
      });
    });

    it('should not register static serve when using S3', () => {
      const { registerStaticServe } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./middleware'),
      );

      const s3Config = createMockConfig({
        storage: {
          provider: 's3',
          bucket: 'my-bucket',
          region: 'us-east-1',
        },
      });

      registerPlugins(mockFastify, s3Config);

      expect(registerStaticServe).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing correlation ID gracefully', () => {
      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = new Error('Test');
      const mockReq = {} as FastifyRequest; // No correlationId
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          correlationId: undefined,
        }),
      });
    });

    it('should handle errors without statusCode', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(false);

      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = new Error('Generic error');
      const mockReq = { correlationId: 'test' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
    });

    it('should handle non-Error objects', () => {
      const { isAppError } = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@shared/index'),
      );
      isAppError.mockReturnValue(false);

      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      const mockError = 'String error';
      const mockReq = { correlationId: 'test' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        }),
      );
    });
  });
});
