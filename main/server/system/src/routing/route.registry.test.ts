// main/server/system/src/routing/route.registry.test.ts
/**
 * Tests for Route Registry
 */

import { afterEach, describe, expect, test } from 'vitest';

import { clearRegistry, getRegisteredRoutes, registerRoute } from './route.registry';

import type { RouteRegistryEntry } from './route.registry';

// ============================================================================
// Helpers
// ============================================================================

function makeEntry(overrides: Partial<RouteRegistryEntry> = {}): RouteRegistryEntry {
  return {
    path: '/api/test',
    method: 'GET',
    isPublic: true,
    roles: [],
    hasSchema: false,
    module: 'test',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('route-registry', () => {
  afterEach(() => {
    clearRegistry();
  });

  test('should start with an empty registry', () => {
    expect(getRegisteredRoutes()).toEqual([]);
  });

  test('should register and retrieve a single route', () => {
    const entry = makeEntry({ path: '/api/auth/login', module: 'auth' });
    registerRoute(entry);

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0]).toEqual(entry);
  });

  test('should register multiple routes and preserve order', () => {
    registerRoute(makeEntry({ path: '/api/auth/login', method: 'POST', module: 'auth' }));
    registerRoute(makeEntry({ path: '/api/users/me', method: 'GET', module: 'users' }));
    registerRoute(makeEntry({ path: '/api/admin/users', method: 'GET', module: 'admin' }));

    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(3);
    expect(routes[0]!.path).toBe('/api/auth/login');
    expect(routes[1]!.path).toBe('/api/users/me');
    expect(routes[2]!.path).toBe('/api/admin/users');
  });

  test('should clear the registry', () => {
    registerRoute(makeEntry());
    registerRoute(makeEntry());
    expect(getRegisteredRoutes()).toHaveLength(2);

    clearRegistry();
    expect(getRegisteredRoutes()).toHaveLength(0);
  });

  test('should return a readonly reference that reflects new registrations', () => {
    const routes = getRegisteredRoutes();
    expect(routes).toHaveLength(0);

    registerRoute(makeEntry({ path: '/api/new', module: 'new' }));
    // The returned reference points to the same backing array
    expect(routes).toHaveLength(1);
  });
});
