// apps/server/src/logger/middleware.test.ts
// apps/server/src/logger/middleware.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createJobCorrelationId, createJobLogger, registerLoggingMiddleware } from './middleware';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mock Helpers
// ============================================================================

type HookHandler = (req: FastifyRequest, reply: FastifyReply, error?: Error) => Promise<void>;
type HookMap = {
  onRequest: HookHandler[];
  onResponse: HookHandler[];
  onError: HookHandler[];
};

function createMockFastify() {
  const hooks: HookMap = {
    onRequest: [],
    onResponse: [],
    onError: [],
  };

  const mockLog = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  const instance = {
    log: mockLog,
    addHook: vi.fn((event: keyof HookMap, handler: HookHandler) => {
      hooks[event].push(handler);
    }),
    hooks,
  };

  return instance as unknown as FastifyInstance & { hooks: typeof hooks };
}

function getHook(server: ReturnType<typeof createMockFastify>, hook: keyof HookMap): HookHandler {
  const handler = server.hooks[hook][0];
  if (handler == null) {
    throw new Error(`Missing ${hook} hook`);
  }
  return handler;
}

function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    id: 'req-123',
    method: 'GET',
    url: '/api/test',
    ip: '127.0.0.1',
    headers: {},
    user: undefined,
    correlationId: '',
    requestContext: undefined as unknown,
    logger: undefined as unknown,
    ...overrides,
  } as unknown as FastifyRequest;
}

function createMockReply(overrides: Partial<FastifyReply> = {}): FastifyReply {
  const reply = {
    statusCode: 200,
    elapsedTime: 50,
    header: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;

  return Object.assign(reply, overrides);
}

// ============================================================================
// registerLoggingMiddleware Tests
// ============================================================================

describe('registerLoggingMiddleware', () => {
  let server: ReturnType<typeof createMockFastify>;

  beforeEach(() => {
    server = createMockFastify();
    vi.clearAllMocks();
  });

  test('should register three hooks', () => {
    registerLoggingMiddleware(server as unknown as FastifyInstance);

    expect(server.addHook).toHaveBeenCalledTimes(3);
    expect(server.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(server.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
    expect(server.addHook).toHaveBeenCalledWith('onError', expect.any(Function));
  });

  describe('onRequest hook', () => {
    test('should add correlationId to request', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(request.correlationId).toBeDefined();
      expect(typeof request.correlationId).toBe('string');
      expect(request.correlationId.length).toBeGreaterThan(0);
    });

    test('should use existing x-correlation-id header', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest({
        headers: { 'x-correlation-id': 'existing-id-123' },
      });
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(request.correlationId).toBe('existing-id-123');
    });

    test('should set correlation ID in response headers', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(reply.header).toHaveBeenCalledWith('x-correlation-id', request.correlationId);
    });

    test('should create requestContext on request', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(request.requestContext).toBeDefined();
      expect(request.requestContext.correlationId).toBe(request.correlationId);
      expect(request.requestContext.method).toBe('GET');
      expect(request.requestContext.path).toBe('/api/test');
    });

    test('should create request-scoped logger', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(request.logger).toBeDefined();
      expect(typeof request.logger.info).toBe('function');
      expect(typeof request.logger.error).toBe('function');
    });

    test('should include userId in requestContext when user is present', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest({
        user: { userId: 'user-456', email: 'test@example.com', role: 'user' },
      } as Partial<FastifyRequest>);
      const reply = createMockReply();

      await getHook(server, 'onRequest')(request, reply);

      expect(request.requestContext.userId).toBe('user-456');
    });
  });

  describe('onResponse hook', () => {
    test('should log request completion with details', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply({ statusCode: 201, elapsedTime: 123.456 });

      // First run onRequest to set up logger
      await getHook(server, 'onRequest')(request, reply);

      // Spy on the logger
      const loggerInfoSpy = vi.spyOn(request.logger, 'info');

      // Then run onResponse
      await getHook(server, 'onResponse')(request, reply);

      expect(loggerInfoSpy).toHaveBeenCalledWith('Request completed', {
        method: 'GET',
        path: '/api/test',
        statusCode: 201,
        duration: 123,
      });
    });
  });

  describe('onError hook', () => {
    test('should log error with request details', async () => {
      registerLoggingMiddleware(server as unknown as FastifyInstance);

      const request = createMockRequest();
      const reply = createMockReply({ statusCode: 500 });
      const error = new Error('Test error');

      // First run onRequest to set up logger
      await getHook(server, 'onRequest')(request, reply);

      // Spy on the logger
      const loggerErrorSpy = vi.spyOn(request.logger, 'error');

      // Then run onError
      await getHook(server, 'onError')(request, reply, error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(error, {
        method: 'GET',
        path: '/api/test',
        statusCode: 500,
      });
    });
  });
});

// ============================================================================
// createJobCorrelationId Tests
// ============================================================================

describe('createJobCorrelationId', () => {
  test('should create correlation ID with job prefix', () => {
    const correlationId = createJobCorrelationId('email-sender');

    expect(correlationId).toMatch(/^job:email-sender:/);
  });

  test('should include unique identifier', () => {
    const id1 = createJobCorrelationId('test-job');
    const id2 = createJobCorrelationId('test-job');

    expect(id1).not.toBe(id2);
  });

  test('should handle different job names', () => {
    const emailJob = createJobCorrelationId('email-sender');
    const cleanupJob = createJobCorrelationId('cleanup-task');

    expect(emailJob).toContain('email-sender');
    expect(cleanupJob).toContain('cleanup-task');
  });
});

// ============================================================================
// createJobLogger Tests
// ============================================================================

describe('createJobLogger', () => {
  test('should create logger with job context', () => {
    const mockBaseLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const logger = createJobLogger(mockBaseLogger as unknown as FastifyInstance['log'], 'test-job');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  test('should use provided jobId when given', () => {
    const mockBaseLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const logger = createJobLogger(
      mockBaseLogger as unknown as FastifyInstance['log'],
      'test-job',
      'custom-job-id-123',
    );

    // Logger should be created (we can't easily inspect internal state)
    expect(logger).toBeDefined();
  });

  test('should generate correlationId when jobId not provided', () => {
    const mockBaseLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    const logger = createJobLogger(
      mockBaseLogger as unknown as FastifyInstance['log'],
      'auto-id-job',
    );

    expect(logger).toBeDefined();
  });
});
