// src/server/engine/src/routing/routing.test.ts
/**
 * Tests for Fastify Route Registration
 *
 * Verifies route builders, ValidationSchema wrappers, auth guard injection,
 * and the registerRouteMap function.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { clearRegistry, getRegisteredRoutes } from './route-registry';
import { createRouteMap, protectedRoute, publicRoute, registerRouteMap } from './routing';

import type {
  HandlerContext,
  RouteHandler,
  RouteSchema,
  RouterOptions,
  ValidationSchema,
} from './routing';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Fixtures
// ============================================================================

/** Minimal mock satisfying BaseContext (db, repos, log). */
const mockCtx: HandlerContext = {
  db: {},
  repos: {},
  log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
} as unknown as HandlerContext;

/**
 * Create a minimal Fastify mock that captures registered routes.
 *
 * @returns Object with the mock instance and an array of captured routes.
 */
function createMockFastify(): {
  app: FastifyInstance;
  routes: Array<{
    method: string;
    url: string;
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    preHandler?: unknown;
    schema?: unknown;
  }>;
} {
  const routes: Array<{
    method: string;
    url: string;
    handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    preHandler?: unknown;
    schema?: unknown;
  }> = [];

  const app = {
    route: vi.fn((opts: Record<string, unknown>) => {
      routes.push(opts as (typeof routes)[number]);
    }),
  } as unknown as FastifyInstance;

  return { app, routes };
}

/** Mock Fastify request factory. */
function createMockRequest(body?: unknown): FastifyRequest {
  return { body } as FastifyRequest;
}

/** Mock Fastify reply with chainable status/send. */
function createMockReply(): FastifyReply & { sentStatus: number | null; sentBody: unknown } {
  const reply = {
    sentStatus: null as number | null,
    sentBody: undefined as unknown,
    status(code: number) {
      reply.sentStatus = code;
      return {
        send(data: unknown) {
          reply.sentBody = data;
          return reply;
        },
      };
    },
  };
  return reply as unknown as FastifyReply & { sentStatus: number | null; sentBody: unknown };
}

const defaultOptions: RouterOptions = {
  prefix: '/api',
  jwtSecret: 'test-secret-that-is-at-least-32-chars-long',
  authGuardFactory: vi.fn((_secret: string, ..._roles: string[]) => vi.fn()),
};

// ============================================================================
// publicRoute / protectedRoute builders
// ============================================================================

describe('publicRoute', () => {
  test('should create a public route definition', () => {
    const handler: RouteHandler = vi.fn();
    const route = publicRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.isPublic).toBe(true);
    expect(route.handler).toBe(handler);
    expect(route.schema).toBeUndefined();
    expect(route.roles).toBeUndefined();
  });

  test('should attach schema when provided', () => {
    const handler: RouteHandler = vi.fn();
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn(),
    };

    const route = publicRoute('POST', handler, schema);

    expect(route.schema).toBe(schema);
  });
});

describe('protectedRoute', () => {
  test('should create a protected route with no roles by default', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.isPublic).toBe(false);
    expect(route.roles).toEqual([]);
  });

  test('should accept a single role string', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('POST', handler, 'admin');

    expect(route.roles).toEqual(['admin']);
  });

  test('should accept an array of roles', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('PUT', handler, ['admin', 'moderator']);

    expect(route.roles).toEqual(['admin', 'moderator']);
  });

  test('should handle empty string role as no roles', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('DELETE', handler, '');

    expect(route.roles).toEqual([]);
  });

  test('should attach schema when provided', () => {
    const handler: RouteHandler = vi.fn();
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn(),
    };

    const route = protectedRoute('PATCH', handler, [], schema);

    expect(route.schema).toBe(schema);
  });
});

// ============================================================================
// createRouteMap
// ============================================================================

describe('createRouteMap', () => {
  test('should create a Map from path/definition tuples', () => {
    const handler: RouteHandler = vi.fn();
    const map = createRouteMap([
      ['health', publicRoute('GET', handler)],
      ['users', protectedRoute('GET', handler, 'admin')],
    ]);

    expect(map.size).toBe(2);
    expect(map.has('health')).toBe(true);
    expect(map.has('users')).toBe(true);
  });

  test('should return empty map for empty input', () => {
    const map = createRouteMap([]);

    expect(map.size).toBe(0);
  });
});

// ============================================================================
// registerRouteMap
// ============================================================================

describe('registerRouteMap', () => {
  let app: FastifyInstance;
  let routes: ReturnType<typeof createMockFastify>['routes'];

  beforeEach(() => {
    const mock = createMockFastify();
    app = mock.app;
    routes = mock.routes;
    clearRegistry();
    vi.clearAllMocks();
  });

  test('should register routes with correct URL prefix', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve({ ok: true }));
    const routeMap = createRouteMap([['health', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    expect(routes).toHaveLength(1);
    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.method).toBe('GET');
    expect(route.url).toBe('/api/health');
  });

  test('should normalize double slashes in URL', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['/users/', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, { ...defaultOptions, prefix: '/api/' });

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.url).toBe('/api/users/');
  });

  test('should not attach preHandler for public routes', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['public', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.preHandler).toBeUndefined();
    expect(defaultOptions.authGuardFactory).not.toHaveBeenCalled();
  });

  test('should attach preHandler from authGuardFactory for protected routes', () => {
    const guard = vi.fn();
    const authFactory = vi.fn().mockReturnValue(guard);
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['protected', protectedRoute('GET', handler, ['admin'])]]);

    registerRouteMap(app, mockCtx, routeMap, {
      ...defaultOptions,
      authGuardFactory: authFactory,
    });

    expect(authFactory).toHaveBeenCalledWith(defaultOptions.jwtSecret, 'admin');
    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.preHandler).toBe(guard);
  });

  test('should validate body with safeParse schema and return 400 on failure', async () => {
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve(body));
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({
        success: false,
        error: new Error('Invalid email'),
      }),
    };

    const routeMap = createRouteMap([['create', publicRoute('POST', handler, schema)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const req = createMockRequest({ email: 'bad' });
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    await route.handler(req, reply as unknown as FastifyReply);

    expect(schema.safeParse).toHaveBeenCalledWith({ email: 'bad' });
    expect(reply.sentStatus).toBe(400);
    expect(reply.sentBody).toEqual({ message: 'Invalid email' });
    expect(handler).not.toHaveBeenCalled();
  });

  test('should pass validated data to handler on safeParse success', async () => {
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve({ received: body }));
    const validatedData = { email: 'valid@test.com', name: 'Test' };
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({
        success: true,
        data: validatedData,
      }),
    };

    const routeMap = createRouteMap([['create', publicRoute('POST', handler, schema)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const req = createMockRequest({ email: 'valid@test.com', name: 'Test' });
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    await route.handler(req, reply as unknown as FastifyReply);

    expect(handler).toHaveBeenCalledWith(mockCtx, validatedData, req, reply);
  });

  test('should handle { status, body } response pattern', async () => {
    const handler: RouteHandler = vi.fn(() =>
      Promise.resolve({
        status: 201,
        body: { id: '123', created: true },
      }),
    );

    const routeMap = createRouteMap([['create', publicRoute('POST', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const req = createMockRequest({});
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    await route.handler(req, reply as unknown as FastifyReply);

    expect(reply.sentStatus).toBe(201);
    expect(reply.sentBody).toEqual({ id: '123', created: true });
  });

  test('should return raw result when not { status, body } pattern', async () => {
    const responseData = { items: [1, 2, 3] };
    const handler: RouteHandler = vi.fn(() => Promise.resolve(responseData));

    const routeMap = createRouteMap([['list', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const req = createMockRequest(undefined);
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    const result = await route.handler(req, reply as unknown as FastifyReply);

    expect(result).toEqual(responseData);
    expect(reply.sentStatus).toBeNull();
  });

  test('should register FastifySchema on routes with properties key', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const fastifySchema = {
      properties: {
        body: { type: 'object' },
      },
    } as unknown as RouteSchema;

    const routeMap = createRouteMap([
      ['schema-route', publicRoute('POST', handler, fastifySchema)],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.schema).toBe(fastifySchema);
  });

  test('should pass body through unvalidated when no schema', async () => {
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve(body));

    const routeMap = createRouteMap([['no-schema', publicRoute('POST', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const rawBody = { anything: 'goes', nested: { deep: true } };
    const req = createMockRequest(rawBody);
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    await route.handler(req, reply as unknown as FastifyReply);

    expect(handler).toHaveBeenCalledWith(mockCtx, rawBody, req, reply);
  });

  test('should handle safeParse error that is not an Error instance', async () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({
        success: false,
        error: 'string error',
      }),
    };

    const routeMap = createRouteMap([['create', publicRoute('POST', handler, schema)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const req = createMockRequest({});
    const reply = createMockReply();

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    await route.handler(req, reply as unknown as FastifyReply);

    expect(reply.sentStatus).toBe(400);
    expect(reply.sentBody).toEqual({ message: 'Validation failed' });
  });

  test('should register multiple routes from a single map', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([
      ['health', publicRoute('GET', handler)],
      ['users', protectedRoute('GET', handler, 'admin')],
      ['users', protectedRoute('POST', handler, 'admin')],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    // Map deduplicates by key, so 'users' POST overwrites 'users' GET
    expect(routes).toHaveLength(2);
  });

  test('should handle null and undefined handler results gracefully', async () => {
    const nullHandler: RouteHandler = vi.fn(() => Promise.resolve(null));
    const undefinedHandler: RouteHandler = vi.fn(() => Promise.resolve(undefined));

    const routeMap = createRouteMap([
      ['null-route', publicRoute('GET', nullHandler)],
      ['void-route', publicRoute('GET', undefinedHandler)],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const reply1 = createMockReply();
    const reply2 = createMockReply();

    const route0 = routes[0];
    const route1 = routes[1];
    if (route0 === undefined || route1 === undefined) throw new Error('Routes not registered');
    const r1 = await route0.handler(
      createMockRequest(undefined),
      reply1 as unknown as FastifyReply,
    );
    const r2 = await route1.handler(
      createMockRequest(undefined),
      reply2 as unknown as FastifyReply,
    );

    // null/undefined are returned as-is (no { status, body } match)
    expect(r1).toBeNull();
    expect(r2).toBeUndefined();
    expect(reply1.sentStatus).toBeNull();
    expect(reply2.sentStatus).toBeNull();
  });

  test('should distinguish { status: number, body } from objects with status string', async () => {
    const handler: RouteHandler = vi.fn(() =>
      Promise.resolve({
        status: 'active',
        body: 'not-a-response-pattern',
      }),
    );

    const routeMap = createRouteMap([['test', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const reply = createMockReply();
    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    const result = await route.handler(
      createMockRequest(undefined),
      reply as unknown as FastifyReply,
    );

    // status is a string, not a number — should be returned raw
    expect(result).toEqual({ status: 'active', body: 'not-a-response-pattern' });
    expect(reply.sentStatus).toBeNull();
  });

  test('should feed route registry with metadata for each registered route', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const schema: ValidationSchema = { parse: vi.fn(), safeParse: vi.fn() };
    const routeMap = createRouteMap([
      ['auth/login', publicRoute('POST', handler, schema)],
      ['admin/users', protectedRoute('GET', handler, ['admin'])],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const registry = getRegisteredRoutes();
    expect(registry).toHaveLength(2);

    expect(registry[0]).toEqual({
      path: '/api/auth/login',
      method: 'POST',
      isPublic: true,
      roles: [],
      hasSchema: true,
      module: 'auth',
      deprecated: false,
    });

    expect(registry[1]).toEqual({
      path: '/api/admin/users',
      method: 'GET',
      isPublic: false,
      roles: ['admin'],
      hasSchema: false,
      module: 'admin',
      deprecated: false,
    });
  });

  test('should use explicit module from options when provided', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['health', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, { ...defaultOptions, module: 'system' });

    const registry = getRegisteredRoutes();
    expect(registry).toHaveLength(1);
    expect(registry[0]!.module).toBe('system');
  });

  test('should merge OpenAPI metadata into Fastify schema', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([
      [
        'health',
        publicRoute('GET', handler, undefined, {
          summary: 'Health check',
          tags: ['system'],
          response: { 200: { type: 'object', properties: { status: { type: 'string' } } } },
        }),
      ],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    const schema = route.schema as Record<string, unknown>;
    expect(schema['summary']).toBe('Health check');
    expect(schema['tags']).toEqual(['system']);
    expect(schema['response']).toBeDefined();
  });

  test('should pass OpenAPI summary and tags to route registry', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([
      [
        'test',
        publicRoute('GET', handler, undefined, {
          summary: 'Test endpoint',
          tags: ['test'],
        }),
      ],
    ]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const registry = getRegisteredRoutes();
    expect(registry[0]!.summary).toBe('Test endpoint');
    expect(registry[0]!.tags).toEqual(['test']);
  });
});
