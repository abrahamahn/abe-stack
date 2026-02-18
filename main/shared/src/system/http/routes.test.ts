// main/shared/src/system/http/routes.test.ts

import { describe, expect, it } from 'vitest';

import { createRouteMap, protectedRoute, publicRoute } from './routes';

import type { BaseRouteDefinition, HandlerContext, RouteResult } from './http';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeHandler(): (
  ctx: HandlerContext,
  body: unknown,
  request: unknown,
  reply: unknown,
) => Promise<RouteResult> {
  return (_ctx, _body, _request, _reply) => Promise.resolve({ status: 200, body: { ok: true } });
}

function makeSchema() {
  return {
    safeParse: (data: unknown) => ({ success: true as const, data }),
  };
}

// ---------------------------------------------------------------------------
// publicRoute
// ---------------------------------------------------------------------------

describe('publicRoute', () => {
  describe('when given valid inputs', () => {
    it('returns a route definition with the correct method', () => {
      const route = publicRoute('GET', makeHandler());
      expect(route.method).toBe('GET');
    });

    it('does not set auth field — route is public', () => {
      const route = publicRoute('POST', makeHandler());
      expect(route.auth).toBeUndefined();
    });

    it('omits schema property when schema argument is not provided', () => {
      const route = publicRoute('DELETE', makeHandler());
      expect('schema' in route).toBe(false);
    });

    it('attaches schema when provided', () => {
      const schema = makeSchema();
      const route = publicRoute('POST', makeHandler(), schema);
      expect(route.schema).toBe(schema);
    });

    it('accepts all valid HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
      for (const method of methods) {
        const route = publicRoute(method, makeHandler());
        expect(route.method).toBe(method);
      }
    });
  });

  describe('failure states', () => {
    it('does NOT validate that path has a leading slash — caller mistake is silent', () => {
      // publicRoute has no path argument — paths are only in createRouteMap.
      // Confirm the function signature does NOT accept a path parameter by
      // verifying the returned object has no path property.
      const route = publicRoute('GET', makeHandler());
      expect((route as unknown as Record<string, unknown>)['path']).toBeUndefined();
    });

    it('stores whatever handler is supplied without validation — null handler produces broken route', () => {
      // TypeScript prevents null at compile time, but at runtime (e.g. from JS
      // callers or misconfigured DI containers) no guard exists.
      const route = publicRoute('GET', null as unknown as BaseRouteDefinition['handler']);
      expect(route.handler).toBeNull();
    });

    it('stores an invalid HTTP method string without throwing — type safety is compile-time only', () => {
      const route = publicRoute('CONNECT' as unknown as 'GET', makeHandler());
      // Runtime performs no validation — value is stored as-is.
      expect(route.method).toBe('CONNECT');
    });

    it('schema property is NOT set when undefined is passed explicitly', () => {
      const route = publicRoute('GET', makeHandler(), undefined);
      expect('schema' in route).toBe(false);
    });

    it('does not throw when handler is an empty arrow function returning wrong shape', () => {
      const badHandler = () =>
        Promise.resolve({ status: 'oops', body: null } as unknown as RouteResult);
      expect(() => publicRoute('POST', badHandler)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// protectedRoute
// ---------------------------------------------------------------------------

describe('protectedRoute', () => {
  describe('when given valid inputs', () => {
    it('defaults auth to "user" when role is omitted', () => {
      const route = protectedRoute('GET', makeHandler());
      expect(route.auth).toBe('user');
    });

    it('sets auth to "admin" when role is "admin"', () => {
      const route = protectedRoute('POST', makeHandler(), undefined, 'admin');
      expect(route.auth).toBe('admin');
    });

    it('sets auth to "user" when role is explicitly "user"', () => {
      const route = protectedRoute('PUT', makeHandler(), makeSchema(), 'user');
      expect(route.auth).toBe('user');
    });

    it('attaches schema when provided', () => {
      const schema = makeSchema();
      const route = protectedRoute('PATCH', makeHandler(), schema, 'admin');
      expect(route.schema).toBe(schema);
    });

    it('omits schema property when schema is omitted', () => {
      const route = protectedRoute('DELETE', makeHandler());
      expect('schema' in route).toBe(false);
    });
  });

  describe('failure states', () => {
    it('does NOT reject an unsupported role value at runtime', () => {
      const route = protectedRoute(
        'GET',
        makeHandler(),
        undefined,
        'superuser' as unknown as 'admin',
      );
      // No runtime guard — the value is stored verbatim.
      expect(route.auth).toBe('superuser');
    });

    it('stores null handler without throwing', () => {
      const route = protectedRoute('GET', null as unknown as BaseRouteDefinition['handler']);
      expect(route.handler).toBeNull();
    });

    it('stores an invalid method string at runtime without throwing', () => {
      const route = protectedRoute('HEAD' as unknown as 'GET', makeHandler());
      expect(route.method).toBe('HEAD');
    });

    it('schema property absent when undefined passed explicitly', () => {
      const route = protectedRoute('POST', makeHandler(), undefined, 'admin');
      expect('schema' in route).toBe(false);
    });

    it('does NOT prevent auth field from being mutated after creation', () => {
      const route = protectedRoute('GET', makeHandler());
      // BaseRouteDefinition.auth is not readonly — mutation is possible.
      route.auth = 'admin';
      expect(route.auth).toBe('admin');
    });
  });
});

// ---------------------------------------------------------------------------
// createRouteMap
// ---------------------------------------------------------------------------

describe('createRouteMap', () => {
  describe('when given valid inputs', () => {
    it('returns a Map instance', () => {
      const map = createRouteMap([['/ping', publicRoute('GET', makeHandler())]]);
      expect(map).toBeInstanceOf(Map);
    });

    it('maps path to route definition', () => {
      const route = publicRoute('GET', makeHandler());
      const map = createRouteMap([['/health', route]]);
      expect(map.get('/health')).toBe(route);
    });

    it('stores multiple routes keyed by path', () => {
      const map = createRouteMap([
        ['/a', publicRoute('GET', makeHandler())],
        ['/b', protectedRoute('POST', makeHandler())],
        ['/c', protectedRoute('DELETE', makeHandler(), undefined, 'admin')],
      ]);
      expect(map.size).toBe(3);
    });
  });

  describe('failure states — no runtime guards exist', () => {
    it('returns an empty Map for an empty routes array', () => {
      const map = createRouteMap([]);
      expect(map.size).toBe(0);
    });

    it('silently deduplicates on duplicate paths — last entry wins, earlier entries are lost', () => {
      const first = publicRoute('GET', makeHandler());
      const second = publicRoute('POST', makeHandler());
      const map = createRouteMap([
        ['/duplicate', first],
        ['/duplicate', second],
      ]);
      // Map semantics: last write wins.
      expect(map.size).toBe(1);
      expect(map.get('/duplicate')).toBe(second);
      // The first definition is gone — no duplicate detection, no error.
    });

    it('does NOT validate that paths start with a leading slash', () => {
      // A path like "no-slash" is stored without complaint.
      const map = createRouteMap([['no-slash', publicRoute('GET', makeHandler())]]);
      expect(map.has('no-slash')).toBe(true);
    });

    it('stores an empty string as a path without throwing', () => {
      const map = createRouteMap([['', publicRoute('GET', makeHandler())]]);
      expect(map.has('')).toBe(true);
    });

    it('stores routes with conflicting methods on the same path — only last is kept', () => {
      // Same path, two different methods: GET then DELETE.
      // createRouteMap cannot distinguish — Map key is path only.
      const getRoute = publicRoute('GET', makeHandler());
      const deleteRoute = publicRoute('DELETE', makeHandler());
      const map = createRouteMap([
        ['/resource', getRoute],
        ['/resource', deleteRoute],
      ]);
      expect(map.size).toBe(1);
      // DELETE silently overwrites GET.
      expect(map.get('/resource')?.method).toBe('DELETE');
    });

    it('accepts null as a route definition without throwing', () => {
      expect(() =>
        createRouteMap([['/bad', null as unknown as BaseRouteDefinition]]),
      ).not.toThrow();
    });

    it('returns the raw Map — caller can mutate it after creation', () => {
      const map = createRouteMap([['/original', publicRoute('GET', makeHandler())]]);
      map.delete('/original');
      expect(map.size).toBe(0);
    });

    it('path with trailing slash is stored as a distinct key from path without', () => {
      // No normalisation occurs — "/path" and "/path/" are two different keys.
      const map = createRouteMap([
        ['/path', publicRoute('GET', makeHandler())],
        ['/path/', publicRoute('GET', makeHandler())],
      ]);
      expect(map.size).toBe(2);
    });
  });
});
