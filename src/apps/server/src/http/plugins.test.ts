// src/apps/server/src/http/plugins.test.ts
/**
 * Tests for HTTP Plugins Registration
 *
 * Verifies that all middleware and plugins are properly registered with Fastify,
 * including security headers, CORS, rate limiting, CSRF, error handling, and static files.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ============================================================================
// Mock Modules
// ============================================================================

vi.mock('@fastify/compress', () => ({ default: vi.fn() }));

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

// Import mocked modules
import * as middleware from './middleware';
import {
  registerPlugins,
  type AppErrorInfo,
  type PluginOptions,
  type RateLimiterLike,
} from './plugins';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

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
    register: vi.fn().mockResolvedValue(undefined),
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
 * Create a mock rate limiter
 */
function createMockRateLimiter(): RateLimiterLike {
  return {
    check: vi.fn().mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetMs: 60000,
    }),
  };
}

/**
 * Create mock PluginOptions with sensible defaults
 */
function createMockOptions(overrides: Partial<PluginOptions> = {}): PluginOptions {
  return {
    env: 'development',
    corsOrigin: 'http://localhost:5173',
    corsCredentials: true,
    corsMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    cookieSecret: 'test-secret',
    rateLimiter: createMockRateLimiter(),
    isAppError: (error: unknown) => {
      return (
        typeof error === 'object' && error !== null && 'statusCode' in error && 'code' in error
      );
    },
    getErrorInfo: (error: unknown) => {
      const err = error as {
        statusCode: number;
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
      const result: AppErrorInfo = {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
      };
      if (err.details !== undefined) {
        result.details = err.details;
      }
      return result;
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('registerPlugins', () => {
  let mockFastify: FastifyInstance;
  let mockOptions: PluginOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFastify = createMockFastify();
    mockOptions = createMockOptions();
  });

  describe('middleware registration order', () => {
    it('should register compression plugin', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(mockFastify.register).toHaveBeenCalledWith(expect.any(Function), { global: true });
    });

    it('should register prototype pollution protection first', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(middleware.registerPrototypePollutionProtection).toHaveBeenCalledWith(mockFastify);
      expect(middleware.registerPrototypePollutionProtection).toHaveBeenCalledTimes(1);
    });

    it('should register correlation ID hook', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(middleware.registerCorrelationIdHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register request info hook', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(middleware.registerRequestInfoHook).toHaveBeenCalledWith(mockFastify);
    });

    it('should register cookies with correct secret', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(middleware.registerCookies).toHaveBeenCalledWith(mockFastify, {
        secret: 'test-secret',
      });
    });

    it('should register CSRF with production encryption', () => {
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

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
      registerPlugins(mockFastify, mockOptions);

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
      registerPlugins(mockFastify, mockOptions);

      expect(mockFastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    });

    it('should apply security headers in production with strict defaults', async () => {
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );
      expect(onRequestCalls.length).toBeGreaterThan(0);

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In production, there's only the security/rate limit hook (first one)
      const onRequestHandler = onRequestCalls[0]?.[1] as (
        req: FastifyRequest,
        res: FastifyReply,
      ) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(middleware.getProductionSecurityDefaults).toHaveBeenCalled();
      expect(middleware.applySecurityHeaders).toHaveBeenCalledWith(mockRes, {
        'Content-Security-Policy': 'default-src self',
      });
    });

    it('should apply CORS with configured origins', async () => {
      registerPlugins(mockFastify, mockOptions);

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
      const onRequestHandler = onRequestCalls[securityHookIndex]?.[1] as (
        req: FastifyRequest,
        res: FastifyReply,
      ) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(middleware.applyCors).toHaveBeenCalledWith(mockReq, mockRes, {
        origin: 'http://localhost:5173',
        credentials: true,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      });
    });

    it('should skip rate limiting for preflight requests', async () => {
      vi.mocked(middleware.handlePreflight).mockReturnValueOnce(true);

      const mockRateLimiter = createMockRateLimiter();
      const options = createMockOptions({ rateLimiter: mockRateLimiter });

      registerPlugins(mockFastify, options);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In development, get the last onRequest hook (the async security/rate limit one)
      const securityHookIndex = onRequestCalls.length - 1;
      const onRequestHandler = onRequestCalls[securityHookIndex]?.[1] as (
        req: FastifyRequest,
        res: FastifyReply,
      ) => Promise<void>;
      await onRequestHandler(mockReq, mockRes);

      expect(mockRateLimiter.check).not.toHaveBeenCalled();
    });

    it('should set rate limit headers on response', async () => {
      // Use production mode to have only one onRequest hook
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

      const onRequestCalls = (mockFastify.addHook as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'onRequest',
      );

      const mockReq = { ip: '127.0.0.1' } as FastifyRequest;
      const mockRes = {
        header: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // In production, there's only one onRequest hook (the security/rate limit one)
      const firstHook = onRequestCalls[0];
      if (firstHook === undefined) {
        throw new Error('Expected onRequest hook to be registered');
      }
      await (firstHook[1] as (req: FastifyRequest, res: FastifyReply) => Promise<void>)(
        mockReq,
        mockRes,
      );

      // Verify rate limit headers are set (values come from mock)
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockRes.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('development logging hooks', () => {
    it('should add request timing hooks in development', () => {
      registerPlugins(mockFastify, mockOptions);

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
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

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
      registerPlugins(mockFastify, mockOptions);

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

      if (typeof onResponseHandler === 'function') {
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
      registerPlugins(mockFastify, mockOptions);

      expect(mockFastify.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle app error with correct status and code', () => {
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

      // Create a structured app error
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
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

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
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

      // Standard Error (not app error) defaults to 500
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
      const prodOptions = createMockOptions({ env: 'production' });
      registerPlugins(mockFastify, prodOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

      // App error with 4xx status
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

      // 4xx errors should not be sanitized
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
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

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
    it('should register static serve when configured', () => {
      const options = createMockOptions({
        staticServe: {
          root: '/var/uploads',
          prefix: '/uploads/',
        },
      });

      registerPlugins(mockFastify, options);

      expect(middleware.registerStaticServe).toHaveBeenCalledWith(mockFastify, {
        root: '/var/uploads',
        prefix: '/uploads/',
      });
    });

    it('should not register static serve when not configured', () => {
      registerPlugins(mockFastify, mockOptions);

      expect(middleware.registerStaticServe).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing correlation ID gracefully', () => {
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

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
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

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
      registerPlugins(mockFastify, mockOptions);

      const errorHandler = (mockFastify.setErrorHandler as Mock).mock.calls[0]?.[0];
      if (typeof errorHandler !== 'function') throw new Error('errorHandler not set');

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
