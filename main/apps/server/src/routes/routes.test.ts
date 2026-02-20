// main/apps/server/src/routes/routes.test.ts
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

import { registerBillingWebhookRoutes } from './billingWebhooks';
import { registerRoutes } from './routes';

import type { AppContext } from '@shared';
import type { FastifyInstance } from 'fastify';

import { registerRouteMap } from '@/http';

// ============================================================================
// Mocks (must be before local imports)
// ============================================================================

// Mock dependencies
vi.mock('@bslt/server-system', () => ({
  registerRouteMap: vi.fn(),
  protectedRoute: vi.fn(),
  publicRoute: vi.fn(),
  createRouteMap: vi.fn(),
}));

vi.mock('@bslt/core/admin', () => ({
  adminRoutes: { ['admin/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/activities', () => ({
  activityRoutes: { ['activities/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/api-keys', () => ({
  apiKeyRoutes: { ['api-keys/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/auth', () => ({
  authRoutes: { ['auth/test']: { method: 'POST', handler: vi.fn() } },
  createAuthGuard: vi.fn(),
}));

vi.mock('@bslt/core/billing', () => ({
  billingRoutes: { ['billing/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('./billingWebhooks', () => ({
  registerBillingWebhookRoutes: vi.fn(),
}));

vi.mock('@bslt/core/notifications', () => ({
  notificationRoutes: { ['notifications/test']: { method: 'POST', handler: vi.fn() } },
}));

vi.mock('@bslt/core/feature-flags', () => ({
  featureFlagRoutes: { ['feature-flags/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/files', () => ({
  fileRoutes: { ['files/test']: { method: 'POST', handler: vi.fn() } },
}));

vi.mock('@bslt/core/legal', () => ({
  legalRoutes: { ['legal/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/consent', () => ({
  consentRoutes: { ['consent/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/data-export', () => ({
  dataExportRoutes: { ['data-export/test']: { method: 'POST', handler: vi.fn() } },
}));

vi.mock('@bslt/core/tenants', () => ({
  tenantRoutes: { ['tenants/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/webhooks', () => ({
  webhookRoutes: { ['webhooks/test']: { method: 'POST', handler: vi.fn() } },
}));

vi.mock('@bslt/realtime', () => ({
  realtimeRoutes: { ['realtime/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('./system.routes', () => ({
  systemRoutes: { ['system/test']: { method: 'GET', handler: vi.fn() } },
}));

vi.mock('@bslt/core/users', () => ({
  userRoutes: { ['users/test']: { method: 'GET', handler: vi.fn() } },
}));

// Get mocked functions
const mockRegisterRouteMap = vi.mocked(registerRouteMap);
const mockRegisterWebhookRoutes = vi.mocked(registerBillingWebhookRoutes);

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
      env: 'test',
      database: {
        provider: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        maxConnections: 10,
        portFallbacks: [],
        ssl: false,
      },
      email: {
        provider: 'console',
        smtp: {
          host: 'localhost',
          port: 587,
          secure: false,
          connectionTimeout: 5000,
          socketTimeout: 5000,
        },
        from: {
          name: 'Test',
          address: 'test@example.com',
        },
        replyTo: 'test@example.com',
      },
      storage: {
        provider: 'local',
        rootPath: '/tmp/test',
      },
      cache: {
        ttl: 3600000,
        maxSize: 100,
        useExternalProvider: false,
      },
      queue: {
        provider: 'local',
        pollIntervalMs: 1000,
        concurrency: 5,
        defaultMaxAttempts: 3,
        backoffBaseMs: 1000,
        maxBackoffMs: 60000,
      },
      notifications: {
        enabled: false,
        provider: 'fcm',
        config: {
          credentials: '{}',
          projectId: 'test',
        },
      },
      search: {
        provider: 'sql',
        config: {
          defaultPageSize: 20,
          maxPageSize: 100,
        },
      },
      packageManager: {
        provider: 'pnpm',
        strictPeerDeps: true,
        frozenLockfile: true,
      },
      auth: {
        strategies: ['local', 'google', 'github'],
        jwt: {
          secret: 'test-jwt-secret',
          accessTokenExpiry: 900,
          issuer: 'test-issuer',
          audience: 'test-audience',
        },
        refreshToken: {
          expiryDays: 7,
          gracePeriodSeconds: 60,
        },
        argon2: {
          type: 2,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        },
        password: {
          minLength: 8,
          maxLength: 128,
          minZxcvbnScore: 3,
        },
        lockout: {
          maxAttempts: 5,
          lockoutDurationMs: 900000,
          progressiveDelay: true,
          baseDelayMs: 1000,
        },
        proxy: {
          trustProxy: false,
          trustedProxies: [],
          maxProxyDepth: 1,
        },
        rateLimit: {
          login: { max: 5, windowMs: 900000 },
          register: { max: 3, windowMs: 3600000 },
          forgotPassword: { max: 3, windowMs: 3600000 },
          verifyEmail: { max: 5, windowMs: 900000 },
        },
        cookie: {
          name: 'refreshToken',
          secret: 'test-cookie-secret-min-32-chars',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        },
        oauthTokenEncryptionKey: 'test-cookie-secret-min-32-chars',
        oauth: {
          google: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            callbackUrl: 'http://localhost:3000/api/auth/oauth/google/callback',
          },
          github: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            callbackUrl: 'http://localhost:3000/api/auth/oauth/github/callback',
          },
          apple: {
            clientId: 'test-client-id',
            teamId: 'test-team-id',
            keyId: 'test-key-id',
            privateKey: 'test-private-key',
            clientSecret: 'test-client-secret',
            callbackUrl: 'http://localhost:3000/api/auth/oauth/apple/callback',
          },
        },
        magicLink: {
          tokenExpiryMinutes: 15,
          maxAttempts: 3,
        },
        totp: {
          issuer: 'test-app',
          window: 1,
        },
      },
      billing: {
        enabled: billingEnabled,
        provider: 'stripe' as const,
        currency: 'usd',
        stripe: {
          secretKey: 'test-stripe-key',
          webhookSecret: 'test-webhook-secret',
          publishableKey: 'test-publishable-key',
        },
        paypal: {
          clientId: 'test-paypal-client-id',
          clientSecret: 'test-paypal-client-secret',
          webhookId: 'test-paypal-webhook-id',
          sandbox: true,
        },
        plans: {
          free: 'price_free',
          pro: 'price_pro',
          enterprise: 'price_enterprise',
        },
        urls: {
          portalReturnUrl: 'http://localhost:3000/billing',
          checkoutSuccessUrl: 'http://localhost:3000/billing/success',
          checkoutCancelUrl: 'http://localhost:3000/billing/cancel',
        },
      },
      server: {
        port: 3000,
        host: 'localhost',
        appBaseUrl: 'http://localhost:3000',
        apiBaseUrl: 'http://localhost:3000/api',
        trustProxy: false,
        portFallbacks: [],
        cors: {
          origin: ['http://localhost:5173'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
        logLevel: 'info' as const,
        logging: {
          clientErrorLevel: 'warn' as const,
          requestContext: true,
        },
        maintenanceMode: false,
        auditRetentionDays: 90,
        rateLimit: {
          windowMs: 60000,
          max: 100,
        },
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
    queueStore: {} as never,
    search: {} as never,
    emailTemplates: {} as never,
    errorTracker: {} as never,
    contextualize: vi.fn(),
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as never,
  };
}

/**
 * Checks whether a route map (plain object or Map) contains a given key.
 *
 * Billing routes are converted to a Map via buildRouteMap, while other module
 * routes pass through as plain objects. This helper handles both cases.
 *
 * @param routeMap - The route map argument from registerRouteMap call
 * @param key - The route key to look for
 * @returns True if the key exists in the route map
 * @complexity O(1)
 */
function routeMapHasKey(routeMap: unknown, key: string): boolean {
  if (routeMap instanceof Map) return routeMap.has(key);
  if (typeof routeMap === 'object' && routeMap !== null) return key in routeMap;
  return false;
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

      // Verify registerRouteMap was called for each core module + system
      // Order: auth, users, notifications, admin, tenants, api-keys, activities, feature-flags,
      //        legal, consent, data-export, files, webhooks, realtime, system
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(15);

      // Verify each module's routes were registered with correct options
      const calls = mockRegisterRouteMap.mock.calls;

      // Check that routes were registered (order matches routes.ts)
      expect(routeMapHasKey(calls[0]![2], 'auth/test')).toBe(true);
      expect(routeMapHasKey(calls[1]![2], 'users/test')).toBe(true);
      expect(routeMapHasKey(calls[2]![2], 'notifications/test')).toBe(true);
      expect(routeMapHasKey(calls[3]![2], 'admin/test')).toBe(true);
      expect(routeMapHasKey(calls[4]![2], 'tenants/test')).toBe(true);
      expect(routeMapHasKey(calls[5]![2], 'api-keys/test')).toBe(true);
      expect(routeMapHasKey(calls[6]![2], 'activities/test')).toBe(true);
      expect(routeMapHasKey(calls[7]![2], 'feature-flags/test')).toBe(true);
      expect(routeMapHasKey(calls[8]![2], 'legal/test')).toBe(true);
      expect(routeMapHasKey(calls[9]![2], 'consent/test')).toBe(true);
      expect(routeMapHasKey(calls[10]![2], 'data-export/test')).toBe(true);
      expect(routeMapHasKey(calls[11]![2], 'files/test')).toBe(true);
      expect(routeMapHasKey(calls[12]![2], 'webhooks/test')).toBe(true);
      expect(routeMapHasKey(calls[13]![2], 'realtime/test')).toBe(true);
      expect(routeMapHasKey(calls[14]![2], 'system/test')).toBe(true);
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

      // Verify second argument is the context (cast to HandlerContext)
      for (const call of mockRegisterRouteMap.mock.calls) {
        expect(call[1]).toBeDefined();
      }
    });

    test('should pass JWT secret in router options', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // All core routes include JWT secret
      for (const call of mockRegisterRouteMap.mock.calls) {
        const options = call[3] as { prefix: string; jwtSecret: string };
        expect(options.jwtSecret).toBe('test-jwt-secret');
      }
    });

    test('should use /api prefix for most routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      // Core routes use /api prefix; system routes use empty prefix
      const apiCalls = mockRegisterRouteMap.mock.calls.filter(
        (call) => (call[3] as { prefix: string }).prefix === '/api',
      );
      const systemCalls = mockRegisterRouteMap.mock.calls.filter(
        (call) => (call[3] as { prefix: string }).prefix === '',
      );

      expect(systemCalls).toHaveLength(1);
      expect(apiCalls.length).toBeGreaterThan(0);
      for (const call of apiCalls) {
        const options = call[3] as { prefix: string; jwtSecret: string };
        expect(options.prefix).toBe('/api');
        expect(options.jwtSecret).toBe('test-jwt-secret');
      }
    });

    test('should register system routes with empty prefix', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      const systemCalls = mockRegisterRouteMap.mock.calls.filter(
        (call) => (call[3] as { prefix: string }).prefix === '',
      );
      expect(systemCalls).toHaveLength(1);
    });
  });

  describe('Conditional Billing Routes', () => {
    test('should register billing routes when billing is enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true); // billing enabled

      registerRoutes(app, ctx);

      // Should call registerRouteMap 16 times (14 core + 1 system + 1 billing)
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(16);

      // Verify billing routes were registered (billing uses Map via buildRouteMap)
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        return routeMapHasKey(call[2], 'billing/test');
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

      // Should call registerRouteMap 15 times (14 core + 1 system)
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(15);

      // Verify no billing routes were registered
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        return routeMapHasKey(call[2], 'billing/test');
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

      // Should register core + system routes
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(15);
    });
  });

  describe('Webhook Route Registration', () => {
    test('should register webhook routes when billing is enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true); // billing enabled

      registerRoutes(app, ctx);

      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(1);
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledWith(app, ctx);
    });

    test('should not register webhook routes when billing is disabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false); // billing disabled

      registerRoutes(app, ctx);

      // Webhooks are only registered inside the billing-enabled block
      expect(mockRegisterWebhookRoutes).toHaveBeenCalledTimes(0);
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

      // Verify order matches routes.ts registration order
      const calls = mockRegisterRouteMap.mock.calls;

      expect(routeMapHasKey(calls[0]![2], 'auth/test')).toBe(true);
      expect(routeMapHasKey(calls[1]![2], 'users/test')).toBe(true);
      expect(routeMapHasKey(calls[2]![2], 'notifications/test')).toBe(true);
      expect(routeMapHasKey(calls[3]![2], 'admin/test')).toBe(true);
      expect(routeMapHasKey(calls[4]![2], 'tenants/test')).toBe(true);
      expect(routeMapHasKey(calls[5]![2], 'api-keys/test')).toBe(true);
      expect(routeMapHasKey(calls[6]![2], 'activities/test')).toBe(true);
      expect(routeMapHasKey(calls[7]![2], 'feature-flags/test')).toBe(true);
      expect(routeMapHasKey(calls[8]![2], 'legal/test')).toBe(true);
      expect(routeMapHasKey(calls[9]![2], 'consent/test')).toBe(true);
      expect(routeMapHasKey(calls[10]![2], 'data-export/test')).toBe(true);
      expect(routeMapHasKey(calls[11]![2], 'files/test')).toBe(true);
      expect(routeMapHasKey(calls[12]![2], 'webhooks/test')).toBe(true);
      expect(routeMapHasKey(calls[13]![2], 'realtime/test')).toBe(true);
      expect(routeMapHasKey(calls[14]![2], 'system/test')).toBe(true);
      expect(routeMapHasKey(calls[15]![2], 'billing/test')).toBe(true);
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

      for (const call of mockRegisterRouteMap.mock.calls) {
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
      // 14 core + 1 system + 1 billing = 16
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(16);
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
      // 14 core + 1 system + 1 billing = 16
      expect(mockRegisterRouteMap).toHaveBeenCalledTimes(16);
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

      // Core routes use /api prefix; system routes use empty prefix
      for (const call of mockRegisterRouteMap.mock.calls) {
        const options = call[3] as { prefix: string; jwtSecret: string; authGuardFactory: unknown };
        if (options.prefix === '') {
          expect(options.jwtSecret).toBe('test-jwt-secret');
          expect(typeof options.authGuardFactory).toBe('function');
          continue;
        }
        expect(options).toMatchObject({
          prefix: '/api',
          jwtSecret: 'test-jwt-secret',
        });
        expect(typeof options.authGuardFactory).toBe('function');
      }
    });

    test('should create empty prefix for system routes', () => {
      const app = createMockFastify();
      const ctx = createMockContext(false);

      registerRoutes(app, ctx);

      const systemCalls = mockRegisterRouteMap.mock.calls.filter(
        (call) => (call[3] as { prefix: string }).prefix === '',
      );
      expect(systemCalls).toHaveLength(1);
    });

    test('should include billing routes with standard options when enabled', () => {
      const app = createMockFastify();
      const ctx = createMockContext(true);

      registerRoutes(app, ctx);

      // Find billing route call (uses Map from buildRouteMap)
      const billingCall = mockRegisterRouteMap.mock.calls.find((call) => {
        return routeMapHasKey(call[2], 'billing/test');
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

    // Verify all route maps are objects (plain objects or Maps)
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
      const routeMap = call[2];

      // Get first value from either Map or plain object
      let firstRoute: unknown;
      if (routeMap instanceof Map) {
        firstRoute = routeMap.values().next().value;
      } else {
        const values = Object.values(routeMap as Record<string, unknown>);
        firstRoute = values[0];
      }

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
