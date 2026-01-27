// apps/server/src/infrastructure/http/router/__tests__/router.test.ts
import { loginRequestSchema } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { protectedRoute, publicRoute, registerRouteMap } from '../router';

import type { AppContext } from '@shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RouteMap, RouteResult, ValidationSchema } from '../types';

// ============================================================================
// Mock Schema Helper
// ============================================================================

/**
 * Create a mock schema for testing (compatible with manual validation)
 */
function createMockSchema<T>(
  validator: (data: unknown) => { success: true; data: T } | { success: false; error: Error },
): ValidationSchema<T> {
  return {
    safeParse: validator,
  } as ValidationSchema<T>;
}

// Simple email/password schema for testing
const emailPasswordSchema = createMockSchema<{ email: string; password: string }>((data) => {
  const d = data as Record<string, unknown>;
  if (typeof d?.email !== 'string' || !d.email.includes('@')) {
    return {
      success: false,
      error: new Error('Invalid email'),
    };
  }
  if (typeof d?.password !== 'string' || d.password.length < 8) {
    return {
      success: false,
      error: new Error('Password must be at least 8 characters'),
    };
  }
  return { success: true, data: { email: d.email, password: d.password } };
});

// Simple name schema for testing
const nameSchema = createMockSchema<{ name: string }>((data) => {
  const d = data as Record<string, unknown>;
  if (typeof d?.name !== 'string' || d.name.length === 0) {
    return {
      success: false,
      error: new Error('Name is required'),
    };
  }
  return { success: true, data: { name: d.name } };
});

// ============================================================================
// Mock Helpers
// ============================================================================

interface MockFastifyInstance {
  routes: Array<{
    method: string;
    path: string;
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }>;
  hooks: Array<{ event: string; handler: unknown }>;
  registeredPlugins: Array<(instance: MockFastifyInstance) => void>;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  addHook: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
}

function createMockFastify(): MockFastifyInstance {
  const routes: MockFastifyInstance['routes'] = [];
  const hooks: MockFastifyInstance['hooks'] = [];

  const instance: MockFastifyInstance = {
    routes,
    hooks,
    registeredPlugins: [],
    get: vi.fn((path: string, handler: MockFastifyInstance['routes'][0]['handler']) => {
      routes.push({ method: 'GET', path, handler });
    }),
    post: vi.fn((path: string, handler: MockFastifyInstance['routes'][0]['handler']) => {
      routes.push({ method: 'POST', path, handler });
    }),
    put: vi.fn((path: string, handler: MockFastifyInstance['routes'][0]['handler']) => {
      routes.push({ method: 'PUT', path, handler });
    }),
    patch: vi.fn((path: string, handler: MockFastifyInstance['routes'][0]['handler']) => {
      routes.push({ method: 'PATCH', path, handler });
    }),
    delete: vi.fn((path: string, handler: MockFastifyInstance['routes'][0]['handler']) => {
      routes.push({ method: 'DELETE', path, handler });
    }),
    addHook: vi.fn((event: string, handler: unknown) => {
      hooks.push({ event, handler });
    }),
    register: vi.fn((plugin: (instance: FastifyInstance) => void) => {
      // Create a nested instance for the plugin
      const nested = createMockFastify();
      plugin(nested as unknown as FastifyInstance);
      instance.registeredPlugins.push(() => {
        // Copy routes from nested instance
        nested.routes.forEach((r) => routes.push(r));
        nested.hooks.forEach((h) => hooks.push(h));
      });
      return Promise.resolve();
    }),
  };

  return instance;
}

function createMockContext(): AppContext {
  return {
    db: {} as never,
    repos: {} as never,
    config: {} as never,
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as never,
    pubsub: {} as never,
    email: {} as never,
    storage: {} as never,
    cache: {} as never,
    billing: {} as never,
    notifications: {} as never,
    queue: {} as never,
    write: {} as never,
    search: {} as never,
  };
}

function createMockRequest(body?: unknown, user?: unknown): FastifyRequest {
  return {
    body,
    user,
    headers: {},
    params: {},
    query: {},
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply & { statusCode: number; sentBody: unknown } {
  const reply = {
    statusCode: 200,
    sentBody: undefined as unknown,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    }),
    send: vi.fn(function (this: { sentBody: unknown }, body: unknown) {
      this.sentBody = body;
      return this;
    }),
  };

  return reply as unknown as FastifyReply & { statusCode: number; sentBody: unknown };
}

// ============================================================================
// publicRoute Tests
// ============================================================================

describe('publicRoute', () => {
  test('should create route definition with method and handler', () => {
    const handler = vi.fn();
    const route = publicRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.handler).toBe(handler);
    expect(route.auth).toBeUndefined();
    expect(route.schema).toBeUndefined();
  });

  test('should create route definition with schema', () => {
    const handler = vi.fn();
    const route = publicRoute('POST', handler, nameSchema);

    expect(route.method).toBe('POST');
    expect(route.schema).toBe(nameSchema);
  });

  test('should support all HTTP methods', () => {
    const handler = vi.fn();

    expect(publicRoute('GET', handler).method).toBe('GET');
    expect(publicRoute('POST', handler).method).toBe('POST');
    expect(publicRoute('PUT', handler).method).toBe('PUT');
    expect(publicRoute('PATCH', handler).method).toBe('PATCH');
    expect(publicRoute('DELETE', handler).method).toBe('DELETE');
  });
});

// ============================================================================
// protectedRoute Tests
// ============================================================================

describe('protectedRoute', () => {
  test('should create route definition with user auth by default', () => {
    const handler = vi.fn();
    const route = protectedRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.handler).toBe(handler);
    expect(route.auth).toBe('user');
  });

  test('should create route definition with admin auth', () => {
    const handler = vi.fn();
    const route = protectedRoute('POST', handler, 'admin');

    expect(route.auth).toBe('admin');
  });

  test('should create route definition with schema', () => {
    const handler = vi.fn();
    const route = protectedRoute('PUT', handler, 'user', nameSchema);

    expect(route.schema).toBe(nameSchema);
  });
});

// ============================================================================
// registerRouteMap Tests
// ============================================================================

describe('registerRouteMap', () => {
  let app: MockFastifyInstance;
  let ctx: AppContext;

  beforeEach(() => {
    app = createMockFastify();
    ctx = createMockContext();
  });

  test('should register public routes directly', () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { ok: true } });
    const routes: RouteMap = {
      health: publicRoute('GET', handler),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  test('should apply prefix to routes', () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: {} });
    const routes: RouteMap = {
      users: publicRoute('GET', handler),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, {
      prefix: '/api',
      jwtSecret: 'test-secret',
    });

    expect(app.get).toHaveBeenCalledWith('/api/users', expect.any(Function));
  });

  test('should register routes with different HTTP methods', () => {
    const routes: RouteMap = {
      items: publicRoute('GET', vi.fn().mockResolvedValue({ status: 200, body: [] })),
      'items/create': publicRoute('POST', vi.fn().mockResolvedValue({ status: 201, body: {} })),
      'items/update': publicRoute('PUT', vi.fn().mockResolvedValue({ status: 200, body: {} })),
      'items/patch': publicRoute('PATCH', vi.fn().mockResolvedValue({ status: 200, body: {} })),
      'items/delete': publicRoute('DELETE', vi.fn().mockResolvedValue({ status: 204, body: null })),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    expect(app.get).toHaveBeenCalled();
    expect(app.post).toHaveBeenCalled();
    expect(app.put).toHaveBeenCalled();
    expect(app.patch).toHaveBeenCalled();
    expect(app.delete).toHaveBeenCalled();
  });

  test('should group user-protected routes together', () => {
    const routes: RouteMap = {
      public: publicRoute('GET', vi.fn().mockResolvedValue({ status: 200, body: {} })),
      profile: protectedRoute('GET', vi.fn().mockResolvedValue({ status: 200, body: {} }), 'user'),
      settings: protectedRoute('PUT', vi.fn().mockResolvedValue({ status: 200, body: {} }), 'user'),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    // Should register via plugin for protected routes
    expect(app.register).toHaveBeenCalled();
  });

  test('should group admin-protected routes together', () => {
    const routes: RouteMap = {
      'admin/users': protectedRoute(
        'GET',
        vi.fn().mockResolvedValue({ status: 200, body: [] }),
        'admin',
      ),
      'admin/settings': protectedRoute(
        'PUT',
        vi.fn().mockResolvedValue({ status: 200, body: {} }),
        'admin',
      ),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    expect(app.register).toHaveBeenCalled();
  });

  test('should validate request body when schema is provided', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { success: true } });

    const routes = {
      login: publicRoute('POST', handler, emailPasswordSchema),
    } as RouteMap;

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    // Get the registered handler
    const registeredRoute = app.routes.find((r) => r.path === '/login');
    expect(registeredRoute).toBeDefined();

    // Test with invalid body
    const req = createMockRequest({ email: 'invalid', password: '123' });
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(reply.statusCode).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  test('should call handler with validated body', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { token: 'abc' } });

    const routes = {
      login: publicRoute('POST', handler, emailPasswordSchema),
    } as RouteMap;

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/login');
    const validBody = { email: 'test@example.com', password: 'securepassword123' };
    const req = createMockRequest(validBody);
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(handler).toHaveBeenCalledWith(ctx, validBody, req, reply);
    expect(reply.statusCode).toBe(200);
    expect(reply.sentBody).toEqual({ token: 'abc' });
  });

  test('should call handler without body for GET requests', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { data: 'test' } });

    const routes: RouteMap = {
      data: publicRoute('GET', handler),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/data');
    const req = createMockRequest();
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(handler).toHaveBeenCalledWith(ctx, undefined, req, reply);
    expect(reply.statusCode).toBe(200);
  });

  test('should return validation error message', async () => {
    const handler = vi.fn();

    const routes = {
      user: publicRoute('POST', handler, nameSchema),
    } as RouteMap;

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/user');
    const req = createMockRequest({ name: '' });
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.sentBody).toEqual({
      message: 'Name is required',
    });
  });

  test('should not register user routes if none exist', () => {
    const routes: RouteMap = {
      public: publicRoute('GET', vi.fn().mockResolvedValue({ status: 200, body: {} })),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    // register should not be called for user routes
    // Only public routes registered directly
    expect(app.get).toHaveBeenCalled();
  });

  test('should not register admin routes if none exist', () => {
    const routes: RouteMap = {
      public: publicRoute('GET', vi.fn().mockResolvedValue({ status: 200, body: {} })),
      'user-only': protectedRoute(
        'GET',
        vi.fn().mockResolvedValue({ status: 200, body: {} }),
        'user',
      ),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    // Only one register call for user routes, none for admin
    expect(app.register).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Route Handler Behavior Tests
// ============================================================================

describe('Route Handler Behavior', () => {
  let app: MockFastifyInstance;
  let ctx: AppContext;

  beforeEach(() => {
    app = createMockFastify();
    ctx = createMockContext();
  });

  test('should return handler result status and body', async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 201,
      body: { id: 'new-item', created: true },
    } satisfies RouteResult<{ id: string; created: boolean }>);

    const routes: RouteMap = {
      items: publicRoute('POST', handler),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/items');
    const req = createMockRequest();
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.status).toHaveBeenCalledWith(201);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(reply.send).toHaveBeenCalledWith({ id: 'new-item', created: true });
  });

  test('should handle async handlers', async () => {
    const handler = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 200, body: { delayed: true } };
    });

    const routes: RouteMap = {
      slow: publicRoute('GET', handler),
    };

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/slow');
    const req = createMockRequest();
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(reply.sentBody).toEqual({ delayed: true });
  });

  test('should pass context, body, request, and reply to handler', async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: {} });

    const routes = {
      test: publicRoute('POST', handler, nameSchema),
    } as RouteMap;

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/test');
    const req = createMockRequest({ name: 'Test' });
    const reply = createMockReply();

    await registeredRoute!.handler(req, reply);

    expect(handler).toHaveBeenCalledWith(ctx, { name: 'Test' }, req, reply);
  });
});

// ============================================================================
// Integration with Real Schema Tests
// ============================================================================

describe('Integration with @abe-stack/core schemas', () => {
  let app: MockFastifyInstance;
  let ctx: AppContext;

  beforeEach(() => {
    app = createMockFastify();
    ctx = createMockContext();
  });

  test('should work with loginRequestSchema from @abe-stack/core', () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { token: 'abc' } });

    const routes = {
      'auth/login': publicRoute('POST', handler, loginRequestSchema),
    } as RouteMap;

    registerRouteMap(app as unknown as FastifyInstance, ctx, routes, { jwtSecret: 'test-secret' });

    const registeredRoute = app.routes.find((r) => r.path === '/auth/login');
    expect(registeredRoute).toBeDefined();
    expect(registeredRoute?.method).toBe('POST');
  });
});
