// main/shared/src/core/users/users.permissions.test.ts

/**
 * @file Unit Tests for User Permissions
 * @description Tests for permission checks, ownership, and role helpers.
 * @module Core/Users/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  canUser,
  hasRole,
  isAdmin,
  isModerator,
  isOwner,
  isRegularUser,
} from './users.permissions';

import type { User } from './users.schemas';
import type { UserId } from '../../primitives/schema/ids';

// ============================================================================
// Test Data
// ============================================================================

function createUser(role: 'user' | 'admin' | 'moderator' = 'user'): User {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000' as User['id'],
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role,
    emailVerified: true,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// canUser
// ============================================================================

describe('users.permissions', () => {
  describe('canUser', () => {
    it('admin user can perform any action', () => {
      const admin = createUser('admin');
      expect(canUser(admin, 'read', 'data')).toBe(true);
      expect(canUser(admin, 'write', 'billing')).toBe(true);
      expect(canUser(admin, 'manage', 'tenant')).toBe(true);
    });

    it('regular user with tenant role can read data', () => {
      const user = createUser('user');
      expect(canUser(user, 'read', 'data', { tenantRole: 'member' })).toBe(true);
    });

    it('regular user without tenant role cannot access resources', () => {
      const user = createUser('user');
      expect(canUser(user, 'read', 'data')).toBe(false);
    });

    it('passes isOwner context to policy', () => {
      const user = createUser('user');
      expect(canUser(user, 'write', 'data', { tenantRole: 'member', isOwner: true })).toBe(true);
    });
  });

  // ============================================================================
  // isOwner
  // ============================================================================

  describe('isOwner', () => {
    it('returns true when user ID matches resource owner ID', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UserId;
      expect(isOwner(userId, userId)).toBe(true);
    });

    it('returns false when IDs differ', () => {
      const userId1 = '550e8400-e29b-41d4-a716-446655440000' as UserId;
      const userId2 = '550e8400-e29b-41d4-a716-446655440001' as UserId;
      expect(isOwner(userId1, userId2)).toBe(false);
    });
  });

  // ============================================================================
  // Role Checks
  // ============================================================================

  describe('hasRole', () => {
    it('returns true when user has matching role', () => {
      const admin = createUser('admin');
      expect(hasRole(admin, 'admin')).toBe(true);
    });

    it('returns false when user has different role', () => {
      const user = createUser('user');
      expect(hasRole(user, 'admin')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin users', () => {
      expect(isAdmin(createUser('admin'))).toBe(true);
    });

    it('returns false for non-admin users', () => {
      expect(isAdmin(createUser('user'))).toBe(false);
      expect(isAdmin(createUser('moderator'))).toBe(false);
    });
  });

  describe('isModerator', () => {
    it('returns true for moderator users', () => {
      expect(isModerator(createUser('moderator'))).toBe(true);
    });

    it('returns false for non-moderator users', () => {
      expect(isModerator(createUser('user'))).toBe(false);
      expect(isModerator(createUser('admin'))).toBe(false);
    });
  });

  describe('isRegularUser', () => {
    it('returns true for regular users', () => {
      expect(isRegularUser(createUser('user'))).toBe(true);
    });

    it('returns false for admin and moderator', () => {
      expect(isRegularUser(createUser('admin'))).toBe(false);
      expect(isRegularUser(createUser('moderator'))).toBe(false);
    });
  });
});
