// main/server/core/src/admin/metricsHandler.test.ts
/**
 * Admin Metrics Handler Tests
 *
 * Verifies auth checks, metrics summary retrieval, and queue stats inclusion.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { handleGetMetrics } from './metricsHandler';

import type { AdminAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/server-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../engine/src')>();

  const mockCollector = {
    getMetricsSummary: vi.fn().mockReturnValue({
      requests: {
        total: 42,
        byRoute: { '/api/users': 30, '/api/auth/login': 12 },
        byStatus: { '200': 35, '401': 5, '500': 2 },
      },
      latency: {
        p50: 15,
        p95: 120,
        p99: 350,
        avg: 25.5,
      },
      uptimeSeconds: 3600,
      collectedAt: '2026-02-11T12:00:00.000Z',
    }),
  };

  return {
    ...actual,
    getMetricsCollector: vi.fn().mockReturnValue(mockCollector),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides: Partial<AdminAppContext> = {}): AdminAppContext {
  return {
    config: {} as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      users: {} as AdminAppContext['repos']['users'],
    } as AdminAppContext['repos'],
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {} as unknown,
    notifications: {
      isConfigured: vi.fn().mockReturnValue(false),
    },
    queue: {
      getStats: vi.fn().mockResolvedValue({ pending: 5, failed: 1 }),
    },
    write: {},
    search: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  } as AdminAppContext;
}

function createMockRequest(
  overrides: Partial<{ user: { userId: string; role: string } }> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): FastifyRequest {
  return {
    cookies: {},
    headers: {},
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params,
    query,
    ...overrides,
  } as unknown as FastifyRequest;
}

function createUnauthenticatedRequest(): FastifyRequest {
  return {
    cookies: {},
    headers: {},
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    params: {},
    query: {},
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('handleGetMetrics', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should return 401 when not authenticated', async () => {
    const req = createUnauthenticatedRequest();
    const result = await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  test('should return 200 with metrics summary', async () => {
    const req = createMockRequest();
    const result = await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(result.status).toBe(200);
    expect('metrics' in result.body).toBe(true);

    if ('metrics' in result.body) {
      expect(result.body.metrics.requests.total).toBe(42);
      expect(result.body.metrics.latency.p50).toBe(15);
      expect(result.body.metrics.latency.p95).toBe(120);
      expect(result.body.metrics.latency.p99).toBe(350);
    }
  });

  test('should include queue stats when available', async () => {
    const req = createMockRequest();
    const result = await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(result.status).toBe(200);
    if ('queue' in result.body) {
      expect(result.body.queue).toEqual({ pending: 5, failed: 1 });
    }
  });

  test('should return null queue stats when queue has no getStats', async () => {
    mockCtx = createMockContext({ queue: {} });

    const req = createMockRequest();
    const result = await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(result.status).toBe(200);
    if ('queue' in result.body) {
      expect(result.body.queue).toBeNull();
    }
  });

  test('should return null queue stats when getStats throws', async () => {
    mockCtx = createMockContext({
      queue: {
        getStats: vi.fn().mockRejectedValue(new Error('Queue unavailable')),
      },
    });

    const req = createMockRequest();
    const result = await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(result.status).toBe(200);
    if ('queue' in result.body) {
      expect(result.body.queue).toBeNull();
    }
  });

  test('should log admin access', async () => {
    const req = createMockRequest();
    await handleGetMetrics(mockCtx, undefined, req, createMockReply());

    expect(mockCtx.log.info).toHaveBeenCalledWith(
      { adminId: 'admin-123' },
      'Admin retrieved metrics',
    );
  });
});
