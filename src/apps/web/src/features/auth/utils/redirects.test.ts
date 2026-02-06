// apps/web/src/features/auth/utils/redirects.test.ts
/**
 * Post-Login Redirect Utility Tests
 *
 * Tests for the redirect logic after successful authentication based on user roles.
 */

import { describe, expect, it } from 'vitest';

import { getPostLoginRedirect } from './redirects';

import type { User } from '@abe-stack/shared';

describe('getPostLoginRedirect', () => {
  const createUser = (role: any): User => ({
    id: 'user_123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: null,
    role,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });

  describe('admin users', () => {
    it('should redirect admin to admin dashboard', () => {
      const adminUser = createUser('admin');
      const redirect = getPostLoginRedirect(adminUser);
      expect(redirect).toBe('/admin');
    });
  });

  describe('regular users', () => {
    it('should redirect regular user to settings', () => {
      const regularUser = createUser('user');
      const redirect = getPostLoginRedirect(regularUser);
      expect(redirect).toBe('/settings');
    });

    it('should redirect moderator to settings', () => {
      const moderatorUser = createUser('moderator');
      const redirect = getPostLoginRedirect(moderatorUser);
      expect(redirect).toBe('/settings');
    });
  });

  describe('edge cases', () => {
    it('should redirect null user to settings', () => {
      const redirect = getPostLoginRedirect(null);
      expect(redirect).toBe('/settings');
    });

    it('should redirect undefined user to settings', () => {
      const redirect = getPostLoginRedirect(undefined);
      expect(redirect).toBe('/settings');
    });

    it('should redirect user without role to settings', () => {
      const userWithoutRole = {
        ...createUser('user'),
        role: undefined as unknown as string,
      };
      const redirect = getPostLoginRedirect(userWithoutRole);
      expect(redirect).toBe('/settings');
    });

    it('should redirect user with unknown role to settings', () => {
      const userWithUnknownRole = createUser('superuser');
      const redirect = getPostLoginRedirect(userWithUnknownRole);
      expect(redirect).toBe('/settings');
    });

    it('should be case-sensitive for admin role', () => {
      const upperCaseAdmin = createUser('Admin');
      const redirect = getPostLoginRedirect(upperCaseAdmin);
      expect(redirect).toBe('/settings'); // Not '/admin' because 'Admin' !== 'admin'
    });

    it('should redirect guest role to settings', () => {
      const guestUser = createUser('guest');
      const redirect = getPostLoginRedirect(guestUser);
      expect(redirect).toBe('/settings');
    });
  });

  describe('return values', () => {
    it('should always return a string', () => {
      const testCases: Array<User | null | undefined> = [
        createUser('admin'),
        createUser('user'),
        null,
        undefined,
      ];

      for (const testCase of testCases) {
        const result = getPostLoginRedirect(testCase);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should return valid route paths', () => {
      const testCases: Array<User | null | undefined> = [
        createUser('admin'),
        createUser('user'),
        null,
        undefined,
      ];

      for (const testCase of testCases) {
        const result = getPostLoginRedirect(testCase);
        expect(result).toMatch(/^\/\w+$/); // Starts with / and has alphanumeric characters
      }
    });
  });
});
