// main/apps/web/src/features/auth/utils/redirects.test.ts
/**
 * Post-Login Redirect Utility Tests
 *
 * Tests for the redirect logic after successful authentication based on user roles.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { getPostLoginRedirect } from './redirects';

import type { AppRole, User, UserId } from '@abe-stack/shared';

describe('getPostLoginRedirect', () => {
  const createUser = (role: AppRole): User => ({
    id: 'user_123' as unknown as UserId,
    email: 'user@example.com',
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
      const userWithUnknownRole = createUser('superuser' as unknown as AppRole);
      const redirect = getPostLoginRedirect(userWithUnknownRole);
      expect(redirect).toBe('/settings');
    });

    it('should be case-sensitive for admin role', () => {
      const upperCaseAdmin = createUser('Admin' as unknown as AppRole);
      const redirect = getPostLoginRedirect(upperCaseAdmin);
      expect(redirect).toBe('/settings'); // Not '/admin' because 'Admin' !== 'admin'
    });

    it('should redirect guest role to settings', () => {
      const guestUser = createUser('guest' as unknown as AppRole);
      const redirect = getPostLoginRedirect(guestUser);
      expect(redirect).toBe('/settings');
    });
  });

  describe('returnTo parameter', () => {
    it('should honor valid returnTo path', () => {
      const redirect = getPostLoginRedirect(createUser('user'), '/dashboard');
      expect(redirect).toBe('/dashboard');
    });

    it('should honor returnTo with query params', () => {
      const redirect = getPostLoginRedirect(createUser('user'), '/settings?tab=security');
      expect(redirect).toBe('/settings?tab=security');
    });

    it('should honor returnTo over admin default', () => {
      const redirect = getPostLoginRedirect(createUser('admin'), '/dashboard');
      expect(redirect).toBe('/dashboard');
    });

    it('should accept deep nested path', () => {
      const redirect = getPostLoginRedirect(createUser('user'), '/workspace/123/settings');
      expect(redirect).toBe('/workspace/123/settings');
    });

    it('should reject protocol-relative URL (open redirect)', () => {
      const redirect = getPostLoginRedirect(createUser('user'), '//evil.com');
      expect(redirect).toBe('/settings');
    });

    it('should reject javascript: protocol', () => {
      const redirect = getPostLoginRedirect(createUser('user'), 'javascript:alert(1)');
      expect(redirect).toBe('/settings');
    });

    it('should reject data: protocol', () => {
      const redirect = getPostLoginRedirect(
        createUser('user'),
        'data:text/html,<script>alert(1)</script>',
      );
      expect(redirect).toBe('/settings');
    });

    it('should reject absolute URL', () => {
      const redirect = getPostLoginRedirect(createUser('user'), 'https://evil.com');
      expect(redirect).toBe('/settings');
    });

    it('should reject empty returnTo', () => {
      const redirect = getPostLoginRedirect(createUser('user'), '');
      expect(redirect).toBe('/settings');
    });

    it('should reject null returnTo', () => {
      const redirect = getPostLoginRedirect(createUser('user'), null);
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
