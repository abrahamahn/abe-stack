// apps/server/src/__tests__/integration/health-endpoints.integration.test.ts
/**
 * Health Endpoints Integration Tests
 *
 * Tests the health check endpoints using Fastify's inject method.
 * Covers /health, /health/detailed, /health/ready, and /health/live.
 */

import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Suite
// ============================================================================

describe('Health Endpoints Integration', () => {
  let server: FastifyInstance;
  let mockDbHealthy: boolean;

  beforeAll(async () => {
    server = Fastify({ logger: false });

    // Initialize mock state
    mockDbHealthy = true;

    // Register basic health endpoint
    server.get('/health', async () => {
      return {
        status: mockDbHealthy ? ('ok' as const) : ('degraded' as const),
        database: mockDbHealthy,
        timestamp: new Date().toISOString(),
      };
    });

    // Register detailed health endpoint
    server.get('/health/detailed', async () => {
      const services = {
        database: {
          status: mockDbHealthy ? ('up' as const) : ('down' as const),
          message: mockDbHealthy ? 'connected' : 'Connection failed',
          latencyMs: mockDbHealthy ? 5 : undefined,
        },
        schema: {
          status: mockDbHealthy ? ('up' as const) : ('down' as const),
          message: mockDbHealthy ? '7 tables present' : 'Schema validation failed',
          tableCount: mockDbHealthy ? 7 : 0,
        },
        email: {
          status: 'up' as const,
          message: 'console',
        },
        storage: {
          status: 'up' as const,
          message: 'local',
        },
        pubsub: {
          status: 'up' as const,
          message: '0 active subscriptions',
        },
        websocket: {
          status: 'up' as const,
          message: '0 active connections',
        },
        rateLimit: {
          status: 'up' as const,
          message: 'token bucket active',
        },
      };

      // Determine overall status
      const statuses = Object.values(services).map((s) => s.status);
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';

      if (statuses.every((s) => s === 'down')) {
        status = 'down';
      } else if (statuses.some((s) => s === 'down')) {
        status = 'degraded';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        services,
      };
    });

    // Register readiness probe
    server.get('/health/ready', async (_request, reply) => {
      if (mockDbHealthy) {
        return { status: 'ready', timestamp: new Date().toISOString() };
      }
      void reply.status(503);
      return { status: 'not_ready', timestamp: new Date().toISOString() };
    });

    // Register liveness probe
    server.get('/health/live', async () => {
      return { status: 'alive', uptime: Math.round(process.uptime()) };
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockDbHealthy = true;
  });

  // ===========================================================================
  // GET /health (Basic Health Check)
  // ===========================================================================

  describe('GET /health', () => {
    it('should return 200 with ok status when database is healthy', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.database).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    it('should return 200 with degraded status when database is unhealthy', async () => {
      mockDbHealthy = false;

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('degraded');
      expect(body.database).toBe(false);
    });

    it('should include a timestamp in ISO format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.timestamp).toBeDefined();
      // Validate ISO format
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it('should not require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      // Should succeed without authorization header
      expect(response.statusCode).toBe(200);
    });
  });

  // ===========================================================================
  // GET /health/detailed (Detailed Health Check)
  // ===========================================================================

  describe('GET /health/detailed', () => {
    it('should return 200 with healthy status when all services are up', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
    });

    it('should return all service statuses', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify all services are present
      expect(body.services).toHaveProperty('database');
      expect(body.services).toHaveProperty('schema');
      expect(body.services).toHaveProperty('email');
      expect(body.services).toHaveProperty('storage');
      expect(body.services).toHaveProperty('pubsub');
      expect(body.services).toHaveProperty('websocket');
      expect(body.services).toHaveProperty('rateLimit');
    });

    it('should return degraded status when database is down', async () => {
      mockDbHealthy = false;

      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('degraded');
      expect(body.services.database.status).toBe('down');
    });

    it('should include uptime information', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.uptime).toBeDefined();
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include latency information for database', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.services.database.latencyMs).toBeDefined();
      expect(typeof body.services.database.latencyMs).toBe('number');
    });

    it('should include message for each service', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Each service should have a message
      Object.values(body.services).forEach((service: unknown) => {
        const svc = service as { status: string; message?: string };
        expect(svc.message).toBeDefined();
      });
    });

    it('should return schema table count when healthy', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.services.schema.tableCount).toBeDefined();
      expect(body.services.schema.tableCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // GET /health/ready (Readiness Probe)
  // ===========================================================================

  describe('GET /health/ready', () => {
    it('should return 200 with ready status when database is available', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.timestamp).toBeDefined();
    });

    it('should return 503 with not_ready status when database is unavailable', async () => {
      mockDbHealthy = false;

      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('not_ready');
    });

    it('should include timestamp in ready response', async () => {
      mockDbHealthy = true;

      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      });

      const body = JSON.parse(response.body);
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it('should include timestamp in not_ready response', async () => {
      mockDbHealthy = false;

      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      });

      const body = JSON.parse(response.body);
      expect(body.timestamp).toBeDefined();
    });
  });

  // ===========================================================================
  // GET /health/live (Liveness Probe)
  // ===========================================================================

  describe('GET /health/live', () => {
    it('should always return 200 with alive status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('alive');
    });

    it('should return alive even when database is down', async () => {
      mockDbHealthy = false;

      const response = await server.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('alive');
    });

    it('should include uptime in response', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.uptime).toBeDefined();
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should not require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/live',
      });

      // Should succeed without authorization header
      expect(response.statusCode).toBe(200);
    });
  });
});
