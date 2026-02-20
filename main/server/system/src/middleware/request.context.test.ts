// main/server/system/src/middleware/request.context.test.ts
/**
 * Tests for Request Context Enrichment Middleware
 *
 * Covers context creation, timing entries, severity mapping,
 * and Fastify plugin integration.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  addTiming,
  createEnrichedContext,
  requestContextPlugin,
  severityFromStatus,
} from './request.context';

import type { ApiVersionInfo } from '../routing/api.versioning.types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// severityFromStatus
// ============================================================================

describe('severityFromStatus', () => {
  test('should return "error" for 5xx status codes', () => {
    expect(severityFromStatus(500)).toBe('error');
    expect(severityFromStatus(502)).toBe('error');
    expect(severityFromStatus(503)).toBe('error');
    expect(severityFromStatus(599)).toBe('error');
  });

  test('should return "warn" for 4xx status codes', () => {
    expect(severityFromStatus(400)).toBe('warn');
    expect(severityFromStatus(401)).toBe('warn');
    expect(severityFromStatus(403)).toBe('warn');
    expect(severityFromStatus(404)).toBe('warn');
    expect(severityFromStatus(422)).toBe('warn');
    expect(severityFromStatus(429)).toBe('warn');
    expect(severityFromStatus(499)).toBe('warn');
  });

  test('should return "info" for 3xx status codes', () => {
    expect(severityFromStatus(301)).toBe('info');
    expect(severityFromStatus(302)).toBe('info');
    expect(severityFromStatus(304)).toBe('info');
    expect(severityFromStatus(399)).toBe('info');
  });

  test('should return "debug" for 2xx status codes', () => {
    expect(severityFromStatus(200)).toBe('debug');
    expect(severityFromStatus(201)).toBe('debug');
    expect(severityFromStatus(204)).toBe('debug');
    expect(severityFromStatus(299)).toBe('debug');
  });

  test('should return "info" for 1xx status codes', () => {
    expect(severityFromStatus(100)).toBe('info');
    expect(severityFromStatus(101)).toBe('info');
  });

  test('should return "info" for unexpected status codes below 200', () => {
    expect(severityFromStatus(0)).toBe('info');
    expect(severityFromStatus(99)).toBe('info');
  });
});

// ============================================================================
// createEnrichedContext
// ============================================================================

describe('createEnrichedContext', () => {
  test('should create context with default version info', () => {
    const ctx = createEnrichedContext();

    expect(ctx.apiVersion).toBe(1);
    expect(ctx.apiVersionSource).toBe('default');
    expect(ctx.severity).toBe('debug');
    expect(ctx.startTime).toBeGreaterThan(0);
  });

  test('should create context with provided version info', () => {
    const versionInfo: ApiVersionInfo = { version: 1, source: 'url' };
    const ctx = createEnrichedContext(versionInfo);

    expect(ctx.apiVersion).toBe(1);
    expect(ctx.apiVersionSource).toBe('url');
  });

  test('should include a "request_start" timing entry', () => {
    const ctx = createEnrichedContext();

    expect(ctx.timings).toHaveLength(1);
    expect(ctx.timings[0]!.label).toBe('request_start');
    expect(ctx.timings[0]!.timestamp).toBeGreaterThan(0);
  });

  test('should set startTime equal to the first timing entry', () => {
    const ctx = createEnrichedContext();

    expect(ctx.startTime).toBe(ctx.timings[0]!.timestamp);
  });
});

// ============================================================================
// addTiming
// ============================================================================

describe('addTiming', () => {
  test('should append a timing entry to the context', () => {
    const ctx = createEnrichedContext();
    const initialLength = ctx.timings.length;

    addTiming(ctx, 'middleware_done');

    expect(ctx.timings).toHaveLength(initialLength + 1);
    expect(ctx.timings[ctx.timings.length - 1]!.label).toBe('middleware_done');
  });

  test('should record a timestamp for each entry', () => {
    const ctx = createEnrichedContext();

    addTiming(ctx, 'auth_check');

    const lastEntry = ctx.timings[ctx.timings.length - 1]!;
    expect(lastEntry.timestamp).toBeGreaterThan(0);
    expect(lastEntry.timestamp).toBeGreaterThanOrEqual(ctx.startTime);
  });

  test('should preserve previous entries when adding new ones', () => {
    const ctx = createEnrichedContext();

    addTiming(ctx, 'step_1');
    addTiming(ctx, 'step_2');
    addTiming(ctx, 'step_3');

    expect(ctx.timings).toHaveLength(4); // request_start + 3
    expect(ctx.timings[0]!.label).toBe('request_start');
    expect(ctx.timings[1]!.label).toBe('step_1');
    expect(ctx.timings[2]!.label).toBe('step_2');
    expect(ctx.timings[3]!.label).toBe('step_3');
  });
});

// ============================================================================
// requestContextPlugin — Fastify integration
// ============================================================================

describe('requestContextPlugin', () => {
  type HookHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  type HookMap = { onRequest: HookHandler[]; onResponse: HookHandler[] };

  let hooks: HookMap;
  let decorators: Record<string, unknown>;
  let mockFastify: FastifyInstance;

  beforeEach(() => {
    hooks = { onRequest: [], onResponse: [] };
    decorators = {};

    mockFastify = {
      decorateRequest: vi.fn((name: string, value: unknown) => {
        decorators[name] = value;
      }),
      hasRequestDecorator: vi.fn((name: string) => name in decorators),
      addHook: vi.fn((event: string, handler: HookHandler) => {
        if (event === 'onRequest') hooks.onRequest.push(handler);
        if (event === 'onResponse') hooks.onResponse.push(handler);
      }),
    } as unknown as FastifyInstance;

    vi.clearAllMocks();
  });

  function createMockRequest(
    overrides: Partial<FastifyRequest> & { apiVersionInfo?: ApiVersionInfo } = {},
  ): FastifyRequest {
    return {
      url: '/api/test',
      headers: {},
      enrichedContext: undefined,
      ...overrides,
    } as unknown as FastifyRequest;
  }

  function createMockReply(overrides: Partial<{ statusCode: number }> = {}): FastifyReply {
    return {
      statusCode: 200,
      header: vi.fn().mockReturnThis(),
      ...overrides,
    } as unknown as FastifyReply;
  }

  test('should register onRequest and onResponse hooks', () => {
    requestContextPlugin(mockFastify, {}, () => {});

    expect(mockFastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(mockFastify.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
  });

  test('should decorate request with enrichedContext', () => {
    requestContextPlugin(mockFastify, {}, () => {});

    expect(mockFastify.decorateRequest).toHaveBeenCalledWith(
      'enrichedContext',
      expect.objectContaining({ apiVersion: 1 }),
    );
  });

  test('should call done callback', () => {
    const done = vi.fn();
    requestContextPlugin(mockFastify, {}, done);

    expect(done).toHaveBeenCalledTimes(1);
  });

  describe('onRequest hook', () => {
    test('should initialise enrichedContext on request', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest();
      const reply = createMockReply();

      await hooks.onRequest[0]!(request, reply);

      const ctx = request.enrichedContext;
      expect(ctx).toBeDefined();
      expect(ctx.apiVersion).toBe(1);
      expect(ctx.apiVersionSource).toBe('default');
      expect(ctx.timings).toHaveLength(1);
      expect(ctx.timings[0]!.label).toBe('request_start');
    });

    test('should pick up apiVersionInfo from the versioning plugin', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest({
        apiVersionInfo: { version: 1, source: 'url' },
      });
      const reply = createMockReply();

      await hooks.onRequest[0]!(request, reply);

      expect(request.enrichedContext.apiVersion).toBe(1);
      expect(request.enrichedContext.apiVersionSource).toBe('url');
    });
  });

  describe('onResponse hook', () => {
    test('should add request_end timing entry', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest();
      const reply = createMockReply();

      await hooks.onRequest[0]!(request, reply);
      await hooks.onResponse[0]!(request, reply);

      const timings = request.enrichedContext.timings;
      expect(timings[timings.length - 1]!.label).toBe('request_end');
    });

    test('should set severity to "debug" for 200 responses', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest();
      const reply = createMockReply({ statusCode: 200 });

      await hooks.onRequest[0]!(request, reply);
      await hooks.onResponse[0]!(request, reply);

      expect(request.enrichedContext.severity).toBe('debug');
    });

    test('should set severity to "warn" for 404 responses', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest();
      const reply = createMockReply({ statusCode: 404 });

      await hooks.onRequest[0]!(request, reply);
      await hooks.onResponse[0]!(request, reply);

      expect(request.enrichedContext.severity).toBe('warn');
    });

    test('should set severity to "error" for 500 responses', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      const request = createMockRequest();
      const reply = createMockReply({ statusCode: 500 });

      await hooks.onRequest[0]!(request, reply);
      await hooks.onResponse[0]!(request, reply);

      expect(request.enrichedContext.severity).toBe('error');
    });

    test('should handle missing enrichedContext gracefully', async () => {
      requestContextPlugin(mockFastify, {}, () => {});

      // Simulate a request where onRequest wasn't called
      const request = createMockRequest();
      (request as unknown as Record<string, unknown>)['enrichedContext'] = undefined;
      const reply = createMockReply({ statusCode: 200 });

      // Should not throw
      await hooks.onResponse[0]!(request, reply);
    });
  });
});
