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

vi.mock('@security/rate-limit', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    check: vi.fn().mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetMs: 60000,
    }),
  })),
}));

// NOTE: We don't mock @abe-stack/core/infrastructure/errors because vitest's module
// mocking doesn't work reliably with vite-tsconfig-paths for workspaced packages.
// Instead, we use actual AppError instances in tests where needed.

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

// Import modules
import { RateLimiter } from '@security/rate-limit';
import * as middleware from './middleware';
import { AppError } from '@abe-stack/core/infrastructure/errors';

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
    // Reset RateLimiter to default mock
    vi.mocked(RateLimiter).mockImplementation(() => ({
      check: vi.fn().mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetMs: 60000,
      }),
    }) as never);
    mockFastify = createMockFastify();
    mockConfig = createMockConfig();
  });

  describe('middleware registration order', () => {
    it('should register prototype pollution protection first', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(middleware.registerPrototypePollutionProtection).toHaveBeenCalledWith(mockFastify);
      expect(middleware.registerPrototypePollutionProtection).toHaveBeenCalledTimes(1);
    });

    it('should register correlation ID hook', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(middleware.registerCorrelationIdHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register request info hook', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(middleware.registerRequestInfoHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register cookies with correct secret', () => {
      registerPlugins(mockFastify, mockConfig);

      expect(middleware.registerCookies).toHaveBeenCalledWith(mockFastify, {
        secret: 'test-secret',
      });
    });

    it('should register CSRF with production encryption', () => {
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      expect(middleware.registerCsrf).toHaveBeenCalledWith(mockFastify, {
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
      registerPlugins(mockFastify, mockConfig);

      expect(middleware.registerCsrf).toHaveBeenCalledWith(mockFastify, {
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
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );
      expect(onRequestCalls.length).toBeGreaterThan(0);

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In production, there's only the security/rate limit hook (first one)
      const onRequestHandler = onRequestCalls[0]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(middleware.getProductionSecurityDefaults).toHaveBeenCalled();
      expect(middleware.applySecurityHeaders).toHaveBeenCalledWith(mockRes, {
        'Content-Security-Policy': 'default-src self',
      });
    });

    it('should apply CORS with configured origins', async () => {
      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In development, the first hook is timing (sync), the second is security/rate limit (async)
      // Get the last onRequest hook which is the security/rate limit async hook
      const securityHookIndex = onRequestCalls.length - 1;
      const onRequestHandler = onRequestCalls[securityHookIndex]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(middleware.applyCors).toHaveBeenCalledWith(mockReq, mockRes, {
        origin: 'http://localhost:5173',
        credentials: true,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      });
    });

    it('should skip rate limiting for preflight requests', async () => {
      vi.mocked(middleware.handlePreflight).mockReturnValueOnce(true);

      const mockCheck = vi.fn();
      vi.mocked(RateLimiter).mockImplementationOnce(() => ({
        check: mockCheck,
      }) as never);

      registerPlugins(mockFastify, mockConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In development, get the last onRequest hook (the async security/rate limit one)
      const securityHookIndex = onRequestCalls.length - 1;
      const onRequestHandler = onRequestCalls[securityHookIndex]?.[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(mockCheck).not.toHaveBeenCalled();
    });

    it('should set rate limit headers on response', async () => {
      // Use production mode to have only one onRequest hook
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In production, there's only one onRequest hook (the security/rate limit one)
      await (onRequestCalls[0][1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>)(
        mockReq,
        mockRes,
      );

      // Verify rate limit headers are set (values come from RateLimiter mock)
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    // Note: RateLimiter constructor verification is not reliable in unit tests due to
    // vitest module resolution issues with workspaced packages. The rate limiting
    // behavior is verified through the header test above and integration tests.
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

    it('should handle AppError with correct status and code', () => {
      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      // Use actual AppError instance (no mocking needed)
      const mockError = new AppError(
        'Invalid input',
        400,
        'VALIDATION_ERROR',
        { field: 'email' },
      );

      const mockReq = { correlationId: 'corr-123' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            correlationId: 'corr-123',
          }),
        }),
      );
    });

    it('should handle standard Error with Fastify properties', () => {
      // Regular Error instances are NOT AppErrors, so no mocking needed
      registerPlugins(mockFastify, mockConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      // Standard Error with Fastify error properties
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
        },
      });
    });

    it('should sanitize 5xx errors in production', () => {
      // Regular Error instances are NOT AppErrors, so no mocking needed
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      // Standard Error (not AppError) defaults to 500
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
          correlationId: 'corr-789',
        },
      });
    });

    it('should not sanitize 4xx errors in production', () => {
      const prodConfig = createMockConfig({ env: 'production' });
      registerPlugins(mockFastify, prodConfig);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (!errorHandler) throw new Error('errorHandler not set');

      // Use actual AppError instance (no mocking needed)
      const mockError = new AppError(
        'Invalid credentials',
        401,
        'UNAUTHORIZED',
        { reason: 'password mismatch' },
      );

      const mockReq = { correlationId: 'corr-999' } as FastifyRequest;
      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      errorHandler(mockError, mockReq, mockReply);

      // 4xx errors should not be sanitized - message and code should pass through
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
            correlationId: 'corr-999',
          }),
        }),
      );
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
      const localConfig = createMockConfig({
        storage: {
          provider: 'local',
          rootPath: '/var/uploads',
        },
      });

      registerPlugins(mockFastify, localConfig);

      expect(middleware.registerStaticServe).toHaveBeenCalledWith(mockFastify, {
        root: expect.stringContaining('/var/uploads'),
        prefix: '/uploads/',
      });
    });

    it('should not register static serve when using S3', () => {
      const s3Config = createMockConfig({
        storage: {
          provider: 's3',
          bucket: 'my-bucket',
          region: 'us-east-1',
        },
      });

      registerPlugins(mockFastify, s3Config);

      expect(middleware.registerStaticServe).not.toHaveBeenCalled();
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
      // Regular Error without statusCode defaults to 500
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
      // Non-Error objects (like strings) are treated as unknown errors
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
