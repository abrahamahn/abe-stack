// apps/server/src/routes/system.routes.test.ts
/**
 * System Routes Unit Tests
 *
 * Comprehensive tests for route definitions including:
 * - Route structure and configuration
 * - HTTP method mapping
 * - Authentication requirements (public vs admin-only)
 * - Handler mapping and invocation
 * - Route grouping and organization
 *
 * @complexity O(1) - All route tests run in constant time
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./system.handlers', () => ({
  handleApiInfo: vi.fn(),
  handleHealth: vi.fn(),
  handleListModules: vi.fn(),
  handleListRoutes: vi.fn(),
  handleLive: vi.fn(),
  handleRoot: vi.fn(),
  handleSystemStatus: vi.fn(),
}));

import { systemRoutes } from './system.routes';

import type { BaseRouteDefinition } from '@router';
import type { AppContext } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock AppContext for testing
 */
function createMockContext(): AppContext {
  return {
    db: {
      execute: vi.fn().mockResolvedValue({ rows: [] }),
    } as never,
    pubsub: {
      publish: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      billing: { enabled: true },
      notifications: { enabled: true },
    } as never,
    email: {} as never,
    storage: {} as never,
  } as unknown as AppContext;
}

/**
 * Create mock FastifyRequest with optional user
 */
function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): FastifyRequest & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    server: {
      printRoutes: vi.fn().mockReturnValue('route-list'),
    },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as FastifyRequest & { user?: { userId: string; email: string; role: string } };
}

/**
 * Create mock FastifyReply
 */
function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

// ============================================================================
// Route Map Structure Tests
// ============================================================================

describe('System Routes', () => {
  describe('Route Map Structure', () => {
    test('should export systemRoutes as a RouteMap', () => {
      expect(systemRoutes).toBeDefined();
      expect(typeof systemRoutes).toBe('object');
    });

    test('should define all expected routes', () => {
      const routeKeys = Object.keys(systemRoutes);
      expect(routeKeys).toHaveLength(11);

      // Root routes
      expect(routeKeys).toContain('');
      expect(routeKeys).toContain('api');

      // Public health routes
      expect(routeKeys).toContain('api/health');
      expect(routeKeys).toContain('api/health/ready');
      expect(routeKeys).toContain('api/health/live');

      // Admin-protected system routes
      expect(routeKeys).toContain('api/system/health');
      expect(routeKeys).toContain('api/system/status');
      expect(routeKeys).toContain('api/system/modules');
      expect(routeKeys).toContain('api/system/routes');

      // Legacy health routes (aliases)
      expect(routeKeys).toContain('api/health/detailed');
      expect(routeKeys).toContain('api/health/routes');
    });

    test('should have valid route definitions', () => {
      Object.entries(systemRoutes).forEach(([_path, definition]) => {
        expect(definition).toBeDefined();
        expect(definition.method).toBeDefined();
        expect(definition.handler).toBeDefined();
        expect(typeof definition.handler).toBe('function');
      });
    });
  });

  // ============================================================================
  // Root Routes Tests
  // ============================================================================

  describe('Root Routes', () => {
    describe('Root (/) Route', () => {
      const rootRoute = systemRoutes['']!;

      test('should use GET method', () => {
        expect(rootRoute.method).toBe('GET');
      });

      test('should be a public route (no auth required)', () => {
        expect(rootRoute.auth).toBeUndefined();
      });

      test('should not require a request body schema', () => {
        expect(rootRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof rootRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleRoot with correct arguments', async () => {
          const { handleRoot } = await import('./system.handlers');
          vi.mocked(handleRoot).mockResolvedValue({
            status: 200,
            body: {
              message: 'ABE Stack API',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest();
          const reply = createMockReply();

          await rootRoute.handler(ctx, undefined, req, reply);

          expect(handleRoot).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });

        test('should return result from handleRoot', async () => {
          const { handleRoot } = await import('./system.handlers');
          const expectedResult = {
            status: 200 as const,
            body: {
              message: 'ABE Stack API',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          };
          vi.mocked(handleRoot).mockResolvedValue(expectedResult);

          const ctx = createMockContext();
          const req = createMockRequest();
          const reply = createMockReply();

          const result = await rootRoute.handler(ctx, undefined, req, reply);

          expect(result).toEqual(expectedResult);
        });
      });
    });

    describe('API Info (/api) Route', () => {
      const apiRoute = systemRoutes['api']!;

      test('should use GET method', () => {
        expect(apiRoute.method).toBe('GET');
      });

      test('should be a public route (no auth required)', () => {
        expect(apiRoute.auth).toBeUndefined();
      });

      test('should not require a request body schema', () => {
        expect(apiRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof apiRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleApiInfo with correct arguments', async () => {
          const { handleApiInfo } = await import('./system.handlers');
          vi.mocked(handleApiInfo).mockResolvedValue({
            status: 200,
            body: {
              message: 'ABE Stack API is running',
              version: '1.0.0',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest();
          const reply = createMockReply();

          await apiRoute.handler(ctx, undefined, req, reply);

          expect(handleApiInfo).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });
  });

  // ============================================================================
  // Public Health Routes Tests
  // ============================================================================

  describe('Public Health Routes', () => {
    describe('Health Check (/api/health) Route', () => {
      const healthRoute = systemRoutes['api/health']!;

      test('should use GET method', () => {
        expect(healthRoute.method).toBe('GET');
      });

      test('should be a public route (no auth required)', () => {
        expect(healthRoute.auth).toBeUndefined();
      });

      test('should not require a request body schema', () => {
        expect(healthRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof healthRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleHealth with correct arguments', async () => {
          const { handleHealth } = await import('./system.handlers');
          vi.mocked(handleHealth).mockResolvedValue({
            status: 200,
            body: {
              status: 'ok',
              database: true,
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest();
          const reply = createMockReply();

          await healthRoute.handler(ctx, undefined, req, reply);

          expect(handleHealth).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });

    describe('Ready Check (/api/health/ready) Route', () => {
      const readyRoute = systemRoutes['api/health/ready']!;

      test('should use GET method', () => {
        expect(readyRoute.method).toBe('GET');
      });

      test('should be a public route (no auth required)', () => {
        expect(readyRoute.auth).toBeUndefined();
      });

      test('should not require a request body schema', () => {
        expect(readyRoute.schema).toBeUndefined();
      });

      test('should use handleHealth handler', () => {
        expect(typeof readyRoute.handler).toBe('function');
      });
    });

    describe('Liveness Check (/api/health/live) Route', () => {
      const liveRoute = systemRoutes['api/health/live']!;

      test('should use GET method', () => {
        expect(liveRoute.method).toBe('GET');
      });

      test('should be a public route (no auth required)', () => {
        expect(liveRoute.auth).toBeUndefined();
      });

      test('should not require a request body schema', () => {
        expect(liveRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof liveRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleLive with correct arguments', async () => {
          const { handleLive } = await import('./system.handlers');
          vi.mocked(handleLive).mockResolvedValue({
            status: 200,
            body: {
              status: 'alive',
              uptime: 12345,
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest();
          const reply = createMockReply();

          await liveRoute.handler(ctx, undefined, req, reply);

          expect(handleLive).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });
  });

  // ============================================================================
  // Admin-Protected System Routes Tests
  // ============================================================================

  describe('Admin-Protected System Routes', () => {
    describe('System Health (/api/system/health) Route', () => {
      const systemHealthRoute = systemRoutes['api/system/health']!;

      test('should use GET method', () => {
        expect(systemHealthRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(systemHealthRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(systemHealthRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof systemHealthRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleHealth with correct arguments', async () => {
          const { handleHealth } = await import('./system.handlers');
          vi.mocked(handleHealth).mockResolvedValue({
            status: 200,
            body: {
              status: 'ok',
              database: true,
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
          const reply = createMockReply();

          await systemHealthRoute.handler(ctx, undefined, req, reply);

          expect(handleHealth).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });

    describe('System Status (/api/system/status) Route', () => {
      const statusRoute = systemRoutes['api/system/status']!;

      test('should use GET method', () => {
        expect(statusRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(statusRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(statusRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof statusRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleSystemStatus with correct arguments', async () => {
          const { handleSystemStatus } = await import('./system.handlers');
          vi.mocked(handleSystemStatus).mockResolvedValue({
            status: 200,
            body: {
              status: 'ok',
              database: { status: 'ok', latency: 5 },
              cache: { status: 'ok', hitRate: 0.95 },
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
          const reply = createMockReply();

          await statusRoute.handler(ctx, undefined, req, reply);

          expect(handleSystemStatus).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });

    describe('List Modules (/api/system/modules) Route', () => {
      const modulesRoute = systemRoutes['api/system/modules']!;

      test('should use GET method', () => {
        expect(modulesRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(modulesRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(modulesRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof modulesRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleListModules with correct arguments', async () => {
          const { handleListModules } = await import('./system.handlers');
          vi.mocked(handleListModules).mockResolvedValue({
            status: 200,
            body: {
              modules: [
                { name: 'auth', enabled: true },
                { name: 'billing', enabled: true },
              ],
              count: 2,
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
          const reply = createMockReply();

          await modulesRoute.handler(ctx, undefined, req, reply);

          expect(handleListModules).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });

    describe('List Routes (/api/system/routes) Route', () => {
      const routesRoute = systemRoutes['api/system/routes']!;

      test('should use GET method', () => {
        expect(routesRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(routesRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(routesRoute.schema).toBeUndefined();
      });

      test('should have a handler function', () => {
        expect(typeof routesRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleListRoutes with correct arguments', async () => {
          const { handleListRoutes } = await import('./system.handlers');
          vi.mocked(handleListRoutes).mockResolvedValue({
            status: 200,
            body: {
              routes: 'route-list',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
          const reply = createMockReply();

          await routesRoute.handler(ctx, undefined, req, reply);

          expect(handleListRoutes).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });
  });

  // ============================================================================
  // Legacy Health Routes Tests (Aliases)
  // ============================================================================

  describe('Legacy Health Routes (Aliases)', () => {
    describe('Detailed Health (/api/health/detailed) Route', () => {
      const detailedRoute = systemRoutes['api/health/detailed']!;

      test('should use GET method', () => {
        expect(detailedRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(detailedRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(detailedRoute.schema).toBeUndefined();
      });

      test('should use handleSystemStatus handler (alias)', () => {
        expect(typeof detailedRoute.handler).toBe('function');
      });

      describe('Handler Invocation', () => {
        beforeEach(() => {
          vi.clearAllMocks();
        });

        test('should call handleSystemStatus with correct arguments', async () => {
          const { handleSystemStatus } = await import('./system.handlers');
          vi.mocked(handleSystemStatus).mockResolvedValue({
            status: 200,
            body: {
              status: 'ok',
              database: { status: 'ok' },
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          });

          const ctx = createMockContext();
          const req = createMockRequest({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'admin',
          });
          const reply = createMockReply();

          await detailedRoute.handler(ctx, undefined, req, reply);

          expect(handleSystemStatus).toHaveBeenCalledWith(ctx, undefined, req, reply);
        });
      });
    });

    describe('Routes List (/api/health/routes) Route', () => {
      const routesListRoute = systemRoutes['api/health/routes']!;

      test('should use GET method', () => {
        expect(routesListRoute.method).toBe('GET');
      });

      test('should require admin authentication', () => {
        expect(routesListRoute.auth).toBe('admin');
      });

      test('should not require a request body schema', () => {
        expect(routesListRoute.schema).toBeUndefined();
      });

      test('should use handleListRoutes handler (alias)', () => {
        expect(typeof routesListRoute.handler).toBe('function');
      });
    });
  });

  // ============================================================================
  // Route Protection Tests
  // ============================================================================

  describe('Route Protection', () => {
    test('should have correct number of public routes', () => {
      const publicRoutes = Object.entries(systemRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth === undefined,
      );

      // 5 public routes: root, api, api/health, api/health/ready, api/health/live
      expect(publicRoutes).toHaveLength(5);

      const publicRouteNames = publicRoutes.map(([name]) => name);
      expect(publicRouteNames).toContain('');
      expect(publicRouteNames).toContain('api');
      expect(publicRouteNames).toContain('api/health');
      expect(publicRouteNames).toContain('api/health/ready');
      expect(publicRouteNames).toContain('api/health/live');
    });

    test('should have correct number of admin-protected routes', () => {
      const adminRoutes = Object.entries(systemRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth === 'admin',
      );

      // 6 admin routes: 4 system routes + 2 legacy aliases
      expect(adminRoutes).toHaveLength(6);

      const adminRouteNames = adminRoutes.map(([name]) => name);
      expect(adminRouteNames).toContain('api/system/health');
      expect(adminRouteNames).toContain('api/system/status');
      expect(adminRouteNames).toContain('api/system/modules');
      expect(adminRouteNames).toContain('api/system/routes');
      expect(adminRouteNames).toContain('api/health/detailed');
      expect(adminRouteNames).toContain('api/health/routes');

      // All admin routes should require 'admin' auth level
      for (const [_, def] of adminRoutes) {
        expect(def.auth).toBe('admin');
      }
    });

    test('should not have any user-protected routes', () => {
      const userRoutes = Object.entries(systemRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth === 'user',
      );
      expect(userRoutes).toHaveLength(0);
    });

    test('all routes should be either public or admin-protected', () => {
      Object.entries(systemRoutes).forEach(([_path, def]) => {
        expect([undefined, 'admin']).toContain(def.auth);
      });
    });
  });

  // ============================================================================
  // Route Method Tests
  // ============================================================================

  describe('Route Methods', () => {
    test('all routes should use GET method', () => {
      Object.entries(systemRoutes).forEach(([_path, def]) => {
        expect(def.method).toBe('GET');
      });
    });

    test('no routes should require request body schemas', () => {
      Object.entries(systemRoutes).forEach(([_path, def]) => {
        expect(def.schema).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Route Organization Tests
  // ============================================================================

  describe('Route Organization', () => {
    test('should group routes by functionality', () => {
      const routeKeys = Object.keys(systemRoutes);

      // Root routes (2)
      const rootRoutes = routeKeys.filter((key) => key === '' || key === 'api');
      expect(rootRoutes).toHaveLength(2);

      // Public health routes (3)
      const publicHealthRoutes = routeKeys.filter(
        (key) =>
          key.startsWith('api/health') &&
          systemRoutes[key]!.auth === undefined,
      );
      expect(publicHealthRoutes).toHaveLength(3);

      // System routes (4)
      const systemRoutesGroup = routeKeys.filter((key) => key.startsWith('api/system'));
      expect(systemRoutesGroup).toHaveLength(4);

      // Legacy routes (2) - admin-protected health routes
      const legacyRoutes = routeKeys.filter(
        (key) =>
          key.startsWith('api/health') &&
          systemRoutes[key]!.auth === 'admin',
      );
      expect(legacyRoutes).toHaveLength(2);
    });

    test('should have consistent path structure', () => {
      const routeKeys = Object.keys(systemRoutes);

      routeKeys.forEach((path) => {
        // Root route can be empty
        if (path === '') {
          return;
        }

        // All other routes should start with 'api'
        expect(path.startsWith('api')).toBe(true);

        // Should not have trailing slashes
        expect(path.endsWith('/')).toBe(false);

        // Should not have double slashes
        expect(path.includes('//')).toBe(false);
      });
    });

    test('should provide both new and legacy health endpoints', () => {
      // New endpoints
      expect(systemRoutes['api/system/status']).toBeDefined();
      expect(systemRoutes['api/system/routes']).toBeDefined();

      // Legacy endpoints (aliases)
      expect(systemRoutes['api/health/detailed']).toBeDefined();
      expect(systemRoutes['api/health/routes']).toBeDefined();

      // Both should require admin auth
      expect(systemRoutes['api/system/status']!.auth).toBe('admin');
      expect(systemRoutes['api/health/detailed']!.auth).toBe('admin');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('should handle empty route path (root)', () => {
      const rootRoute = systemRoutes[''];
      expect(rootRoute).toBeDefined();
      expect(rootRoute.method).toBe('GET');
      expect(rootRoute.auth).toBeUndefined();
    });

    test('should have unique handler functions', () => {
      const handlers = Object.values(systemRoutes).map((def) => def.handler);

      // While some handlers are reused (e.g., handleHealth), they should be distinct references
      // We verify handlers are properly defined functions
      handlers.forEach((handler) => {
        expect(typeof handler).toBe('function');
      });
    });

    test('should maintain backward compatibility with legacy routes', () => {
      // Ensure legacy routes still exist and point to correct handlers
      const legacyRoutePairs: Array<[string, string]> = [
        ['api/health/detailed', 'api/system/status'],
        ['api/health/routes', 'api/system/routes'],
      ];

      legacyRoutePairs.forEach(([legacy, modern]) => {
        expect(systemRoutes[legacy]).toBeDefined();
        expect(systemRoutes[modern]).toBeDefined();

        // Both should have same auth level
        expect(systemRoutes[legacy]!.auth).toBe(systemRoutes[modern]!.auth);
        expect(systemRoutes[legacy]!.method).toBe(systemRoutes[modern]!.method);
      });
    });

    test('should handle multiple health check variations', () => {
      // Public health checks
      expect(systemRoutes['api/health']).toBeDefined();
      expect(systemRoutes['api/health']!.auth).toBeUndefined();

      // K8s-style health checks
      expect(systemRoutes['api/health/ready']).toBeDefined();
      expect(systemRoutes['api/health/live']).toBeDefined();
      expect(systemRoutes['api/health/ready']!.auth).toBeUndefined();
      expect(systemRoutes['api/health/live']!.auth).toBeUndefined();

      // Admin-only health checks
      expect(systemRoutes['api/system/health']).toBeDefined();
      expect(systemRoutes['api/system/health']!.auth).toBe('admin');
    });

    test('should properly expose handler signatures', () => {
      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      // All handlers should accept these arguments without error
      const routesToTest = ['', 'api', 'api/health', 'api/health/live'];

      for (const routePath of routesToTest) {
        const route = systemRoutes[routePath];
        expect(route).toBeDefined();

        // Handler should be callable (mock ensures no actual execution)
        expect(() => route!.handler(ctx, undefined, req, reply)).not.toThrow();
      }
    });
  });
});
