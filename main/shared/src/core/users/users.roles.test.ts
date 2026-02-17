// main/shared/src/core/users/users.roles.test.ts

/**
 * @file Unit Tests for User Roles
 * @description Tests for role-checking utilities and role enumeration.
 * @module Core/Users/Tests
 */

import { describe, expect, it } from 'vitest';

import { getAllRoles, getRoleDisplayName, isAdmin, isModerator, isUser } from './users.roles';

// ============================================================================
// isAdmin
// ============================================================================

describe('users.roles', () => {
  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
    });

    it('returns false for non-admin roles', () => {
      expect(isAdmin('user')).toBe(false);
      expect(isAdmin('moderator')).toBe(false);
    });
  });

  // ============================================================================
  // isModerator
  // ============================================================================

  describe('isModerator', () => {
    it('returns true for moderator role', () => {
      expect(isModerator('moderator')).toBe(true);
    });

    it('returns true for admin role (admins have moderator privileges)', () => {
      expect(isModerator('admin')).toBe(true);
    });

    it('returns false for user role', () => {
      expect(isModerator('user')).toBe(false);
    });
  });

  // ============================================================================
  // isUser
  // ============================================================================

  describe('isUser', () => {
    it('returns true for user role', () => {
      expect(isUser('user')).toBe(true);
    });

    it('returns false for admin and moderator roles', () => {
      expect(isUser('admin')).toBe(false);
      expect(isUser('moderator')).toBe(false);
    });
  });

  // ============================================================================
  // getRoleDisplayName
  // ============================================================================

  describe('getRoleDisplayName', () => {
    it('capitalizes role names', () => {
      expect(getRoleDisplayName('admin')).toBe('Admin');
      expect(getRoleDisplayName('user')).toBe('User');
      expect(getRoleDisplayName('moderator')).toBe('Moderator');
    });
  });

  // ============================================================================
  // getAllRoles
  // ============================================================================

  describe('getAllRoles', () => {
    it('returns all available roles', () => {
      const roles = getAllRoles();
      expect(roles).toContain('user');
      expect(roles).toContain('admin');
      expect(roles).toContain('moderator');
      expect(roles).toHaveLength(3);
    });

    it('returns a new array each time (no mutation risk)', () => {
      const roles1 = getAllRoles();
      const roles2 = getAllRoles();
      expect(roles1).not.toBe(roles2);
      expect(roles1).toEqual(roles2);
    });
  });
});
