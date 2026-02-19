// main/server/system/src/errors/handler.test.ts
/**
 * Global Error Handler — Adversarial Unit Tests
 *
 * Risk assessment:
 *  1. `request.logger` may be undefined if the error fires before the onRequest hook
 *     (e.g. a plugin that throws during server startup / route registration).
 *  2. Unknown Error subclasses must never leak stack traces in 500 responses.
 *  3. `TokenReuseError` carries sensitive fields (userId, familyId) that must
 *     not appear in the response body — only a generic 401 message is allowed.
 */

import {
  AccountLockedError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  TooManyRequestsError,
  TokenReuseError,
  UnauthorizedError,
  ValidationError,
} from '@bslt/shared';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { registerErrorHandler } from './handler';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mock Helpers
// ============================================================================

type ErrorHandler = (error: Error, request: FastifyRequest, reply: FastifyReply) => void;

interface MockLogger {
  info: Mock;
  warn: Mock;
  error: Mock;
  debug: Mock;
  child: Mock;
}

function createMockLogger(): MockLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

function createMockServer(serverLog?: MockLogger): {
  server: FastifyInstance;
  capturedHandler: () => ErrorHandler;
  serverLog: MockLogger;
} {
  const log = serverLog ?? createMockLogger();
  let handler: ErrorHandler | undefined;

  const server = {
    log,
    setErrorHandler: vi.fn((h: ErrorHandler) => {
      handler = h;
    }),
  } as unknown as FastifyInstance;

  return {
    server,
    capturedHandler: () => {
      if (handler == null) throw new Error('registerErrorHandler was not called');
      return handler;
    },
    serverLog: log,
  };
}

function createMockRequest(overrides?: {
  logger?: MockLogger | undefined;
  method?: string;
  url?: string;
  ip?: string;
}): FastifyRequest {
  const req: Record<string, unknown> = {
    method: overrides?.method ?? 'POST',
    url: overrides?.url ?? '/api/test',
    ip: overrides?.ip ?? '127.0.0.1',
  };
  // Only set logger if provided — allows testing the undefined fallback path
  if (overrides !== undefined && 'logger' in overrides) {
    req['logger'] = overrides.logger;
  }
  return req as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply & {
  mocks: { status: Mock; send: Mock };
} {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  return {
    status,
    send,
    mocks: { status, send },
  } as unknown as FastifyReply & { mocks: { status: Mock; send: Mock } };
}

// ============================================================================
// Registration
// ============================================================================

describe('registerErrorHandler', () => {
  test('calls server.setErrorHandler exactly once', () => {
    const { server } = createMockServer();
    registerErrorHandler(server);
    expect(server.setErrorHandler).toHaveBeenCalledTimes(1);
    expect(server.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
  });
});

// ============================================================================
// AppError subclasses → correct HTTP status
// ============================================================================

describe('AppError subclass mapping', () => {
  let server: FastifyInstance;
  let capturedHandler: () => ErrorHandler;

  beforeEach(() => {
    const mock = createMockServer();
    server = mock.server;
    capturedHandler = mock.capturedHandler;
    registerErrorHandler(server);
  });

  const cases: Array<[string, Error, number]> = [
    ['BadRequestError', new BadRequestError('bad'), 400],
    ['UnauthorizedError', new UnauthorizedError('unauth'), 401],
    ['ForbiddenError', new ForbiddenError('forbidden'), 403],
    ['NotFoundError', new NotFoundError('not found'), 404],
    ['ConflictError', new ConflictError('conflict'), 409],
    ['ValidationError', new ValidationError('invalid', { email: ['required'] }), 422],
    ['TooManyRequestsError', new TooManyRequestsError('rate limited'), 429],
    ['AccountLockedError', new AccountLockedError(), 429],
    ['InternalServerError', new InternalServerError('oops'), 500],
  ];

  for (const [name, error, expectedStatus] of cases) {
    test(`${name} maps to HTTP ${expectedStatus}`, () => {
      const requestLogger = createMockLogger();
      const request = createMockRequest({ logger: requestLogger });
      const reply = createMockReply();

      capturedHandler()(error, request, reply);

      expect(reply.mocks.status).toHaveBeenCalledWith(expectedStatus);
      expect(reply.mocks.status().send).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false }),
      );
    });
  }
});

// ============================================================================
// Fastify JSON-schema validation errors → 400
// ============================================================================

describe('Fastify schema validation errors', () => {
  test('returns 400 for errors with a `validation` array', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('body/email must be string'), {
      validation: [{ message: 'must be string', instancePath: '/email' }],
      validationContext: 'body',
    });

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(reply.mocks.status).toHaveBeenCalledWith(400);
  });

  test('logs at warn level for schema validation errors', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('schema fail'), {
      validation: [{ message: 'invalid' }],
    });

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(requestLogger.warn).toHaveBeenCalled();
    expect(requestLogger.error).not.toHaveBeenCalled();
  });

  test('empty validation array still returns 400', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('schema'), { validation: [] });
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(reply.mocks.status).toHaveBeenCalledWith(400);
  });
});

// ============================================================================
// Zod duck-typed errors → 422
// ============================================================================

describe('Zod-like validation errors', () => {
  test('returns 422 for errors with an `issues` array', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('Validation error'), {
      issues: [
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
        { path: ['password'], message: 'Too short', code: 'too_small' },
      ],
    });

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(reply.mocks.status).toHaveBeenCalledWith(422);
  });

  test('response body contains field-level error details', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('Validation error'), {
      issues: [{ path: ['name'], message: 'Required', code: 'invalid_type' }],
    });

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    const sentBody = (reply.mocks.status().send as Mock).mock.calls[0]![0] as {
      error: { details: { fields: Record<string, string[]> } };
    };
    expect(sentBody.error.details.fields).toHaveProperty('name');
    expect(sentBody.error.details.fields['name']).toContain('Required');
  });

  test('logs at warn level for Zod errors', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = Object.assign(new Error('zod'), {
      issues: [{ path: [], message: 'bad', code: 'custom' }],
    });

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(requestLogger.warn).toHaveBeenCalled();
    expect(requestLogger.error).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Generic Error → 500 (message redaction)
// ============================================================================

describe('Generic Error → 500', () => {
  test('generic Error maps to 500', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new Error('Database connection refused');
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(reply.mocks.status).toHaveBeenCalledWith(500);
  });

  test('500 response body does not include raw stack trace', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new Error('Internal failure with sensitive info');
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    const sentBody = (reply.mocks.status().send as Mock).mock.calls[0]![0] as {
      error: { message: string };
    };
    // The raw error message must not leak — only a generic message
    expect(sentBody.error.message).not.toContain('Internal failure with sensitive info');
    expect(sentBody.error.message).not.toContain('Error:');
  });

  test('5xx errors are logged at error level', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new Error('Crash');
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(requestLogger.error).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});

// ============================================================================
// Logging — request.logger undefined fallback
// ============================================================================

describe('logger fallback when request.logger is undefined', () => {
  test('falls back to server.log without crashing', () => {
    const serverLog = createMockLogger();
    const { server, capturedHandler } = createMockServer(serverLog);
    registerErrorHandler(server);

    // Simulate an error fired before onRequest (no request.logger set on request)
    const request = createMockRequest(); // no `logger` key — tests the undefined fallback
    const reply = createMockReply();
    const error = new Error('Crash before middleware');

    expect(() => capturedHandler()(error, request, reply)).not.toThrow();
    // server.log.error should have been called (the fallback)
    expect(serverLog.error).toHaveBeenCalled();
  });

  test('falls back to server.log for 4xx errors too', () => {
    const serverLog = createMockLogger();
    const { server, capturedHandler } = createMockServer(serverLog);
    registerErrorHandler(server);

    const request = createMockRequest(); // no `logger` key
    const reply = createMockReply();
    const error = new NotFoundError('No such thing');

    expect(() => capturedHandler()(error, request, reply)).not.toThrow();
    expect(serverLog.warn).toHaveBeenCalled();
  });
});

// ============================================================================
// 4xx errors are logged at warn level (not error)
// ============================================================================

describe('4xx log level', () => {
  test('4xx AppErrors are logged at warn level', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new UnauthorizedError('Missing token');
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(requestLogger.warn).toHaveBeenCalled();
    expect(requestLogger.error).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Killer test: TokenReuseError — security alert, no PII in response
// ============================================================================

describe('TokenReuseError — security-sensitive error', () => {
  test('maps to 401 and does not expose userId, familyId, or email in response body', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new TokenReuseError(
      'user-abc-123',
      'victim@example.com',
      'family-xyz-999',
      '10.0.0.1',
      'Mozilla/5.0',
    );

    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(reply.mocks.status).toHaveBeenCalledWith(401);

    const sentBody = (reply.mocks.status().send as Mock).mock.calls[0]![0] as {
      error: { message: string; code?: string };
    };

    // Sensitive fields must never appear in response body
    const bodyStr = JSON.stringify(sentBody);
    expect(bodyStr).not.toContain('user-abc-123');
    expect(bodyStr).not.toContain('victim@example.com');
    expect(bodyStr).not.toContain('family-xyz-999');
    expect(bodyStr).not.toContain('10.0.0.1');
    expect(bodyStr).not.toContain('Mozilla');
  });

  test('logs TokenReuseError at warn level (not error) since it is a 401', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const error = new TokenReuseError('uid', 'mail@x.com', 'fam');
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    capturedHandler()(error, request, reply);

    expect(requestLogger.warn).toHaveBeenCalled();
    expect(requestLogger.error).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Boundary / edge cases
// ============================================================================

describe('edge cases', () => {
  test('non-Error object thrown does not crash handler', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    // Fastify always calls setErrorHandler with an Error — but simulate unusual input
    const nonError = { message: 'weird' } as unknown as Error;
    const requestLogger = createMockLogger();
    const request = createMockRequest({ logger: requestLogger });
    const reply = createMockReply();

    expect(() => capturedHandler()(nonError, request, reply)).not.toThrow();
    // Should still produce a response
    expect(reply.mocks.status).toHaveBeenCalled();
  });

  test('concurrent handler calls do not share state (no shared mutable state)', () => {
    const { server, capturedHandler } = createMockServer();
    registerErrorHandler(server);

    const handler = capturedHandler();
    const makeCall = (): Mock => {
      const requestLogger = createMockLogger();
      const request = createMockRequest({ logger: requestLogger });
      const reply = createMockReply();
      handler(new BadRequestError('err'), request, reply);
      return reply.mocks.status;
    };

    const s1 = makeCall();
    const s2 = makeCall();

    expect(s1).toHaveBeenCalledWith(400);
    expect(s2).toHaveBeenCalledWith(400);
    // Calls are independent — different mock instances
    expect(s1).not.toBe(s2);
  });
});
