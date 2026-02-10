// src/server/db/src/schema/users.test.ts
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
} from './users';

/**
 * Creates a complete User object with sensible defaults.
 * Override any field by passing partial overrides.
 *
 * @param overrides - Partial fields to override
 * @returns Complete User object
 * @complexity O(1)
 */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: false,
    emailVerifiedAt: null,
    lockedUntil: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

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
        canonicalEmail: 'canonical_email',
        username: 'username',
        passwordHash: 'password_hash',
        firstName: 'first_name',
        lastName: 'last_name',
        avatarUrl: 'avatar_url',
        role: 'role',
        emailVerified: 'email_verified',
        emailVerifiedAt: 'email_verified_at',
        lockedUntil: 'locked_until',
        failedLoginAttempts: 'failed_login_attempts',
        totpSecret: 'totp_secret',
        totpEnabled: 'totp_enabled',
        lastUsernameChange: 'last_username_change',
        phone: 'phone',
        phoneVerified: 'phone_verified',
        dateOfBirth: 'date_of_birth',
        deactivatedAt: 'deactivated_at',
        deletedAt: 'deleted_at',
        deletionGracePeriodEnds: 'deletion_grace_period_ends',
        gender: 'gender',
        city: 'city',
        state: 'state',
        country: 'country',
        bio: 'bio',
        language: 'language',
        website: 'website',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        version: 'version',
      });
    });

    test('should map camelCase to snake_case correctly', () => {
      expect(USER_COLUMNS.passwordHash).toBe('password_hash');
      expect(USER_COLUMNS.firstName).toBe('first_name');
      expect(USER_COLUMNS.lastName).toBe('last_name');
      expect(USER_COLUMNS.avatarUrl).toBe('avatar_url');
      expect(USER_COLUMNS.canonicalEmail).toBe('canonical_email');
      expect(USER_COLUMNS.emailVerified).toBe('email_verified');
      expect(USER_COLUMNS.emailVerifiedAt).toBe('email_verified_at');
      expect(USER_COLUMNS.lockedUntil).toBe('locked_until');
      expect(USER_COLUMNS.failedLoginAttempts).toBe('failed_login_attempts');
      expect(USER_COLUMNS.phoneVerified).toBe('phone_verified');
      expect(USER_COLUMNS.dateOfBirth).toBe('date_of_birth');
      expect(USER_COLUMNS.createdAt).toBe('created_at');
      expect(USER_COLUMNS.updatedAt).toBe('updated_at');
    });

    test('should map simple columns to themselves', () => {
      expect(USER_COLUMNS.id).toBe('id');
      expect(USER_COLUMNS.email).toBe('email');
      expect(USER_COLUMNS.username).toBe('username');
      expect(USER_COLUMNS.role).toBe('role');
      expect(USER_COLUMNS.phone).toBe('phone');
      expect(USER_COLUMNS.gender).toBe('gender');
      expect(USER_COLUMNS.city).toBe('city');
      expect(USER_COLUMNS.state).toBe('state');
      expect(USER_COLUMNS.country).toBe('country');
      expect(USER_COLUMNS.bio).toBe('bio');
      expect(USER_COLUMNS.language).toBe('language');
      expect(USER_COLUMNS.website).toBe('website');
      expect(USER_COLUMNS.version).toBe('version');
    });

    test('should be a const object (readonly)', () => {
      // This tests that the object is marked as const and immutable
      // The TypeScript compiler ensures this, but we verify the structure
      const keys = Object.keys(USER_COLUMNS);
      expect(keys).toHaveLength(32);
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
        username: 'johndoe',
        passwordHash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        lockedUntil: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        city: null,
        state: null,
        country: null,
        bio: null,
        language: null,
        website: null,
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
        username: 'testuser',
        passwordHash: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        city: null,
        state: null,
        country: null,
        bio: null,
        language: null,
        website: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(userWithNulls.avatarUrl).toBeNull();
      expect(userWithNulls.emailVerifiedAt).toBeNull();
      expect(userWithNulls.lockedUntil).toBeNull();
      expect(userWithNulls.phone).toBeNull();
      expect(userWithNulls.phoneVerified).toBeNull();
    });

    test('should require all non-nullable fields', () => {
      // This is a compile-time test verified by TypeScript
      // Runtime test verifies structure exists
      const user: User = makeUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('failedLoginAttempts');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
      expect(user).toHaveProperty('version');
    });

    test('should support all UserRole values', () => {
      const userRole: User = makeUser({ role: 'user' });
      const adminRole: User = makeUser({ role: 'admin' });
      const moderatorRole: User = makeUser({ role: 'moderator' });

      expect(userRole.role).toBe('user');
      expect(adminRole.role).toBe('admin');
      expect(moderatorRole.role).toBe('moderator');
    });

    test('should have Date types for timestamp fields', () => {
      const now = new Date();
      const user: User = makeUser({
        emailVerified: true,
        emailVerifiedAt: now,
        lockedUntil: now,
        createdAt: now,
        updatedAt: now,
      });

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
        canonicalEmail: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hashed_password',
        firstName: 'New',
        lastName: 'User',
      };

      expect(minimalUser.email).toBe('new@example.com');
      expect(minimalUser.passwordHash).toBe('hashed_password');
      expect(minimalUser.username).toBe('newuser');
    });

    test('should accept all optional fields', () => {
      const fullUser: NewUser = {
        id: 'custom_id',
        email: 'new@example.com',
        canonicalEmail: 'new@example.com',
        username: 'janedoe',
        passwordHash: 'hashed_password',
        firstName: 'Jane',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'admin',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'female',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        bio: 'Software engineer',
        language: 'en',
        website: 'https://jane.dev',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(fullUser.id).toBe('custom_id');
      expect(fullUser.firstName).toBe('Jane');
      expect(fullUser.role).toBe('admin');
    });

    test('should allow null for nullable optional fields', () => {
      const userWithNulls: NewUser = {
        email: 'test@example.com',
        canonicalEmail: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerifiedAt: null,
        lockedUntil: null,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
      };

      expect(userWithNulls.avatarUrl).toBeNull();
      expect(userWithNulls.emailVerifiedAt).toBeNull();
      expect(userWithNulls.lockedUntil).toBeNull();
      expect(userWithNulls.phone).toBeNull();
    });

    test('should allow omitting auto-generated fields', () => {
      const user: NewUser = {
        email: 'test@example.com',
        canonicalEmail: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
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
        canonicalEmail: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
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

      const firstNameUpdate: UpdateUser = {
        firstName: 'New',
      };

      expect(emailUpdate.email).toBe('newemail@example.com');
      expect(firstNameUpdate.firstName).toBe('New');
    });

    test('should allow updating multiple fields', () => {
      const multiUpdate: UpdateUser = {
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'moderator',
        emailVerified: true,
        failedLoginAttempts: 0,
      };

      expect(multiUpdate.email).toBe('updated@example.com');
      expect(multiUpdate.firstName).toBe('Updated');
      expect(multiUpdate.role).toBe('moderator');
    });

    test('should allow setting nullable fields to null', () => {
      const clearFields: UpdateUser = {
        avatarUrl: null,
        emailVerifiedAt: null,
        lockedUntil: null,
        phone: null,
        gender: null,
      };

      expect(clearFields.avatarUrl).toBeNull();
      expect(clearFields.emailVerifiedAt).toBeNull();
      expect(clearFields.lockedUntil).toBeNull();
      expect(clearFields.phone).toBeNull();
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
        canonicalEmail: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: null,
        phoneVerified: null,
        dateOfBirth: null,
        gender: null,
        city: null,
        state: null,
        country: null,
        bio: null,
        language: null,
        website: null,
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
      const user: User = makeUser({ email: 'original@example.com', firstName: 'Original' });

      const update: UpdateUser = {
        email: user.email,
        firstName: 'New',
      };

      expect(update.email).toBe(user.email);
      expect(update.firstName).toBe('New');
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
      const user: User = makeUser({ failedLoginAttempts: 0 });

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
      const user: User = makeUser({
        lockedUntil: pastDate,
        failedLoginAttempts: 5,
      });

      expect(user.lockedUntil?.getFullYear()).toBe(2000);
    });
  });

  describe('String field boundaries', () => {
    test('should handle empty string values where strings are allowed', () => {
      const user: NewUser = {
        email: '',
        canonicalEmail: '',
        username: '',
        passwordHash: '',
        firstName: '',
        lastName: '',
      };

      expect(user.email).toBe('');
      expect(user.passwordHash).toBe('');
      expect(user.firstName).toBe('');
    });

    test('should handle very long string values', () => {
      const longString = 'a'.repeat(10000);
      const user: NewUser = {
        email: longString,
        canonicalEmail: longString,
        username: longString,
        passwordHash: longString,
        firstName: longString,
        lastName: longString,
        avatarUrl: longString,
      };

      expect(user.email).toHaveLength(10000);
      expect(user.firstName).toHaveLength(10000);
    });

    test('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
      const user: NewUser = {
        email: `test${specialChars}@example.com`,
        canonicalEmail: `test${specialChars}@example.com`,
        username: 'testuser',
        passwordHash: specialChars,
        firstName: specialChars,
        lastName: specialChars,
      };

      expect(user.firstName).toContain(specialChars);
    });

    test('should handle Unicode characters', () => {
      const user: NewUser = {
        email: 'test@例え.com',
        canonicalEmail: 'test@例え.com',
        username: 'tanaka',
        passwordHash: 'hash',
        firstName: '太郎',
        lastName: '田中',
      };

      expect(user.firstName).toBe('太郎');
      expect(user.lastName).toBe('田中');
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
      'canonicalEmail',
      'username',
      'passwordHash',
      'firstName',
      'lastName',
      'avatarUrl',
      'role',
      'emailVerified',
      'emailVerifiedAt',
      'lockedUntil',
      'failedLoginAttempts',
      'totpSecret',
      'totpEnabled',
      'lastUsernameChange',
      'phone',
      'phoneVerified',
      'dateOfBirth',
      'deactivatedAt',
      'deletedAt',
      'deletionGracePeriodEnds',
      'gender',
      'city',
      'state',
      'country',
      'bio',
      'language',
      'website',
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
      'canonicalEmail',
      'username',
      'passwordHash',
      'firstName',
      'lastName',
      'avatarUrl',
      'role',
      'emailVerified',
      'emailVerifiedAt',
      'lockedUntil',
      'failedLoginAttempts',
      'totpSecret',
      'totpEnabled',
      'lastUsernameChange',
      'phone',
      'phoneVerified',
      'dateOfBirth',
      'deactivatedAt',
      'deletedAt',
      'deletionGracePeriodEnds',
      'gender',
      'city',
      'state',
      'country',
      'bio',
      'language',
      'website',
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
