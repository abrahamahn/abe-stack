// main/server/core/src/media/routes.test.ts
/**
 * Media Routes Unit Tests
 *
 * Tests for route definitions, HTTP methods, authentication requirements,
 * and route handler invocation for all media endpoints.
 */

import { describe, expect, it } from 'vitest';

import { mediaRoutes } from './routes';

import type { MediaBaseRouteDefinition, MediaRouteMap } from './types';

// ============================================================================
// Tests: Route Map Structure
// ============================================================================

describe('mediaRoutes', () => {
  it('should be a valid route map object', () => {
    expect(mediaRoutes).toBeDefined();
    expect(typeof mediaRoutes).toBe('object');
  });

  it('should have all expected route paths', () => {
    const expectedPaths = ['media/upload', 'media/:id', 'media/:id/delete', 'media/:id/status'];

    for (const path of expectedPaths) {
      expect(mediaRoutes[path]).toBeDefined();
    }
  });

  it('should have exactly 4 routes', () => {
    const routeCount = Object.keys(mediaRoutes).length;

    expect(routeCount).toBe(4);
  });
});

// ============================================================================
// Tests: Route Definitions
// ============================================================================

describe('route definitions', () => {
  /**
   * Validate that a route definition has the expected structure.
   */
  function assertRouteDefinition(
    routes: MediaRouteMap,
    path: string,
    expectedMethod: MediaBaseRouteDefinition['method'],
    expectedAuth?: 'user' | 'admin',
  ): void {
    const route = routes[path];
    expect(route).toBeDefined();
    expect(route?.method).toBe(expectedMethod);
    expect(route?.handler).toBeTypeOf('function');

    if (expectedAuth !== undefined) {
      expect(route?.auth).toBe(expectedAuth);
    } else {
      expect(route?.auth).toBeUndefined();
    }
  }

  describe('media/upload', () => {
    it('should be a protected POST route requiring user auth', () => {
      assertRouteDefinition(mediaRoutes, 'media/upload', 'POST', 'user');
    });
  });

  describe('media/:id', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(mediaRoutes, 'media/:id', 'GET', 'user');
    });
  });

  describe('media/:id/delete', () => {
    it('should be a protected DELETE route requiring user auth', () => {
      assertRouteDefinition(mediaRoutes, 'media/:id/delete', 'DELETE', 'user');
    });
  });

  describe('media/:id/status', () => {
    it('should be a protected GET route requiring user auth', () => {
      assertRouteDefinition(mediaRoutes, 'media/:id/status', 'GET', 'user');
    });
  });
});

// ============================================================================
// Tests: All routes require authentication
// ============================================================================

describe('authentication requirements', () => {
  it('all routes should require user authentication', () => {
    for (const [, route] of Object.entries(mediaRoutes)) {
      expect(route.auth).toBe('user');
    }
  });
});
