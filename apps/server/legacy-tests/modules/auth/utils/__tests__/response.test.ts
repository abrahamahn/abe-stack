// apps/server/src/modules/auth/utils/__tests__/response.test.ts
import { describe, expect, test } from 'vitest';

import { createAuthResponse } from '../response';

import type { UserRole } from '@abe-stack/core';

// ============================================================================
// Tests: createAuthResponse
// ============================================================================

describe('createAuthResponse', () => {
  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token';
  const mockRefreshToken = 'refresh-token-abc123';
  const createdAt = new Date('2024-01-01T00:00:00.000Z');

  describe('basic functionality', () => {
    test('should create response with all required fields', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    test('should return correct tokens', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    test('should return correct user data', () => {
      const user = {
        id: 'user-456',
        email: 'john@example.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'admin' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.id).toBe('user-456');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.name).toBe('John Doe');
      expect(result.user.role).toBe('admin');
    });
  });

  describe('user roles', () => {
    test('should handle user role', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Regular User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('user');
    });

    test('should handle admin role', () => {
      const user = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        avatarUrl: null,
        role: 'admin' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('admin');
    });

    test('should handle moderator role', () => {
      const user = {
        id: 'mod-123',
        email: 'mod@example.com',
        name: 'Moderator',
        avatarUrl: null,
        role: 'moderator' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('moderator');
    });
  });

  describe('null name handling', () => {
    test('should handle null name', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.name).toBeNull();
    });

    test('should handle empty string name', () => {
      // Empty string is technically a valid name value
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: '',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.name).toBe('');
    });
  });

  describe('immutability', () => {
    test('should not modify original user object', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const originalEmail = user.email;
      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      // Modify the result
      result.user.email = 'modified@example.com';

      // Original should be unchanged
      expect(user.email).toBe(originalEmail);
    });

    test('should create new user object', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user).not.toBe(user);
    });
  });

  describe('edge cases', () => {
    test('should handle empty tokens', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse('', '', user);

      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    test('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(longToken, longToken, user);

      expect(result.accessToken).toBe(longToken);
      expect(result.refreshToken).toBe(longToken);
    });

    test('should handle special characters in user data', () => {
      const user = {
        id: 'user-with-unicode-\u00e9\u00e8',
        email: 'test+tag@example.com',
        name: 'Name with "quotes" and <brackets>',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.id).toBe('user-with-unicode-\u00e9\u00e8');
      expect(result.user.email).toBe('test+tag@example.com');
      expect(result.user.name).toBe('Name with "quotes" and <brackets>');
    });

    test('should handle UUID format ids', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('response structure', () => {
    test('should have correct response shape', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      // Verify exact shape
      expect(Object.keys(result)).toEqual(['accessToken', 'refreshToken', 'user']);
      expect(Object.keys(result.user)).toEqual([
        'id',
        'email',
        'name',
        'avatarUrl',
        'role',
        'createdAt',
      ]);
    });

    test('should not include extra properties from input', () => {
      const userWithExtra = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as UserRole,
        createdAt,
        extraProp: 'should not be included',
        anotherProp: 123,
      };

      const result = createAuthResponse(
        mockAccessToken,
        mockRefreshToken,
        userWithExtra as Parameters<typeof createAuthResponse>[2],
      );

      expect(result.user).not.toHaveProperty('extraProp');
      expect(result.user).not.toHaveProperty('anotherProp');
    });
  });
});
