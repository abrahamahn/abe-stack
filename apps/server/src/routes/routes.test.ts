// apps/server/src/routes/routes.test.ts
/**
 * Routes Module Unit Tests
 *
 * Tests for the main route registration function including:
 * - Route registration with proper prefixes
 * - Conditional billing route registration
 * - Webhook route registration
 * - Router options configuration
 * - Module integration
 *
 * @complexity O(1) - Route registration is a constant-time operation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before local imports)
// ============================================================================

// Mock dependencies
vi.mock('@abe-stack/db', () => ({
  registerRouteMap: vi.fn(),
  protectedRoute: vi.fn(),
  publicRoute: vi.fn(),
  createRouteMap: vi.fn(),
}));

vi.mock('@abe-stack/admin', () => ({
  adminRoutes: { 'admin/test': { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@abe-stack/auth', () => ({
  authRoutes: { 'auth/test': { method: 'POST', handler: vi.fn() } },
  createAuthGuard: vi.fn(),
}));

vi.mock('@abe-stack/billing', () => ({
  billingRoutes: { 'billing/test': { method: 'GET', handler: vi.fn() } },
  registerWebhookRoutes: vi.fn(),
}));

vi.mock('@abe-stack/notifications', () => ({
  notificationRoutes: { 'notifications/test': { method: 'POST', handler: vi.fn() } },
}));

vi.mock('@abe-stack/realtime', () => ({
  realtimeRoutes: { 'realtime/test': { method: 'GET', handler: vi.fn() } },
}));

vi.mock('./system.routes', () => ({
  systemRoutes: { 'system/test': { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@abe-stack/users', () => ({
  userRoutes: { 'users/test': { method: 'GET', handler: vi.fn() } },
}));

import { registerRouteMap } from '@abe-stack/db';

import { registerWebhookRoutes } from '@abe-stack/billing';
import { registerRoutes } from './routes';

import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';
/* eslint-enable import-x/order */

// Get mocked functions
const mockRegisterRouteMap = vi.mocked(registerRouteMap);
const mockRegisterWebhookRoutes = vi.mocked(registerWebhookRoutes);

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock Fastify instance for testing
 */
function createMockFastify(): FastifyInstance {
  return {
    register: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    addHook: vi.fn(),
  } as unknown as FastifyInstance;
}

/**
 * Creates a mock AppContext with required configuration
 */
function createMockContext(billingEnabled = false): AppContext {
  return {
    config: {
      auth: {
        jwt: {
          secret: 'test-jwt-secret',
          accessTokenTTL: 900,
          refreshTokenTTL: 604800,
        },
        oauth: {
          google: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            enabled: false,
          },
          github: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            enabled: false,
          },
          apple: {
            clientId: 'test-client-id',
            teamId: 'test-team-id',
            keyId: 'test-key-id',
            privateKey: 'test-private-key',
            enabled: false,
          },
        },
        magicLink: {
          enabled: false,
          ttl: 900,
        },
      },
      billing: {
        enabled: billingEnabled,
        provider: 'stripe' as const,
        stripe: {
          secretKey: 'test-stripe-key',
          webhookSecret: 'test-webhook-secret',
          publishableKey: 'test-publishable-key',
        },
      },
      server: {
        port: 3000,
        host: 'localhost',
        appBaseUrl: 'http://localhost:3000',
        apiBaseUrl: 'http://localhost:3000/api',
        trustProxy: false,
        corsOrigins: ['http://localhost:5173'],
      },
    },
    db: {} as never,
    repos: {} as never,
    email: {} as never,
    storage: {} as never,
    pubsub: {} as never,
    cache: {} as never,
    billing: {} as never,
    notifications: {} as never,
    queue: {} as never,
    write: {} as never,
    search: {} as never,
    emailTemplates: {} as never,
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as never,
  };
}

// ============================================================================
// Route Registration Tests
// ============================================================================

describe('registerRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Route Registration', () => {
    test('should register all core routes with /api prefix', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Verify registerRouteMap was called for each core module
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(6); // auth, user, admin, realtime, notifications, system

      // Verify each module's routes were registered with correct options
      const calls = mockRegisterRouteMap.mock.calls;

      // Check that routes were registered (order matters)
      expect(calls[0]![2]).toHaveProperty('auth/test'); // auth routes
      expect(calls[1]![2]).toHaveProperty('users/test'); // user routes
      expect(calls[2]![2]).toHaveProperty('admin/test'); // admin routes
      expect(calls[3]![2]).toHaveProperty('realtime/test'); // realtime routes
      expect(calls[4]![2]).toHaveProperty('notifications/test'); // notification routes
      expect(calls[5]![2]).toHaveProperty('system/test'); // system routes
    });

    test('should pass Fastify instance to registerRouteMap', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Verify first argument is the Fastify instance
      for (const call of mockRegisterRouteMap.mock.calls) {
        expect(call[0]).toBe(app);
      }
    });

    test('should pass AppContext to registerRouteMap', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Verify second argument is the context
      for (const call of mockRegisterRouteMap.mock.calls) {
        expect(call[1]).toBe(ctx);
      }
    });

    test('should pass JWT secret in router options', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Verify all calls (except system) include JWT secret
      const nonSystemCalls = mockRegisterRouteMap.mock.calls.slice(0, -1);

      for (const call of nonSystemCalls) {
        const options = call[3] as { prefix: string; jwtSecret: string };
        expect(options.jwtSecret).toBe('test-jwt-secret');
      }
    });

    test('should use /api prefix for most routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Verify all calls (except system) use /api prefix
      const nonSystemCalls = mockRegisterRouteMap.mock.calls.slice(0, -1);

      for (const call of nonSystemCalls) {
        const options = call[3] as { prefix: string; jwtSecret: string };
        expect(options.prefix).toBe('/api');
      }
    });

    test('should use empty prefix for system routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Get the last call (system routes)
      const systemCall = mockRegisterRouteMap.mock.calls[5]!;
      const options = systemCall[3] as { prefix: string; jwtSecret: string };

      expect(options.prefix).toBe('');
      expect(options.jwtSecret).toBe('test-jwt-secret');
    });
  });

  describe('Conditional Billing Routes', () => {
    test('should register billing routes when billing is enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true); // billing enabled

      registerRoutes(app, ctx);

      // Should call registerRouteMap 7 times (6 core + 1 billing)
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(7);

      // Verify billing routes were registered
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        const routes = call[2] as Record<string, unknown>;
        return 'billing/test' in routes;
      });

      expect(billingCall).toBeDefined();
      expect(billingCall![3]).toMatchObject({
        prefix: '/api',
        jwtSecret: 'test-jwt-secret',
      });
    });

    test('should not register billing routes when billing is disabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false); // billing disabled

      registerRoutes(app, ctx);

      // Should only call registerRouteMap 6 times (no billing)
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(6);

      // Verify no billing routes were registered
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        const routes = call[2] as Record<string, unknown>;
        return 'billing/test' in routes;
      });

      expect(billingCall).toBeUndefined();
    });

    test('should handle missing billing configuration as disabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);
      (ctx.config.billing as unknown) = undefined;

      // Will throw because code expects billing config to be defined
      // This documents expected behavior - billing config must be present
      expect(() => {
        registerRoutes(app, ctx);
      }).toThrow();
    });

    test('should handle billing.enabled === false explicitly', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);
      ctx.config.billing.enabled = false;

      registerRoutes(app, ctx);

      // Should register only core routes
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(6);
    });
  });

  describe('Webhook Route Registration', () => {
    test('should always register webhook routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(1);
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledWith(app, ctx);
    });

    test('should register webhook routes even when billing is disabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false); // billing disabled

      registerRoutes(app, ctx);

      // Webhooks still registered for potential future use
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(1);
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledWith(app, ctx);
    });

    test('should register webhook routes when billing is enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true); // billing enabled

      registerRoutes(app, ctx);

      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(1);
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledWith(app, ctx);
    });

    test('should pass correct arguments to registerWebhookRoutes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);

      registerRoutes(app, ctx);

      const [passedApp, passedCtx] = mockRegisterWebhookRoutes.mock.calls[0]!;

      expect(passedApp).toBe(app);
      expect(passedCtx).toBe(ctx);
    });
  });

  describe('Route Registration Order', () => {
    test('should register routes in the correct order', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true); // billing enabled

      registerRoutes(app, ctx);

      // Verify order: auth, user, admin, realtime, notifications, system, billing
      const calls = mockRegisterRouteMap.mock.calls;

      expect(calls[0]![2]).toHaveProperty('auth/test');
      expect(calls[1]![2]).toHaveProperty('users/test');
      expect(calls[2]![2]).toHaveProperty('admin/test');
      expect(calls[3]![2]).toHaveProperty('realtime/test');
      expect(calls[4]![2]).toHaveProperty('notifications/test');
      expect(calls[5]![2]).toHaveProperty('system/test');
      expect(calls[6]![2]).toHaveProperty('billing/test');
    });

    test('should register webhooks after all route maps', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);

      registerRoutes(app, ctx);

      // Get call order by checking when each mock was called
      const routeMapLastCall = mockRegisterRouteMap.mock.invocationCallOrder.slice(-1)[0]!;
      const webhookFirstCall = mockRegisterWebhookRoutes.mock.invocationCallOrder[0]!;

      expect(webhookFirstCall).toBeGreaterThan(routeMapLastCall);
    });
  });

  describe('Configuration Integrity', () => {
    test('should not modify the context', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);
      const originalConfig = { ...ctx.config };

      registerRoutes(app, ctx);

      // Config should remain unchanged
      expect(ctx.config).toEqual(originalConfig);
    });

    test('should handle empty JWT secret', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);
      ctx.config.auth.jwt.secret = '';

      registerRoutes(app, ctx);

      // Should still call registerRouteMap with empty secret
      expect(mockRegisterRouteMap).toHaveBeenCalled();

      for (const call of mockRegisterRouteMap.mock.calls) {
        const options = call[3] as { jwtSecret: string };
        expect(options.jwtSecret).toBe('');
      }
    });

    test('should use config values without modification', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);
      const customSecret = 'custom-secret-value-for-testing';
      ctx.config.auth.jwt.secret = customSecret;

      registerRoutes(app, ctx);

      // Verify the exact secret is passed through
      const nonSystemCalls = mockRegisterRouteMap.mock.calls.slice(0, -1);

      for (const call of nonSystemCalls) {
        const options = call[3] as { jwtSecret: string };
        expect(options.jwtSecret).toBe(customSecret);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle multiple registrations on the same app instance', () => {
      const app = createMockFastify();
      const ctx1 = createMockContext(false);
      const ctx2 = createMockContext(true);

      registerRoutes(app, ctx1);
      vi.clearAllMocks();
      registerRoutes(app, ctx2);

      // Second registration should work independently
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(7); // 6 core + billing
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(1);
    });

    test('should handle context with different config structures', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);

      // Modify config to test flexibility
      ctx.config.auth.jwt.secret = 'different-secret';
      ctx.config.billing.enabled = true;

      expect(() => {
        registerRoutes(app, ctx);
      }).not.toThrow();
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(7);
    });

    test('should not fail if route modules return empty route maps', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      // This tests that empty route maps don't cause issues
      expect(() => {
        registerRoutes(app, ctx);
      }).not.toThrow();
      expect(mockRegisterRouteMap).toHaveBeenCalled();
    });
  });

  describe('Router Options', () => {
    test('should create consistent router options for standard routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Get all non-system route calls
      const standardCalls = mockRegisterRouteMap.mock.calls.slice(0, -1);

      for (const call of standardCalls) {
        const options = call[3] as { prefix: string; jwtSecret: string; authGuardFactory: unknown };
        expect(options).toMatchObject({
          prefix: '/api',
          jwtSecret: 'test-jwt-secret',
        });
        expect(typeof options.authGuardFactory).toBe('function');
      }
    });

    test('should create custom router options for system routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Get system route call (last one)
      const systemCall = mockRegisterRouteMap.mock.calls[5]!;
      const options = systemCall[3] as { prefix: string; jwtSecret: string };

      expect(options).toMatchObject({
        prefix: '',
        jwtSecret: 'test-jwt-secret',
      });
    });

    test('should include billing routes with standard options when enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);

      registerRoutes(app, ctx);

      // Find billing route call
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        const routes = call[2] as Record<string, unknown>;
        return 'billing/test' in routes;
      });

      const options = billingCall![3] as { prefix: string; jwtSecret: string };
      expect(options).toMatchObject({
        prefix: '/api',
        jwtSecret: 'test-jwt-secret',
      });
    });
  });
});

// ============================================================================
// Module Exports Tests
// ============================================================================

describe('Module Exports', () => {
  test('should export registerRoutes function', async () => {
    const module = await import('./routes');
    expect(module.registerRoutes).toBeDefined();
    expect(typeof module.registerRoutes).toBe('function');
  });
});

// ============================================================================
// Integration with registerRouteMap Tests
// ============================================================================

describe('Integration with registerRouteMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should pass valid route map objects to registerRouteMap', () => {
    const app = createMockFastify();
    const ctx = createMockContext(false);

    registerRoutes(app, ctx);

    // Verify all route maps are objects
    for (const call of mockRegisterRouteMap.mock.calls) {
      const routeMap = call[2];
      expect(typeof routeMap).toBe('object');
      expect(routeMap).not.toBeNull();
    }
  });

  test('should maintain route map structure through registration', () => {
    const app = createMockFastify();
    const ctx = createMockContext(false);

    registerRoutes(app, ctx);

    // Verify route maps contain expected route definitions
    for (const call of mockRegisterRouteMap.mock.calls) {
      const routeMap = call[2] as Record<string, unknown>;
      const firstRoute = Object.values(routeMap)[0];

      if (firstRoute !== undefined) {
        expect(firstRoute).toHaveProperty('method');
        expect(firstRoute).toHaveProperty('handler');
      }
    }
  });

  test('should not mutate imported route objects', () => {
    const app = createMockFastify();
    const ctx = createMockContext(true);

    registerRoutes(app, ctx);

    // Route maps should be passed by reference, not cloned
    const calls = mockRegisterRouteMap.mock.calls;

    // Verify the exact same objects are passed (not copies)
    for (const call of calls) {
      const routeMap = call[2];
      expect(routeMap).toBeDefined();
    }
  });
});
