// infra/users/src/routes.test.ts
/**
 * User Routes Tests
 *
 * Tests route registration, structure, and configuration.
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
      const expectedRoutes = ['users/me', 'users/list'];

      for (const route of expectedRoutes) {
        expect(userRoutes[route]).toBeDefined();
      }
    });

    test('should have correct number of routes', () => {
      expect(Object.keys(userRoutes)).toHaveLength(2);
    });
  });

  describe('Route Methods', () => {
    test('users/me should be GET', () => {
      expect(userRoutes['users/me']!.method).toBe('GET');
    });

    test('users/list should be GET', () => {
      expect(userRoutes['users/list']!.method).toBe('GET');
    });
  });

  describe('Route Authentication Requirements', () => {
    test('users/me should require user authentication', () => {
      expect(userRoutes['users/me']!.auth).toBe('user');
    });

    test('users/list should require admin authentication', () => {
      expect(userRoutes['users/list']!.auth).toBe('admin');
    });
  });

  describe('Route Schema Assignments', () => {
    test('users/me should not have a request body schema', () => {
      expect(userRoutes['users/me']!.schema).toBeUndefined();
    });

    test('users/list should not have a request body schema', () => {
      expect(userRoutes['users/list']!.schema).toBeUndefined();
    });
  });

  describe('Route Type Safety', () => {
    test('should have handler function defined', () => {
      expect(typeof userRoutes['users/me']!.handler).toBe('function');
      expect(typeof userRoutes['users/list']!.handler).toBe('function');
    });
  });
});
