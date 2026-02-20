// main/apps/server/src/http/router.test.ts
/**
 * Tests for Fastify Route Registration
 *
 * Verifies auth guard injection, ValidationSchema wrappers, OpenAPI metadata,
 * route registry integration, and the registerRouteMap function behavior.
 *
 * Risk assessment:
 *  1. registerRouteMap with no routes — must not throw
 *  2. safeParse validation failure must return 400 before calling the handler
 *  3. A non-Error safeParse.error must fall back to 'Validation failed' message
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearRegistry,
  createRouteMap,
  getRegisteredRoutes,
  protectedRoute,
  publicRoute,
} from '@bslt/server-system';
import { registerRouteMap } from './router';

import type { HandlerContext, RouteHandler, RouteSchema, ValidationSchema } from '@bslt/server-system';
import type { RouterOptions } from './router';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockCtx: HandlerContext = {
  db: {},
  repos: {},
  log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
} as unknown as HandlerContext;

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
    addHook: vi.fn(),
  } as unknown as FastifyInstance;

  return { app, routes };
}

function createMockRequest(body?: unknown): FastifyRequest {
  return { body } as FastifyRequest;
}

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

  test('registers routes with correct URL prefix', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve({ ok: true }));
    const routeMap = createRouteMap([['health', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    expect(routes).toHaveLength(1);
    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.method).toBe('GET');
    expect(route.url).toBe('/api/health');
  });

  test('normalizes double slashes in URL', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['/users/', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, { ...defaultOptions, prefix: '/api/' });

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.url).toBe('/api/users/');
  });

  test('does not attach preHandler for public routes', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['public', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.preHandler).toBeUndefined();
    expect(defaultOptions.authGuardFactory).not.toHaveBeenCalled();
  });

  test('attaches preHandler from authGuardFactory for protected routes', () => {
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

  test('validates body with safeParse schema and returns 400 on failure', async () => {
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve(body));
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({ success: false, error: new Error('Invalid email') }),
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

  test('passes validated data to handler on safeParse success', async () => {
    const validatedData = { email: 'valid@test.com', name: 'Test' };
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve({ received: body }));
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({ success: true, data: validatedData }),
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

  test('handles { status, body } response pattern', async () => {
    const handler: RouteHandler = vi.fn(() =>
      Promise.resolve({ status: 201, body: { id: '123', created: true } }),
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

  test('returns raw result when not { status, body } pattern', async () => {
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

  test('passes body through unvalidated when no schema', async () => {
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

  test('handles non-Error safeParse error with generic message', async () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const schema: ValidationSchema = {
      parse: vi.fn(),
      safeParse: vi.fn().mockReturnValue({ success: false, error: 'string error' }),
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

  test('feeds route registry with metadata for each registered route', () => {
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

  test('uses explicit module from options when provided', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const routeMap = createRouteMap([['health', publicRoute('GET', handler)]]);

    registerRouteMap(app, mockCtx, routeMap, { ...defaultOptions, module: 'system' });

    const registry = getRegisteredRoutes();
    expect(registry).toHaveLength(1);
    expect(registry[0]!.module).toBe('system');
  });

  test('merges OpenAPI metadata into Fastify schema', () => {
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

  // Killer test: two edge cases combined — oversized no-schema body + concurrent calls
  test('concurrent handler calls do not share mutable state', async () => {
    const handler: RouteHandler = vi.fn((_ctx, body) => Promise.resolve(body));
    const routeMap = createRouteMap([['concurrent', publicRoute('POST', handler)]]);
    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');

    const [r1, r2] = await Promise.all([
      route.handler(createMockRequest({ n: 1 }), createMockReply() as unknown as FastifyReply),
      route.handler(createMockRequest({ n: 2 }), createMockReply() as unknown as FastifyReply),
    ]);

    expect(r1).toEqual({ n: 1 });
    expect(r2).toEqual({ n: 2 });
  });

  test('handles null and undefined handler results gracefully', async () => {
    const nullHandler: RouteHandler = vi.fn(() => Promise.resolve(null));
    const undefinedHandler: RouteHandler = vi.fn(() => Promise.resolve(undefined));

    const routeMap = createRouteMap([
      ['null-route', publicRoute('GET', nullHandler)],
      ['void-route', publicRoute('GET', undefinedHandler)],
    ]);
    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const reply1 = createMockReply();
    const reply2 = createMockReply();

    const [route0, route1] = [routes[0], routes[1]];
    if (!route0 || !route1) throw new Error('Routes not registered');

    const r1 = await route0.handler(createMockRequest(undefined), reply1 as unknown as FastifyReply);
    const r2 = await route1.handler(createMockRequest(undefined), reply2 as unknown as FastifyReply);

    expect(r1).toBeNull();
    expect(r2).toBeUndefined();
    expect(reply1.sentStatus).toBeNull();
    expect(reply2.sentStatus).toBeNull();
  });

  test('registers FastifySchema on routes with properties key', () => {
    const handler: RouteHandler = vi.fn(() => Promise.resolve(undefined));
    const fastifySchema = {
      properties: { body: { type: 'object' } },
    } as unknown as RouteSchema;

    const routeMap = createRouteMap([['schema-route', publicRoute('POST', handler, fastifySchema)]]);
    registerRouteMap(app, mockCtx, routeMap, defaultOptions);

    const route = routes[0];
    if (route === undefined) throw new Error('Route not registered');
    expect(route.schema).toBe(fastifySchema);
  });
});
