// src/server/core/src/auth/utils/response.test.ts
import { describe, expect, test } from 'vitest';

import { createAuthResponse } from './response';

import type { UserRole } from '@abe-stack/shared';

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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    test('should return correct user data', () => {
      const user = {
        id: 'user-456',
        email: 'john@example.com',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        role: 'admin' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.id).toBe('user-456');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.username).toBe('johndoe');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.role).toBe('admin');
    });
  });

  describe('user roles', () => {
    test('should handle user role', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        username: 'regularuser',
        firstName: 'Regular',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('user');
    });

    test('should handle admin role', () => {
      const user = {
        id: 'admin-123',
        email: 'admin@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('admin');
    });

    test('should handle moderator role', () => {
      const user = {
        id: 'mod-123',
        email: 'mod@example.com',
        username: 'moderator',
        firstName: 'Mod',
        lastName: 'Erator',
        avatarUrl: null,
        role: 'moderator' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.role).toBe('moderator');
    });
  });

  describe('name handling', () => {
    test('should include username, firstName, lastName in response', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.username).toBe('testuser');
      expect(result.user.firstName).toBe('Test');
      expect(result.user.lastName).toBe('User');
    });

    test('should handle empty string lastName', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'User',
        lastName: '',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.firstName).toBe('User');
      expect(result.user.lastName).toBe('');
    });
  });

  describe('immutability', () => {
    test('should not modify original user object', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(longToken, longToken, user);

      expect(result.accessToken).toBe(longToken);
      expect(result.refreshToken).toBe(longToken);
    });

    test('should handle special characters in user data', () => {
      const user = {
        id: 'user-with-unicode-\u00e9\u00e8',
        email: 'test+tag@example.com',
        username: 'special_user',
        firstName: 'Name with "quotes"',
        lastName: 'And <brackets>',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      expect(result.user.id).toBe('user-with-unicode-\u00e9\u00e8');
      expect(result.user.email).toBe('test+tag@example.com');
      expect(result.user.firstName).toBe('Name with "quotes"');
      expect(result.user.lastName).toBe('And <brackets>');
    });

    test('should handle UUID format ids', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
      };

      const result = createAuthResponse(mockAccessToken, mockRefreshToken, user);

      // Verify exact shape
      expect(Object.keys(result)).toEqual(['accessToken', 'refreshToken', 'user']);
      expect(Object.keys(result.user)).toEqual([
        'id',
        'email',
        'username',
        'firstName',
        'lastName',
        'avatarUrl',
        'role',
        'emailVerified',
        'phone',
        'phoneVerified',
        'dateOfBirth',
        'gender',
        'createdAt',
        'updatedAt',
      ]);
    });

    test('should not include extra properties from input', () => {
      const userWithExtra = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as UserRole,
        emailVerified: true,
        createdAt,
        updatedAt: createdAt,
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
