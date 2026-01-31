// infra/db/src/schema/users.test.ts
/**
 * Unit tests for users schema type definitions
 *
 * Tests type correctness, constant values, and column mappings for the users
 * and refresh_tokens table schemas. Since this is a pure type definition file,
 * tests focus on runtime constant validation and structural correctness.
 *
 * @complexity O(1) - All tests are simple constant/type checks
 */

import { describe, expect, test } from 'vitest';

import {
  type NewRefreshToken,
  type NewUser,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
  type RefreshToken,
  type UpdateUser,
  USER_COLUMNS,
  type User,
  type UserRole,
  USERS_TABLE,
} from './users.js';

describe('Schema Constants', () => {
  describe('Table Names', () => {
    test('USERS_TABLE should be "users"', () => {
      expect(USERS_TABLE).toBe('users');
      expect(typeof USERS_TABLE).toBe('string');
    });

    test('REFRESH_TOKENS_TABLE should be "refresh_tokens"', () => {
      expect(REFRESH_TOKENS_TABLE).toBe('refresh_tokens');
      expect(typeof REFRESH_TOKENS_TABLE).toBe('string');
    });
  });

  describe('USER_COLUMNS', () => {
    test('should contain all user column mappings', () => {
      expect(USER_COLUMNS).toEqual({
        id: 'id',
        email: 'email',
        passwordHash: 'password_hash',
        name: 'name',
        avatarUrl: 'avatar_url',
        role: 'role',
        emailVerified: 'email_verified',
        emailVerifiedAt: 'email_verified_at',
        lockedUntil: 'locked_until',
        failedLoginAttempts: 'failed_login_attempts',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        version: 'version',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(USER_COLUMNS.passwordHash).toBe('password_hash');
      expect(USER_COLUMNS.avatarUrl).toBe('avatar_url');
      expect(USER_COLUMNS.emailVerified).toBe('email_verified');
      expect(USER_COLUMNS.emailVerifiedAt).toBe('email_verified_at');
      expect(USER_COLUMNS.lockedUntil).toBe('locked_until');
      expect(USER_COLUMNS.failedLoginAttempts).toBe('failed_login_attempts');
      expect(USER_COLUMNS.createdAt).toBe('created_at');
      expect(USER_COLUMNS.updatedAt).toBe('updated_at');
    });

    test('should map simple columns to themselves', () => {
      expect(USER_COLUMNS.id).toBe('id');
      expect(USER_COLUMNS.email).toBe('email');
      expect(USER_COLUMNS.name).toBe('name');
      expect(USER_COLUMNS.role).toBe('role');
      expect(USER_COLUMNS.version).toBe('version');
    });

    test('should be a const object (readonly)', () => {
      // This tests that the object is marked as const and immutable
      // The TypeScript compiler ensures this, but we verify the structure
      const keys = Object.keys(USER_COLUMNS);
      expect(keys).toHaveLength(13);
      expect(keys).toContain('id');
      expect(keys).toContain('email');
      expect(keys).toContain('passwordHash');
    });

    test('should have all values as strings', () => {
      const values = Object.values(USER_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(USER_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('REFRESH_TOKEN_COLUMNS', () => {
    test('should contain all refresh token column mappings', () => {
      expect(REFRESH_TOKEN_COLUMNS).toEqual({
        id: 'id',
        userId: 'user_id',
        familyId: 'family_id',
        token: 'token',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(REFRESH_TOKEN_COLUMNS.userId).toBe('user_id');
      expect(REFRESH_TOKEN_COLUMNS.familyId).toBe('family_id');
      expect(REFRESH_TOKEN_COLUMNS.expiresAt).toBe('expires_at');
      expect(REFRESH_TOKEN_COLUMNS.createdAt).toBe('created_at');
    });

    test('should map simple columns to themselves', () => {
      expect(REFRESH_TOKEN_COLUMNS.id).toBe('id');
      expect(REFRESH_TOKEN_COLUMNS.token).toBe('token');
    });

    test('should be a const object (readonly)', () => {
      const keys = Object.keys(REFRESH_TOKEN_COLUMNS);
      expect(keys).toHaveLength(6);
      expect(keys).toContain('id');
      expect(keys).toContain('userId');
      expect(keys).toContain('familyId');
    });

    test('should have all values as strings', () => {
      const values = Object.values(REFRESH_TOKEN_COLUMNS);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    test('should have unique column names', () => {
      const values = Object.values(REFRESH_TOKEN_COLUMNS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('User Type Structure', () => {
  describe('User interface', () => {
    test('should accept a valid complete user object', () => {
      const validUser: User = {
        id: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        version: 1,
      };

      expect(validUser.id).toBe('user_123');
      expect(validUser.email).toBe('test@example.com');
      expect(validUser.role).toBe('user');
    });

    test('should allow null for nullable fields', () => {
      const userWithNulls: User = {
        id: 'user_123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: null,
        avatarUrl: null,
        role: 'admin',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(userWithNulls.name).toBeNull();
      expect(userWithNulls.avatarUrl).toBeNull();
      expect(userWithNulls.emailVerifiedAt).toBeNull();
      expect(userWithNulls.lockedUntil).toBeNull();
    });

    test('should require all non-nullable fields', () => {
      // This is a compile-time test verified by TypeScript
      // Runtime test verifies structure exists
      const user: User = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('failedLoginAttempts');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      expect(user).toHaveProperty('version');
    });

    test('should support all UserRole values', () => {
      const userRole: User = {
        id: '1',
        email: 'user@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const adminRole: User = { ...userRole, role: 'admin' };
      const moderatorRole: User = { ...userRole, role: 'moderator' };

      expect(userRole.role).toBe('user');
      expect(adminRole.role).toBe('admin');
      expect(moderatorRole.role).toBe('moderator');
    });

    test('should have Date types for timestamp fields', () => {
      const now = new Date();
      const user: User = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: now,
        lockedUntil: now,
        failedLoginAttempts: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
      expect(user.lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('UserRole type', () => {
    test('should accept valid role strings', () => {
      const userRole: UserRole = 'user';
      const adminRole: UserRole = 'admin';
      const moderatorRole: UserRole = 'moderator';

      expect(userRole).toBe('user');
      expect(adminRole).toBe('admin');
      expect(moderatorRole).toBe('moderator');
    });

    test('should only allow defined role values', () => {
      // This is a compile-time check enforced by TypeScript
      const validRoles: UserRole[] = ['user', 'admin', 'moderator'];

      validRoles.forEach((role) => {
        expect(['user', 'admin', 'moderator']).toContain(role);
      });
    });
  });

  describe('NewUser interface', () => {
    test('should accept minimal required fields', () => {
      const minimalUser: NewUser = {
        email: 'new@example.com',
        passwordHash: 'hashed_password',
      };

      expect(minimalUser.email).toBe('new@example.com');
      expect(minimalUser.passwordHash).toBe('hashed_password');
    });

    test('should accept all optional fields', () => {
      const fullUser: NewUser = {
        id: 'custom_id',
        email: 'new@example.com',
        passwordHash: 'hashed_password',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(fullUser.id).toBe('custom_id');
      expect(fullUser.name).toBe('Jane Doe');
      expect(fullUser.role).toBe('admin');
    });

    test('should allow null for nullable optional fields', () => {
      const userWithNulls: NewUser = {
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        emailVerifiedAt: null,
        lockedUntil: null,
      };

      expect(userWithNulls.name).toBeNull();
      expect(userWithNulls.avatarUrl).toBeNull();
      expect(userWithNulls.emailVerifiedAt).toBeNull();
      expect(userWithNulls.lockedUntil).toBeNull();
    });

    test('should allow omitting auto-generated fields', () => {
      const user: NewUser = {
        email: 'test@example.com',
        passwordHash: 'hash',
        // id, createdAt, updatedAt, version omitted
      };

      expect(user.id).toBeUndefined();
      expect(user.createdAt).toBeUndefined();
      expect(user.updatedAt).toBeUndefined();
      expect(user.version).toBeUndefined();
    });

    test('should allow providing default values', () => {
      const userWithDefaults: NewUser = {
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'user',
        emailVerified: false,
        failedLoginAttempts: 0,
      };

      expect(userWithDefaults.role).toBe('user');
      expect(userWithDefaults.emailVerified).toBe(false);
      expect(userWithDefaults.failedLoginAttempts).toBe(0);
    });
  });

  describe('UpdateUser interface', () => {
    test('should allow updating a single field', () => {
      const emailUpdate: UpdateUser = {
        email: 'newemail@example.com',
      };

      const nameUpdate: UpdateUser = {
        name: 'New Name',
      };

      expect(emailUpdate.email).toBe('newemail@example.com');
      expect(nameUpdate.name).toBe('New Name');
    });

    test('should allow updating multiple fields', () => {
      const multiUpdate: UpdateUser = {
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'moderator',
        emailVerified: true,
        failedLoginAttempts: 0,
      };

      expect(multiUpdate.email).toBe('updated@example.com');
      expect(multiUpdate.name).toBe('Updated Name');
      expect(multiUpdate.role).toBe('moderator');
    });

    test('should allow setting nullable fields to null', () => {
      const clearFields: UpdateUser = {
        name: null,
        avatarUrl: null,
        emailVerifiedAt: null,
        lockedUntil: null,
      };

      expect(clearFields.name).toBeNull();
      expect(clearFields.avatarUrl).toBeNull();
      expect(clearFields.emailVerifiedAt).toBeNull();
      expect(clearFields.lockedUntil).toBeNull();
    });

    test('should allow empty update object', () => {
      const emptyUpdate: UpdateUser = {};

      expect(Object.keys(emptyUpdate)).toHaveLength(0);
    });

    test('should allow updating security-related fields', () => {
      const securityUpdate: UpdateUser = {
        failedLoginAttempts: 3,
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
      };

      expect(securityUpdate.failedLoginAttempts).toBe(3);
      expect(securityUpdate.lockedUntil).toBeInstanceOf(Date);
    });

    test('should allow resetting failed login attempts', () => {
      const resetAttempts: UpdateUser = {
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      expect(resetAttempts.failedLoginAttempts).toBe(0);
      expect(resetAttempts.lockedUntil).toBeNull();
    });

    test('should allow updating version for optimistic locking', () => {
      const versionUpdate: UpdateUser = {
        version: 2,
        updatedAt: new Date(),
      };

      expect(versionUpdate.version).toBe(2);
      expect(versionUpdate.updatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('RefreshToken Type Structure', () => {
  describe('RefreshToken interface', () => {
    test('should accept a valid complete refresh token object', () => {
      const validToken: RefreshToken = {
        id: 'token_123',
        userId: 'user_456',
        familyId: 'family_789',
        token: 'encrypted_token_value',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
        createdAt: new Date(),
      };

      expect(validToken.id).toBe('token_123');
      expect(validToken.userId).toBe('user_456');
      expect(validToken.familyId).toBe('family_789');
      expect(validToken.token).toBe('encrypted_token_value');
    });

    test('should allow null for familyId', () => {
      const tokenWithoutFamily: RefreshToken = {
        id: 'token_123',
        userId: 'user_456',
        familyId: null,
        token: 'encrypted_token_value',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      expect(tokenWithoutFamily.familyId).toBeNull();
    });

    test('should require all non-nullable fields', () => {
      const token: RefreshToken = {
        id: '1',
        userId: '2',
        familyId: null,
        token: 'token',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      expect(token).toHaveProperty('id');
      expect(token).toHaveProperty('userId');
      expect(token).toHaveProperty('familyId');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('expiresAt');
      expect(token).toHaveProperty('createdAt');
    });

    test('should have Date types for timestamp fields', () => {
      const now = new Date();
      const expiresAt = new Date(Date.now() + 86400000);
      const token: RefreshToken = {
        id: '1',
        userId: '2',
        familyId: null,
        token: 'token',
        expiresAt,
        createdAt: now,
      };

      expect(token.createdAt).toBeInstanceOf(Date);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('NewRefreshToken interface', () => {
    test('should accept minimal required fields', () => {
      const minimalToken: NewRefreshToken = {
        userId: 'user_123',
        token: 'encrypted_token',
        expiresAt: new Date(Date.now() + 86400000),
      };

      expect(minimalToken.userId).toBe('user_123');
      expect(minimalToken.token).toBe('encrypted_token');
      expect(minimalToken.expiresAt).toBeInstanceOf(Date);
    });

    test('should accept all optional fields', () => {
      const fullToken: NewRefreshToken = {
        id: 'custom_id',
        userId: 'user_123',
        familyId: 'family_456',
        token: 'encrypted_token',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      };

      expect(fullToken.id).toBe('custom_id');
      expect(fullToken.familyId).toBe('family_456');
      expect(fullToken.createdAt).toBeInstanceOf(Date);
    });

    test('should allow null for familyId', () => {
      const tokenWithoutFamily: NewRefreshToken = {
        userId: 'user_123',
        familyId: null,
        token: 'encrypted_token',
        expiresAt: new Date(),
      };

      expect(tokenWithoutFamily.familyId).toBeNull();
    });

    test('should allow omitting auto-generated fields', () => {
      const token: NewRefreshToken = {
        userId: 'user_123',
        token: 'token',
        expiresAt: new Date(),
        // id, createdAt omitted
      };

      expect(token.id).toBeUndefined();
      expect(token.createdAt).toBeUndefined();
    });

    test('should allow providing custom id and createdAt', () => {
      const customToken: NewRefreshToken = {
        id: 'custom_token_id',
        userId: 'user_123',
        token: 'token',
        expiresAt: new Date(),
        createdAt: new Date('2024-01-01'),
      };

      expect(customToken.id).toBe('custom_token_id');
      expect(customToken.createdAt).toBeInstanceOf(Date);
    });
  });
});

describe('Type Compatibility', () => {
  describe('User type conversions', () => {
    test('User should be assignable from NewUser with required fields', () => {
      const newUser: NewUser = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // This demonstrates that NewUser can become User when all fields are provided
      const user: User = newUser as User;

      expect(user.id).toBe('1');
      expect(user.email).toBe('test@example.com');
    });

    test('UpdateUser should accept partial User properties', () => {
      const user: User = {
        id: '1',
        email: 'original@example.com',
        passwordHash: 'hash',
        name: 'Original Name',
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const update: UpdateUser = {
        email: user.email,
        name: 'New Name',
      };

      expect(update.email).toBe(user.email);
      expect(update.name).toBe('New Name');
    });
  });

  describe('RefreshToken type conversions', () => {
    test('RefreshToken should be assignable from NewRefreshToken with required fields', () => {
      const newToken: NewRefreshToken = {
        id: '1',
        userId: '2',
        familyId: null,
        token: 'token',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      // This demonstrates that NewRefreshToken can become RefreshToken when all fields are provided
      const token: RefreshToken = newToken as RefreshToken;

      expect(token.id).toBe('1');
      expect(token.userId).toBe('2');
    });
  });
});

describe('Edge Cases', () => {
  describe('Boundary values', () => {
    test('should handle zero failed login attempts', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(user.failedLoginAttempts).toBe(0);
    });

    test('should handle large failed login attempts', () => {
      const update: UpdateUser = {
        failedLoginAttempts: 999999,
      };

      expect(update.failedLoginAttempts).toBe(999999);
    });

    test('should handle version number incrementing', () => {
      const versions: UpdateUser[] = [{ version: 1 }, { version: 100 }, { version: 999999 }];

      versions.forEach((v) => {
        expect(v.version).toBeGreaterThan(0);
      });
    });

    test('should handle far-future dates', () => {
      const farFuture = new Date('2099-12-31');
      const token: RefreshToken = {
        id: '1',
        userId: '2',
        familyId: null,
        token: 'token',
        expiresAt: farFuture,
        createdAt: new Date(),
      };

      expect(token.expiresAt.getFullYear()).toBe(2099);
    });

    test('should handle past dates for locked accounts', () => {
      const pastDate = new Date('2000-01-01');
      const user: User = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: null,
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: pastDate,
        failedLoginAttempts: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(user.lockedUntil?.getFullYear()).toBe(2000);
    });
  });

  describe('String field boundaries', () => {
    test('should handle empty string values where strings are allowed', () => {
      const user: NewUser = {
        email: '',
        passwordHash: '',
        name: '',
      };

      expect(user.email).toBe('');
      expect(user.passwordHash).toBe('');
      expect(user.name).toBe('');
    });

    test('should handle very long string values', () => {
      const longString = 'a'.repeat(10000);
      const user: NewUser = {
        email: longString,
        passwordHash: longString,
        name: longString,
        avatarUrl: longString,
      };

      expect(user.email).toHaveLength(10000);
      expect(user.name).toHaveLength(10000);
    });

    test('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
      const user: NewUser = {
        email: `test${specialChars}@example.com`,
        passwordHash: specialChars,
        name: specialChars,
      };

      expect(user.name).toContain(specialChars);
    });

    test('should handle Unicode characters', () => {
      const user: NewUser = {
        email: 'test@例え.com',
        passwordHash: 'hash',
        name: '田中太郎',
      };

      expect(user.name).toBe('田中太郎');
    });
  });

  describe('Role edge cases', () => {
    test('should handle role changes across all valid values', () => {
      const roles: UserRole[] = ['user', 'admin', 'moderator'];

      roles.forEach((role) => {
        const update: UpdateUser = { role };
        expect(['user', 'admin', 'moderator']).toContain(update.role);
      });
    });
  });
});

describe('Column Mapping Consistency', () => {
  test('USER_COLUMNS should map to all User interface fields', () => {
    const userFields: Array<keyof User> = [
      'id',
      'email',
      'passwordHash',
      'name',
      'avatarUrl',
      'role',
      'emailVerified',
      'emailVerifiedAt',
      'lockedUntil',
      'failedLoginAttempts',
      'createdAt',
      'updatedAt',
      'version',
    ];

    const columnKeys = Object.keys(USER_COLUMNS) as Array<keyof typeof USER_COLUMNS>;

    userFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('REFRESH_TOKEN_COLUMNS should map to all RefreshToken interface fields', () => {
    const tokenFields: Array<keyof RefreshToken> = [
      'id',
      'userId',
      'familyId',
      'token',
      'expiresAt',
      'createdAt',
    ];

    const columnKeys = Object.keys(REFRESH_TOKEN_COLUMNS) as Array<
      keyof typeof REFRESH_TOKEN_COLUMNS
    >;

    tokenFields.forEach((field) => {
      expect(columnKeys).toContain(field);
    });
  });

  test('USER_COLUMNS should not have any extra fields', () => {
    const expectedFields = [
      'id',
      'email',
      'passwordHash',
      'name',
      'avatarUrl',
      'role',
      'emailVerified',
      'emailVerifiedAt',
      'lockedUntil',
      'failedLoginAttempts',
      'createdAt',
      'updatedAt',
      'version',
    ];

    const actualFields = Object.keys(USER_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });

  test('REFRESH_TOKEN_COLUMNS should not have any extra fields', () => {
    const expectedFields = ['id', 'userId', 'familyId', 'token', 'expiresAt', 'createdAt'];

    const actualFields = Object.keys(REFRESH_TOKEN_COLUMNS);

    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
