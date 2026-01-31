// apps/server/src/routes/system.handlers.test.ts
/**
 * System Handlers Unit Tests
 *
 * Tests for system route handlers including:
 * - Root and API info handlers
 * - Health check handlers (basic and detailed)
 * - System status and module listing
 * - Routes listing
 * - Liveness probes
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

// Use vi.hoisted to create mock function that survives hoisting
const { mockGetDetailedHealth } = vi.hoisted(() => ({
  mockGetDetailedHealth: vi.fn(),
}));

// Mock the infra module with the relative path that Vitest resolves
vi.mock('@health', () => ({
  getDetailedHealth: mockGetDetailedHealth,
}));

import {
  handleApiInfo,
  handleHealth,
  handleListModules,
  handleListRoutes,
  handleLive,
  handleRoot,
  handleSystemStatus,
} from './system.handlers';

import type { AppContext } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock AppContext with minimal required properties
 */
function createMockContext(overrides: Partial<AppContext> = {}): AppContext {
  return {
    db: {
      execute: vi.fn(),
      healthCheck: vi.fn(),
    },
    config: {
      billing: {
        enabled: true,
      },
      notifications: {
        enabled: true,
      },
      email: {
        provider: 'smtp',
      },
      storage: {
        provider: 'local',
      },
    },
    pubsub: {
      getSubscriptionCount: vi.fn().mockReturnValue(5),
    },
    log: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
    repos: {},
    email: {},
    storage: {},
    cache: {},
    billing: {},
    notifications: {},
    queue: {},
    write: {},
    search: {},
    ...overrides,
  } as unknown as AppContext;
}

/**
 * Create a mock FastifyRequest with minimal properties
 */
function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    log: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
    server: {
      printRoutes: vi.fn().mockReturnValue('Route tree output'),
    },
    ...overrides,
  } as unknown as FastifyRequest;
}

/**
 * Create a mock FastifyReply
 */
function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('System Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleRoot', () => {
    test('should return 200 with API message', async () => {
      const mockDate = new Date('2026-01-28T10:00:00.000Z');
      vi.setSystemTime(mockDate);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleRoot(ctx, {}, req, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'ABE Stack API',
        timestamp: '2026-01-28T10:00:00.000Z',
      });
    });

    test('should return current timestamp', async () => {
      const mockDate = new Date('2026-02-15T14:30:00.000Z');
      vi.setSystemTime(mockDate);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleRoot(ctx, {}, req, reply);

      expect(result.body.timestamp).toBe('2026-02-15T14:30:00.000Z');
    });

    test('should accept unknown data without errors', async () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleRoot(ctx, { unexpected: 'data' }, req, reply);

      expect(result.status).toBe(200);
    });
  });

  describe('handleApiInfo', () => {
    test('should return 200 with API info and version', async () => {
      const mockDate = new Date('2026-01-28T12:00:00.000Z');
      vi.setSystemTime(mockDate);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleApiInfo(ctx, {}, req, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        message: 'ABE Stack API is running',
        version: '1.0.0',
        timestamp: '2026-01-28T12:00:00.000Z',
      });
    });

    test('should include hardcoded version', async () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleApiInfo(ctx, {}, req, reply);

      expect(result.body.version).toBe('1.0.0');
    });
  });

  describe('handleHealth', () => {
    describe('Database Connectivity', () => {
      test('should return 200 when database is healthy', async () => {
        const mockDate = new Date('2026-01-28T10:00:00.000Z');
        vi.setSystemTime(mockDate);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleHealth(ctx, {}, req, reply);

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          status: 'ok',
          database: true,
          timestamp: '2026-01-28T10:00:00.000Z',
        });
        expect(ctx.db).toHaveProperty('execute');
        expect((ctx.db.execute as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
          {
            text: 'SELECT 1',
            values: [],
          },
        ]);
      });

      test('should return 503 when database check fails', async () => {
        const mockDate = new Date('2026-01-28T10:00:00.000Z');
        vi.setSystemTime(mockDate);

        const ctx = createMockContext({
          db: {
            execute: vi.fn().mockRejectedValue(new Error('Connection timeout')),
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleHealth(ctx, {}, req, reply);

        expect(result.status).toBe(503);
        expect(result.body).toEqual({
          status: 'degraded',
          database: false,
          timestamp: '2026-01-28T10:00:00.000Z',
        });
      });

      test('should log database errors', async () => {
        const error = new Error('Database connection lost');
        const ctx = createMockContext({
          db: {
            execute: vi.fn().mockRejectedValue(error),
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        await handleHealth(ctx, {}, req, reply);

        expect(req.log).toHaveProperty('error');
        expect((req.log.error as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
          { err: error },
          'Database health check failed',
        ]);
      });
    });

    describe('Edge Cases', () => {
      test('should handle database throwing non-Error objects', async () => {
        const ctx = createMockContext({
          db: {
            execute: vi.fn().mockRejectedValue('String error'),
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleHealth(ctx, {}, req, reply);

        expect(result.status).toBe(503);
        expect(result.body.database).toBe(false);
      });
    });
  });

  describe('handleSystemStatus', () => {
    describe('Healthy Status', () => {
      test('should return 200 when all services are up', async () => {
        const mockDetailedHealth = {
          status: 'healthy',
          timestamp: '2026-01-28T10:00:00.000Z',
          uptime: 3600,
          services: {
            database: { status: 'up', message: 'connected' },
            schema: { status: 'up', message: '10 tables present' },
            email: { status: 'up', message: 'smtp' },
            storage: { status: 'up', message: 'local' },
            pubsub: { status: 'up', message: '5 active subscriptions' },
            websocket: { status: 'up', message: '10 active connections' },
            rateLimit: { status: 'up', message: 'token bucket active' },
          },
        };

        mockGetDetailedHealth.mockResolvedValue(mockDetailedHealth);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleSystemStatus(ctx, {}, req, reply);

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockDetailedHealth);
        expect(mockGetDetailedHealth).toHaveBeenCalledWith(ctx);
      });
    });

    describe('Degraded Status', () => {
      test('should return 200 when system is degraded', async () => {
        const mockDetailedHealth = {
          status: 'degraded',
          timestamp: '2026-01-28T10:00:00.000Z',
          uptime: 3600,
          services: {
            database: { status: 'up', message: 'connected' },
            schema: { status: 'down', message: 'missing 2 tables' },
            email: { status: 'up', message: 'smtp' },
            storage: { status: 'up', message: 'local' },
            pubsub: { status: 'up', message: '0 active subscriptions' },
            websocket: { status: 'up', message: '0 active connections' },
            rateLimit: { status: 'up', message: 'token bucket active' },
          },
        };

        mockGetDetailedHealth.mockResolvedValue(mockDetailedHealth);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleSystemStatus(ctx, {}, req, reply);

        expect(result.status).toBe(200);
        expect(result.body.status).toBe('degraded');
      });
    });

    describe('Down Status', () => {
      test('should return 503 when system is down', async () => {
        const mockDetailedHealth = {
          status: 'down',
          timestamp: '2026-01-28T10:00:00.000Z',
          uptime: 3600,
          services: {
            database: { status: 'down', message: 'connection failed' },
            schema: { status: 'down', message: 'validation failed' },
            email: { status: 'up', message: 'smtp' },
            storage: { status: 'up', message: 'local' },
            pubsub: { status: 'up', message: '0 active subscriptions' },
            websocket: { status: 'down', message: 'plugin not registered' },
            rateLimit: { status: 'up', message: 'token bucket active' },
          },
        };

        mockGetDetailedHealth.mockResolvedValue(mockDetailedHealth);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleSystemStatus(ctx, {}, req, reply);

        expect(result.status).toBe(503);
        expect(result.body.status).toBe('down');
      });
    });
  });

  describe('handleListModules', () => {
    describe('Module Listing', () => {
      test('should return list of all modules with enabled status', async () => {
        const mockDate = new Date('2026-01-28T10:00:00.000Z');
        vi.setSystemTime(mockDate);

        const ctx = createMockContext({
          config: {
            billing: { enabled: true },
            notifications: { enabled: true },
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          modules: [
            { name: 'auth', enabled: true },
            { name: 'users', enabled: true },
            { name: 'admin', enabled: true },
            { name: 'billing', enabled: true },
            { name: 'notifications', enabled: true },
            { name: 'realtime', enabled: true },
            { name: 'system', enabled: true },
          ],
          count: 7,
          timestamp: '2026-01-28T10:00:00.000Z',
        });
      });

      test('should reflect disabled billing module', async () => {
        const ctx = createMockContext({
          config: {
            billing: { enabled: false },
            notifications: { enabled: true },
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        const billingModule = result.body.modules.find(
          (m: { name: string }) => m.name === 'billing',
        );
        expect(billingModule?.enabled).toBe(false);
      });

      test('should reflect disabled notifications module', async () => {
        const ctx = createMockContext({
          config: {
            billing: { enabled: true },
            notifications: { enabled: false },
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        const notificationsModule = result.body.modules.find(
          (m: { name: string }) => m.name === 'notifications',
        );
        expect(notificationsModule?.enabled).toBe(false);
      });

      test('should reflect both billing and notifications disabled', async () => {
        const ctx = createMockContext({
          config: {
            billing: { enabled: false },
            notifications: { enabled: false },
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        const billingModule = result.body.modules.find(
          (m: { name: string }) => m.name === 'billing',
        );
        const notificationsModule = result.body.modules.find(
          (m: { name: string }) => m.name === 'notifications',
        );

        expect(billingModule?.enabled).toBe(false);
        expect(notificationsModule?.enabled).toBe(false);
      });

      test('should always include core modules as enabled', async () => {
        const ctx = createMockContext({
          config: {
            billing: { enabled: false },
            notifications: { enabled: false },
          },
        });
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        const coreModules = ['auth', 'users', 'admin', 'realtime', 'system'];
        const modules = result.body.modules as Array<{ name: string; enabled: boolean }>;

        coreModules.forEach((moduleName) => {
          const module = modules.find((m) => m.name === moduleName);
          expect(module?.enabled).toBe(true);
        });
      });

      test('should return correct module count', async () => {
        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const result = await handleListModules(ctx, {}, req, reply);

        expect(result.body.count).toBe(7);
        expect(result.body.modules).toHaveLength(7);
      });
    });
  });

  describe('handleListRoutes', () => {
    test('should return routes from Fastify server', async () => {
      const mockDate = new Date('2026-01-28T10:00:00.000Z');
      vi.setSystemTime(mockDate);

      const mockRoutesOutput = `
└── / (GET)
    ├── api/ (GET)
    │   ├── health (GET)
    │   └── auth/
    │       └── login (POST)
`;
      const ctx = createMockContext();
      const req = createMockRequest({
        server: {
          printRoutes: vi.fn().mockReturnValue(mockRoutesOutput),
        },
      });
      const reply = createMockReply();

      const result = await handleListRoutes(ctx, {}, req, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        routes: mockRoutesOutput,
        timestamp: '2026-01-28T10:00:00.000Z',
      });
      expect(req.server).toHaveProperty('printRoutes');
      expect((req.server.printRoutes as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
        { commonPrefix: false },
      ]);
    });

    test('should call printRoutes with commonPrefix false', async () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      await handleListRoutes(ctx, {}, req, reply);

      expect(req.server).toHaveProperty('printRoutes');
      expect((req.server.printRoutes as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
        { commonPrefix: false },
      ]);
    });

    test('should handle empty route tree', async () => {
      const ctx = createMockContext();
      const req = createMockRequest({
        server: {
          printRoutes: vi.fn().mockReturnValue(''),
        },
      });
      const reply = createMockReply();

      const result = await handleListRoutes(ctx, {}, req, reply);

      expect(result.status).toBe(200);
      expect(result.body.routes).toBe('');
    });
  });

  describe('handleLive', () => {
    test('should return alive status with uptime', async () => {
      const mockUptime = 3661.5; // 1 hour, 1 minute, 1.5 seconds
      vi.spyOn(process, 'uptime').mockReturnValue(mockUptime);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleLive(ctx, {}, req, reply);

      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        status: 'alive',
        uptime: 3662, // Rounded to 3662 seconds
      });
    });

    test('should round uptime to nearest integer', async () => {
      vi.spyOn(process, 'uptime').mockReturnValue(123.7);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleLive(ctx, {}, req, reply);

      expect(result.body.uptime).toBe(124);
    });

    test('should handle zero uptime', async () => {
      vi.spyOn(process, 'uptime').mockReturnValue(0);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const result = await handleLive(ctx, {}, req, reply);

      expect(result.body.uptime).toBe(0);
    });

    test('should handle very large uptime values', async () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      // 30 days in seconds
      const thirtyDays = 30 * 24 * 60 * 60;
      vi.spyOn(process, 'uptime').mockReturnValue(thirtyDays);

      const result = await handleLive(ctx, {}, req, reply);

      expect(result.body.uptime).toBe(2592000);
      expect(result.body.status).toBe('alive');
    });
  });

  describe('Handler Consistency', () => {
    test('all handlers should return Promise<RouteResult>', async () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const handlers = [
        handleRoot(ctx, {}, req, reply),
        handleApiInfo(ctx, {}, req, reply),
        handleHealth(ctx, {}, req, reply),
        handleListModules(ctx, {}, req, reply),
        handleListRoutes(ctx, {}, req, reply),
        handleLive(ctx, {}, req, reply),
      ];

      const results = await Promise.all(handlers);

      results.forEach((result) => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('body');
        expect(typeof result.status).toBe('number');
        expect(result.body).toBeDefined();
      });
    });

    test('all handlers should include timestamps where applicable', async () => {
      const mockDate = new Date('2026-01-28T10:00:00.000Z');
      vi.setSystemTime(mockDate);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const handlers = [
        { name: 'handleRoot', result: await handleRoot(ctx, {}, req, reply) },
        { name: 'handleApiInfo', result: await handleApiInfo(ctx, {}, req, reply) },
        { name: 'handleHealth', result: await handleHealth(ctx, {}, req, reply) },
        { name: 'handleListModules', result: await handleListModules(ctx, {}, req, reply) },
        { name: 'handleListRoutes', result: await handleListRoutes(ctx, {}, req, reply) },
      ];

      handlers.forEach(({ result }) => {
        expect(result.body).toHaveProperty('timestamp');
        expect(result.body.timestamp).toBe('2026-01-28T10:00:00.000Z');
      });
    });
  });
});
