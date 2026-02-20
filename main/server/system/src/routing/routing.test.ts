// main/server/system/src/routing/routing.test.ts
/**
 * Tests for Route Builders
 *
 * Verifies publicRoute, protectedRoute, createRouteMap.
 * registerRouteMap tests live in apps/server/src/http/router.test.ts
 * (Fastify-specific implementation).
 */

import { describe, expect, test, vi } from 'vitest';

import { createRouteMap, protectedRoute, publicRoute } from './routing';

import type { RouteHandler, ValidationSchema } from './routing';

// ============================================================================
// publicRoute / protectedRoute builders
// ============================================================================

describe('publicRoute', () => {
  test('creates a public route definition', () => {
    const handler: RouteHandler = vi.fn();
    const route = publicRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.isPublic).toBe(true);
    expect(route.handler).toBe(handler);
    expect(route.schema).toBeUndefined();
    expect(route.roles).toBeUndefined();
  });

  test('attaches schema when provided', () => {
    const handler: RouteHandler = vi.fn();
    const schema: ValidationSchema = { parse: vi.fn(), safeParse: vi.fn() };

    const route = publicRoute('POST', handler, schema);

    expect(route.schema).toBe(schema);
  });
});

describe('protectedRoute', () => {
  test('creates a protected route with no roles by default', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('GET', handler);

    expect(route.method).toBe('GET');
    expect(route.isPublic).toBe(false);
    expect(route.roles).toEqual([]);
  });

  test('accepts a single role string', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('POST', handler, 'admin');

    expect(route.roles).toEqual(['admin']);
  });

  test('accepts an array of roles', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('PUT', handler, ['admin', 'moderator']);

    expect(route.roles).toEqual(['admin', 'moderator']);
  });

  test('handles empty string role as no roles', () => {
    const handler: RouteHandler = vi.fn();
    const route = protectedRoute('DELETE', handler, '');

    expect(route.roles).toEqual([]);
  });

  test('attaches schema when provided', () => {
    const handler: RouteHandler = vi.fn();
    const schema: ValidationSchema = { parse: vi.fn(), safeParse: vi.fn() };

    const route = protectedRoute('PATCH', handler, [], schema);

    expect(route.schema).toBe(schema);
  });
});

// ============================================================================
// createRouteMap
// ============================================================================

describe('createRouteMap', () => {
  test('creates a Map from path/definition tuples', () => {
    const handler: RouteHandler = vi.fn();
    const map = createRouteMap([
      ['health', publicRoute('GET', handler)],
      ['users', protectedRoute('GET', handler, 'admin')],
    ]);

    expect(map.size).toBe(2);
    expect(map.has('health')).toBe(true);
    expect(map.has('users')).toBe(true);
  });

  test('returns empty map for empty input', () => {
    const map = createRouteMap([]);

    expect(map.size).toBe(0);
  });
});
