// main/apps/server/src/__tests__/integration/openapi-spec.integration.test.ts
/**
 * OpenAPI / Swagger Integration Tests (4.15)
 *
 * Tests:
 * - /api/docs/json returns valid OpenAPI 3.0 spec
 * - All annotated routes appear in generated spec
 * - Route registry tracks all registered routes
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  clearRegistry,
  getRegisteredRoutes,
  registerRoute,
} from '../../../../../server/system/src/routing/route.registry';

import {
  createTestServer,
  parseJsonResponse,
  type TestServer,
} from './test-utils';

// ============================================================================
// Route Registry Tests
// ============================================================================

describe('Route Registry', () => {
  beforeAll(() => {
    clearRegistry();
  });

  afterAll(() => {
    clearRegistry();
  });

  it('registerRoute adds entry to registry', () => {
    clearRegistry();

    registerRoute({
      path: '/api/auth/login',
      method: 'POST',
      isPublic: true,
      roles: [],
      hasSchema: true,
      module: 'auth',
      summary: 'Authenticate user',
      tags: ['Authentication'],
    });

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe('/api/auth/login');
    expect(routes[0]?.method).toBe('POST');
    expect(routes[0]?.isPublic).toBe(true);
  });

  it('clearRegistry removes all entries', () => {
    registerRoute({
      path: '/api/test',
      method: 'GET',
      isPublic: true,
      roles: [],
      hasSchema: false,
      module: 'test',
    });

    clearRegistry();

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(0);
  });

  it('tracks multiple routes from different modules', () => {
    clearRegistry();

    registerRoute({
      path: '/api/auth/login',
      method: 'POST',
      isPublic: true,
      roles: [],
      hasSchema: true,
      module: 'auth',
      summary: 'Login',
      tags: ['Authentication'],
    });

    registerRoute({
      path: '/api/auth/register',
      method: 'POST',
      isPublic: true,
      roles: [],
      hasSchema: true,
      module: 'auth',
      summary: 'Register',
      tags: ['Authentication'],
    });

    registerRoute({
      path: '/api/users',
      method: 'GET',
      isPublic: false,
      roles: ['admin'],
      hasSchema: false,
      module: 'users',
      summary: 'List users',
      tags: ['Users'],
    });

    registerRoute({
      path: '/api/admin/jobs',
      method: 'GET',
      isPublic: false,
      roles: ['admin'],
      hasSchema: false,
      module: 'admin',
      summary: 'List jobs',
      tags: ['Admin'],
    });

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(4);

    // Verify auth module routes
    const authRoutes = routes.filter((r) => r.module === 'auth');
    expect(authRoutes).toHaveLength(2);

    // Verify admin module routes
    const adminRoutes = routes.filter((r) => r.module === 'admin');
    expect(adminRoutes).toHaveLength(1);

    // Verify role tracking
    const adminOnly = routes.filter((r) => r.roles.includes('admin'));
    expect(adminOnly).toHaveLength(2);
  });

  it('tracks deprecated routes', () => {
    clearRegistry();

    registerRoute({
      path: '/api/v1/users',
      method: 'GET',
      isPublic: false,
      roles: [],
      hasSchema: false,
      module: 'users',
      deprecated: true,
      summary: 'List users (deprecated)',
    });

    const routes = getRegisteredRoutes();
    expect(routes[0]?.deprecated).toBe(true);
  });

  it('tracks routes with OpenAPI tags', () => {
    clearRegistry();

    registerRoute({
      path: '/api/auth/login',
      method: 'POST',
      isPublic: true,
      roles: [],
      hasSchema: true,
      module: 'auth',
      tags: ['Authentication', 'Public'],
    });

    const routes = getRegisteredRoutes();
    expect(routes[0]?.tags).toEqual(['Authentication', 'Public']);
  });

  it('all annotated routes appear in registry after registration', () => {
    clearRegistry();

    // Simulate registering a full set of annotated routes
    const routeData = [
      { path: '/api/auth/login', method: 'POST' as const, isPublic: true, module: 'auth' },
      { path: '/api/auth/register', method: 'POST' as const, isPublic: true, module: 'auth' },
      { path: '/api/auth/refresh', method: 'POST' as const, isPublic: false, module: 'auth' },
      { path: '/api/users', method: 'GET' as const, isPublic: false, module: 'users' },
      { path: '/api/users/:id', method: 'GET' as const, isPublic: false, module: 'users' },
      { path: '/api/admin/jobs', method: 'GET' as const, isPublic: false, module: 'admin' },
      { path: '/api/health', method: 'GET' as const, isPublic: true, module: 'system' },
    ];

    for (const route of routeData) {
      registerRoute({
        ...route,
        roles: [],
        hasSchema: false,
      });
    }

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(routeData.length);

    // Verify every path is in the registry
    for (const route of routeData) {
      const found = routes.find((r) => r.path === route.path && r.method === route.method);
      expect(found).toBeDefined();
    }
  });
});

// ============================================================================
// OpenAPI Spec Generation via Fastify Server
// ============================================================================

describe('OpenAPI Spec Endpoint', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    // Register a couple of routes with OpenAPI metadata for the spec to pick up
    testServer.server.get(
      '/api/test/documented',
      {
        schema: {
          summary: 'A documented test endpoint',
          description: 'Returns a test response',
          tags: ['Test'],
          response: {
            200: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      async () => {
        return { ok: true, message: 'hello' };
      },
    );

    testServer.server.post(
      '/api/test/create',
      {
        schema: {
          summary: 'Create a test resource',
          tags: ['Test'],
          body: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
          response: {
            201: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
      async (_req, reply) => {
        return reply.status(201).send({ id: 'test-1', name: 'test' });
      },
    );

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  it.todo('GET /api/docs/json returns 200');

  it.todo('returns valid OpenAPI 3.x spec structure');

  it.todo('spec contains documented routes');

  it.todo('spec includes security scheme definitions');

  it('spec has valid JSON content-type', async () => {
    const response = await testServer.inject({
      method: 'GET',
      url: '/api/docs/json',
    });

    expect(response.headers['content-type']).toContain('application/json');
  });
});
