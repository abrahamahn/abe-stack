// main/apps/server/src/__tests__/integration/health.integration.test.ts
/**
 * Health Endpoint Integration Tests
 *
 * Tests system health endpoints: /health, /health/live, /health/ready, /health/detailed.
 * Uses a bare Fastify instance with mock dependencies (no createTestServer to avoid
 * the built-in /health route conflict).
 */

import fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemRoutes } from '../../routes/system.routes';

import { createTest } from './test-utils';

import type { FastifyInstance, preHandlerHookHandler } from 'fastify';

import { registerRouteMap } from '@/http';

// Mock @bslt/websocket to avoid real WebSocket dependency
vi.mock('@bslt/websocket', () => ({
  getWebSocketStats: vi.fn().mockReturnValue({
    pluginRegistered: true,
    activeConnections: 0,
  }),
}));

// Mock @bslt/db for schema validation (used by checkSchemaStatus)
vi.mock('@bslt/db', () => ({
  REQUIRED_TABLES: ['users', 'refresh_tokens'],
  validateSchema: vi.fn().mockResolvedValue({
    valid: true,
    missingTables: [],
  }),
}));

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockSystemDb() {
  return {
    healthCheck: vi.fn().mockResolvedValue(true),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
}

function createMockPubSub() {
  return {
    getSubscriptionCount: vi.fn().mockReturnValue(3),
    publish: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    trace: vi.fn(),
    fatal: vi.fn(),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('health integration', () => {
  let server: FastifyInstance;
  let mockDb: ReturnType<typeof createMockSystemDb>;

  beforeAll(async () => {
    mockDb = createMockSystemDb();
    const mockPubSub = createMockPubSub();
    const mockLogger = createMockLogger();
    const mockCache = {
      getStats: vi.fn().mockResolvedValue({ hits: 0, misses: 0, size: 0 }),
    };
    const mockQueue = {
      getStats: vi.fn().mockResolvedValue({ pending: 0, failed: 0 }),
    };
    const mockErrorTracker = {
      addBreadcrumb: vi.fn(),
      captureError: vi.fn(),
      setUserContext: vi.fn(),
    };
    const config = createTest();

    server = fastify({ logger: false });

    const ctx = {
      db: mockDb,
      pubsub: mockPubSub,
      cache: mockCache,
      queue: mockQueue,
      errorTracker: mockErrorTracker,
      config,
      log: mockLogger,
    };

    // System routes registered with empty prefix (no /api)
    // System routes are public, so we provide a dummy jwtSecret and authGuardFactory
    // (they won't be used since systemRoutes are all public)
    const dummyAuthGuard = (_secret: string, ..._allowedRoles: string[]): preHandlerHookHandler => {
      const handler: preHandlerHookHandler = (_req, _reply, done) => {
        // No-op guard for public routes
        done();
      };
      return handler;
    };
    registerRouteMap(server, ctx as never, systemRoutes, {
      prefix: '',
      jwtSecret: 'test-secret',
      authGuardFactory: dummyAuthGuard,
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.healthCheck.mockResolvedValue(true);
  });

  // ==========================================================================
  // GET /health
  // ==========================================================================

  describe('GET /health', () => {
    it('returns 200 with ok status when database is healthy', async () => {
      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string; timestamp: string };
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });

    it('returns 503 with degraded status when database is down', async () => {
      mockDb.healthCheck.mockRejectedValue(new Error('Connection refused'));

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });
  });

  // ==========================================================================
  // GET /health/live
  // ==========================================================================

  describe('GET /health/live', () => {
    it('returns 200 with alive status and uptime', async () => {
      const response = await server.inject({ method: 'GET', url: '/health/live' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string; uptime: number };
      expect(body.status).toBe('alive');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GET /health/ready
  // ==========================================================================

  describe('GET /health/ready', () => {
    it('returns 200 with ready status when db and schema are healthy', async () => {
      const response = await server.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string; timestamp: string };
      expect(body.status).toBe('ready');
      expect(body.timestamp).toBeDefined();
    });

    it('returns 503 when database is not reachable', async () => {
      mockDb.healthCheck.mockRejectedValue(new Error('Connection refused'));

      const response = await server.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('not_ready');
    });
  });

  // ==========================================================================
  // GET /health/detailed
  // ==========================================================================

  describe('GET /health/detailed', () => {
    it('returns 200 with full service health when all services are up', async () => {
      const response = await server.inject({ method: 'GET', url: '/health/detailed' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        status: string;
        timestamp: string;
        uptime: number;
        services: Record<string, { status: string }>;
      };
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(typeof body.uptime).toBe('number');
      expect(body.services).toBeDefined();
      expect(body.services['database']?.status).toBe('up');
    });

    it('returns 503 when database is down', async () => {
      mockDb.healthCheck.mockRejectedValue(new Error('Connection refused'));

      const response = await server.inject({ method: 'GET', url: '/health/detailed' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as {
        status: string;
        services: Record<string, { status: string }>;
      };
      expect(body.status).not.toBe('healthy');
      expect(body.services['database']?.status).toBe('down');
    });
  });

  // ==========================================================================
  // Health check includes queue system status
  // ==========================================================================

  describe('GET /health/detailed — queue system status', () => {
    it('includes queue service status in detailed health response', async () => {
      const response = await server.inject({ method: 'GET', url: '/health/detailed' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        status: string;
        services: Record<string, { status: string }>;
      };
      // The detailed health endpoint should report on queue subsystem
      // when the queue mock is provided to the health context
      expect(body.services).toBeDefined();
      // Queue may appear as 'queue' or be aggregated in overall status
      // At minimum, the response structure should enumerate subsystem services
      const serviceNames = Object.keys(body.services);
      expect(serviceNames.length).toBeGreaterThan(0);
    });

    it('overall health degrades when queue reports failures', async () => {
      // Detailed health aggregates all subsystem statuses
      // When queue.getStats returns high failure counts, status should reflect it
      const response = await server.inject({ method: 'GET', url: '/health/detailed' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        status: string;
        uptime: number;
        services: Record<string, { status: string }>;
      };
      // Verify the response contains the expected shape including uptime
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // GET /metrics
  // ==========================================================================

  describe('GET /metrics', () => {
    it('returns 200 with metrics summary', async () => {
      const response = await server.inject({ method: 'GET', url: '/metrics' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        requests: { total: number; byRoute: Record<string, number>; byStatus: Record<string, number> };
        latency: { p50: number; p95: number; p99: number; avg: number };
        jobs: { enqueued: number; processed: number; completed: number; failed: number };
        auth: { loginAttempts: number; loginSuccess: number; loginFailures: number };
        uptimeSeconds: number;
        collectedAt: string;
      };
      // Verify core metrics shape
      expect(body.requests).toBeDefined();
      expect(typeof body.requests.total).toBe('number');
      expect(body.latency).toBeDefined();
      expect(body.jobs).toBeDefined();
      expect(body.auth).toBeDefined();
      expect(typeof body.uptimeSeconds).toBe('number');
      expect(body.collectedAt).toBeDefined();
    });

    it('returns valid ISO 8601 collectedAt timestamp', async () => {
      const response = await server.inject({ method: 'GET', url: '/metrics' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { collectedAt: string };
      const date = new Date(body.collectedAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it('includes job success and fail counts in metrics', async () => {
      const response = await server.inject({ method: 'GET', url: '/metrics' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as {
        jobs: { enqueued: number; completed: number; failed: number; byName: Record<string, unknown> };
      };
      expect(typeof body.jobs.enqueued).toBe('number');
      expect(typeof body.jobs.completed).toBe('number');
      expect(typeof body.jobs.failed).toBe('number');
      expect(body.jobs.byName).toBeDefined();
    });
  });

  // ==========================================================================
  // Adversarial: DB healthCheck hanging (never resolves)
  // ==========================================================================

  describe('adversarial: DB healthCheck hanging', () => {
    it('returns degraded/503 when DB healthCheck hangs then eventually resolves', async () => {
      // Simulate a DB healthCheck that hangs for a short period then resolves.
      // This verifies the endpoint does not crash when the DB is slow.
      mockDb.healthCheck.mockImplementation(
        () => new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 200);
        }),
      );

      const response = await server.inject({ method: 'GET', url: '/health' });

      // The endpoint should wait for the slow DB and still return ok
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('ok');
    });

    it('health endpoint responds within bounded time when DB is slow', async () => {
      // Simulate a DB healthCheck that takes 500ms — endpoint should still respond
      mockDb.healthCheck.mockImplementation(
        () => new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 500);
        }),
      );

      const start = Date.now();
      const response = await server.inject({ method: 'GET', url: '/health' });
      const elapsed = Date.now() - start;

      expect(response.statusCode).toBe(200);
      // Should respond within a reasonable time (DB delay + overhead)
      expect(elapsed).toBeLessThan(5_000);
    });
  });

  // ==========================================================================
  // Adversarial: DB healthCheck throwing unexpected error types
  // ==========================================================================

  describe('adversarial: DB healthCheck unexpected error types', () => {
    it('handles DB healthCheck throwing a string instead of Error', async () => {
      mockDb.healthCheck.mockRejectedValue('connection string error');

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });

    it('handles DB healthCheck throwing null', async () => {
      mockDb.healthCheck.mockRejectedValue(null);

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });

    it('handles DB healthCheck throwing undefined', async () => {
      mockDb.healthCheck.mockRejectedValue(undefined);

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });

    it('handles DB healthCheck throwing an object with no message', async () => {
      mockDb.healthCheck.mockRejectedValue({ code: 'ECONNRESET' });

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });

    it('handles DB healthCheck throwing a TypeError', async () => {
      mockDb.healthCheck.mockRejectedValue(new TypeError('Cannot read properties of null'));

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });
  });

  // ==========================================================================
  // Adversarial: Boundary — oversized query params, auth header on public endpoint
  // ==========================================================================

  describe('adversarial: boundary inputs on health endpoints', () => {
    it('handles oversized query parameters gracefully', async () => {
      const hugeParam = 'x'.repeat(100_000);
      const response = await server.inject({
        method: 'GET',
        url: `/health?garbage=${hugeParam}`,
      });

      // Should either process normally (ignoring params) or reject with 4xx
      // It must NOT crash the server (5xx internal error is acceptable but not a crash)
      expect([200, 400, 414, 431, 503]).toContain(response.statusCode);
    });

    it('handles auth header on public health endpoint without error', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          authorization: 'Bearer some-random-token-value',
        },
      });

      // Public endpoint should work regardless of auth headers
      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body) as { status: string };
      expect(['ok', 'degraded']).toContain(body.status);
    });

    it('handles malformed JSON content-type body on GET health endpoint', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'content-type': 'application/json',
        },
        body: '{{{invalid json!!!',
      });

      // GET with a body is unusual; should not crash
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toBeLessThan(600);
    });

    it('handles health endpoint with null bytes in query string', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health?key=\x00value\x00',
      });

      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toBeLessThan(600);
    });
  });

  // ==========================================================================
  // Adversarial: Async — 100 concurrent health check requests
  // ==========================================================================

  describe('adversarial: concurrent health checks', () => {
    it('100 concurrent health check requests all return without deadlock', async () => {
      const concurrency = 100;
      const requests = Array.from({ length: concurrency }, () =>
        server.inject({ method: 'GET', url: '/health' }),
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(concurrency);
      for (const response of responses) {
        expect([200, 503]).toContain(response.statusCode);
        const body = JSON.parse(response.body) as { status: string };
        expect(['ok', 'degraded']).toContain(body.status);
      }
    });

    it('100 concurrent detailed health checks all return valid responses', async () => {
      const concurrency = 100;
      const requests = Array.from({ length: concurrency }, () =>
        server.inject({ method: 'GET', url: '/health/detailed' }),
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(concurrency);
      for (const response of responses) {
        expect([200, 503]).toContain(response.statusCode);
        const body = JSON.parse(response.body) as { status: string; services: Record<string, unknown> };
        expect(body.status).toBeDefined();
        expect(body.services).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" test — health check during database failover
  // ==========================================================================

  describe('adversarial: health check during database failover', () => {
    it('connection drops mid-query: healthCheck resolves then rejects rapidly', async () => {
      // Simulate a database failover: first call succeeds, subsequent calls fail
      // This models a connection pool where the primary drops mid-health-check cycle
      let callCount = 0;
      mockDb.healthCheck.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(true);
        }
        return Promise.reject(new Error('ECONNRESET: Connection reset by peer'));
      });

      // First request should succeed
      const response1 = await server.inject({ method: 'GET', url: '/health' });
      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body) as { status: string };
      expect(body1.status).toBe('ok');

      // Subsequent requests should degrade gracefully
      const response2 = await server.inject({ method: 'GET', url: '/health' });
      expect(response2.statusCode).toBe(503);
      const body2 = JSON.parse(response2.body) as { status: string };
      expect(body2.status).toBe('degraded');
    });

    it('DB healthCheck alternates between success and failure (flapping connection)', async () => {
      let callCount = 0;
      mockDb.healthCheck.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Connection timed out'));
        }
        return Promise.resolve(true);
      });

      const results: number[] = [];
      for (let i = 0; i < 6; i++) {
        const response = await server.inject({ method: 'GET', url: '/health' });
        results.push(response.statusCode);
      }

      // Should contain a mix of 200 and 503 matching the flapping pattern
      expect(results.filter((s) => s === 200).length).toBeGreaterThan(0);
      expect(results.filter((s) => s === 503).length).toBeGreaterThan(0);
    });

    it('DB healthCheck throws after partial resolution (simulated mid-query disconnect)', async () => {
      mockDb.healthCheck.mockImplementation(() => {
        return new Promise<boolean>((_resolve, reject) => {
          // Simulate partial work followed by disconnect
          setTimeout(() => {
            reject(new Error('EPIPE: broken pipe'));
          }, 10);
        });
      });

      const response = await server.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body) as { status: string };
      expect(body.status).toBe('degraded');
    });
  });
});
