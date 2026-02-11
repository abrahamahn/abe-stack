// src/apps/server/src/__tests__/integration/health.integration.test.ts
/**
 * Health Endpoint Integration Tests
 *
 * Tests system health endpoints: /health, /health/live, /health/ready, /health/detailed.
 * Uses a bare Fastify instance with mock dependencies (no createTestServer to avoid
 * the built-in /health route conflict).
 */

import fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRouteMap } from '@abe-stack/server-engine';

import { systemRoutes } from '../../routes/system.routes';
import { createTest } from './test-utils';

import type { FastifyInstance } from 'fastify';

// Mock @abe-stack/websocket to avoid real WebSocket dependency
vi.mock('@abe-stack/websocket', () => ({
  getWebSocketStats: vi.fn().mockReturnValue({
    pluginRegistered: true,
    activeConnections: 0,
  }),
}));

// Mock @abe-stack/db for schema validation (used by checkSchemaStatus)
vi.mock('@abe-stack/db', () => ({
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
    const config = createTest();

    server = fastify({ logger: false });

    const ctx = {
      db: mockDb,
      pubsub: mockPubSub,
      config,
      log: mockLogger,
    };

    // System routes registered with empty prefix (no /api)
    registerRouteMap(server, ctx as never, systemRoutes, { prefix: '' });

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
});
