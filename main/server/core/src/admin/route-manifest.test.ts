// main/server/core/src/admin/route-manifest.test.ts
/**
 * Tests for Route Manifest Handler
 */

import { afterEach, describe, expect, test } from 'vitest';

import { clearRegistry, registerRoute } from '../../../engine/src';

import { handleGetRouteManifest } from './route-manifest';

import type { RouteRegistryEntry } from '../../../engine/src';

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

describe('handleGetRouteManifest', () => {
  afterEach(() => {
    clearRegistry();
  });

  test('should return empty routes when no routes registered', async () => {
    const result = await handleGetRouteManifest();

    expect(result.status).toBe(200);
    expect(result.body.routes).toEqual([]);
    expect(result.body.count).toBe(0);
  });

  test('should return all registered routes with correct count', async () => {
    registerRoute(makeEntry({ path: '/api/auth/login', method: 'POST', module: 'auth' }));
    registerRoute(makeEntry({ path: '/api/users/me', method: 'GET', module: 'users' }));
    registerRoute(
      makeEntry({
        path: '/api/admin/users',
        method: 'GET',
        module: 'admin',
        isPublic: false,
        roles: ['admin'],
      }),
    );

    const result = await handleGetRouteManifest();

    expect(result.status).toBe(200);
    expect(result.body.count).toBe(3);
    expect(result.body.routes).toHaveLength(3);
    expect(result.body.routes[0]!.path).toBe('/api/auth/login');
    expect(result.body.routes[2]!.roles).toEqual(['admin']);
  });

  test('should include route metadata fields', async () => {
    registerRoute(
      makeEntry({
        path: '/api/auth/login',
        method: 'POST',
        isPublic: true,
        roles: [],
        hasSchema: true,
        module: 'auth',
      }),
    );

    const result = await handleGetRouteManifest();
    const route = result.body.routes[0]!;

    expect(route.path).toBe('/api/auth/login');
    expect(route.method).toBe('POST');
    expect(route.isPublic).toBe(true);
    expect(route.roles).toEqual([]);
    expect(route.hasSchema).toBe(true);
    expect(route.module).toBe('auth');
  });
});
