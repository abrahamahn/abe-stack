// src/server/core/src/users/routes.test.ts
/**
 * User Routes Tests
 *
 * Tests route registration, structure, and configuration.
 * Covers both profile routes and session management routes.
 *
 * @module routes.test
 */

import { describe, expect, test, vi } from 'vitest';

// Use vi.hoisted to create mock functions that survive hoisting
const { mockGetUserById, mockListUsers } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  mockListUsers: vi.fn(),
}));

// Mock the service module
vi.mock('./service', () => ({
  getUserById: mockGetUserById,
  listUsers: mockListUsers,
}));

import { userRoutes } from './routes';

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('User Routes Definition', () => {
  describe('Route Map Structure', () => {
    test('should define all required user routes', () => {
      const expectedRoutes = [
        'users/me',
        'users/list',
        'users/me/profile-completeness',
        'users/me/username',
        'users/me/sessions',
        'users/me/sessions/count',
        'users/me/sessions/:id',
        'users/me/sessions/revoke-all',
        'users/me/deactivate',
        'users/me/delete',
        'users/me/reactivate',
      ];

      for (const route of expectedRoutes) {
        expect(userRoutes.get(route)).toBeDefined();
      }
    });

    test('should have correct number of routes', () => {
      expect(userRoutes.size).toBe(13);
    });
  });

  describe('Route Methods', () => {
    test('users/me should be GET', () => {
      expect(userRoutes.get('users/me')!.method).toBe('GET');
    });

    test('users/list should be GET', () => {
      expect(userRoutes.get('users/list')!.method).toBe('GET');
    });

    test('users/me/sessions should be GET', () => {
      expect(userRoutes.get('users/me/sessions')!.method).toBe('GET');
    });

    test('users/me/profile-completeness should be GET', () => {
      expect(userRoutes.get('users/me/profile-completeness')!.method).toBe('GET');
    });

    test('users/me/username should be PATCH', () => {
      expect(userRoutes.get('users/me/username')!.method).toBe('PATCH');
    });

    test('users/me/sessions/count should be GET', () => {
      expect(userRoutes.get('users/me/sessions/count')!.method).toBe('GET');
    });

    test('users/me/sessions/:id should be DELETE', () => {
      expect(userRoutes.get('users/me/sessions/:id')!.method).toBe('DELETE');
    });

    test('users/me/sessions/revoke-all should be POST', () => {
      expect(userRoutes.get('users/me/sessions/revoke-all')!.method).toBe('POST');
    });
  });

  describe('Route Authentication Requirements', () => {
    test('users/me should require user authentication', () => {
      const route = userRoutes.get('users/me')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/list should require admin authentication', () => {
      const route = userRoutes.get('users/list')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('admin');
    });

    test('users/me/sessions should require user authentication', () => {
      const route = userRoutes.get('users/me/sessions')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/me/profile-completeness should require user authentication', () => {
      const route = userRoutes.get('users/me/profile-completeness')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/me/username should require user authentication', () => {
      const route = userRoutes.get('users/me/username')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/me/sessions/count should require user authentication', () => {
      const route = userRoutes.get('users/me/sessions/count')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/me/sessions/:id should require user authentication', () => {
      const route = userRoutes.get('users/me/sessions/:id')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });

    test('users/me/sessions/revoke-all should require user authentication', () => {
      const route = userRoutes.get('users/me/sessions/revoke-all')!;
      expect(route.isPublic).toBe(false);
      expect(route.roles).toContain('user');
    });
  });

  describe('Route Schema Assignments', () => {
    test('users/me should not have a request body schema', () => {
      expect(userRoutes.get('users/me')!.schema).toBeUndefined();
    });

    test('users/list should not have a request body schema', () => {
      expect(userRoutes.get('users/list')!.schema).toBeUndefined();
    });

    test('session routes should not have request body schemas', () => {
      expect(userRoutes.get('users/me/profile-completeness')!.schema).toBeUndefined();
      expect(userRoutes.get('users/me/sessions')!.schema).toBeUndefined();
      expect(userRoutes.get('users/me/sessions/count')!.schema).toBeUndefined();
      expect(userRoutes.get('users/me/sessions/:id')!.schema).toBeUndefined();
      expect(userRoutes.get('users/me/sessions/revoke-all')!.schema).toBeUndefined();
    });
  });

  describe('Route Type Safety', () => {
    test('should have handler function defined for all routes', () => {
      expect(typeof userRoutes.get('users/me')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/list')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/profile-completeness')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/username')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/sessions')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/sessions/count')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/sessions/:id')!.handler).toBe('function');
      expect(typeof userRoutes.get('users/me/sessions/revoke-all')!.handler).toBe('function');
    });
  });
});
