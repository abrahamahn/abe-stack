// apps/server/src/infrastructure/data/database/schema/__tests__/users.test.ts
import { getTableName } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';

import { refreshTokens, users } from '../users';

// ============================================================================
// Tests: users schema
// ============================================================================

describe('users schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(users)).toBe('users');
  });

  test('should have id column as primary key', () => {
    const idColumn = users.id;
    expect(idColumn.name).toBe('id');
    // Drizzle reports 'string' for uuid columns at runtime
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.notNull).toBe(true);
    expect(idColumn.primary).toBe(true);
  });

  test('should have email column as unique and required', () => {
    const emailColumn = users.email;
    expect(emailColumn.name).toBe('email');
    expect(emailColumn.dataType).toBe('string');
    expect(emailColumn.notNull).toBe(true);
    expect(emailColumn.isUnique).toBe(true);
  });

  test('should have passwordHash column as required', () => {
    const passwordHashColumn = users.passwordHash;
    expect(passwordHashColumn.name).toBe('password_hash');
    expect(passwordHashColumn.dataType).toBe('string');
    expect(passwordHashColumn.notNull).toBe(true);
  });

  test('should have name column as nullable', () => {
    const nameColumn = users.name;
    expect(nameColumn.name).toBe('name');
    expect(nameColumn.dataType).toBe('string');
    expect(nameColumn.notNull).toBe(false);
  });

  test('should have role column with default value', () => {
    const roleColumn = users.role;
    expect(roleColumn.name).toBe('role');
    expect(roleColumn.dataType).toBe('string');
    expect(roleColumn.notNull).toBe(true);
    expect(roleColumn.hasDefault).toBe(true);
  });

  test('should have emailVerified column with default false', () => {
    const emailVerifiedColumn = users.emailVerified;
    expect(emailVerifiedColumn.name).toBe('email_verified');
    expect(emailVerifiedColumn.dataType).toBe('boolean');
    expect(emailVerifiedColumn.notNull).toBe(true);
    expect(emailVerifiedColumn.hasDefault).toBe(true);
  });

  test('should have emailVerifiedAt column as nullable', () => {
    const emailVerifiedAtColumn = users.emailVerifiedAt;
    expect(emailVerifiedAtColumn.name).toBe('email_verified_at');
    expect(emailVerifiedAtColumn.dataType).toBe('date');
    expect(emailVerifiedAtColumn.notNull).toBe(false);
  });

  test('should have lockedUntil column as nullable', () => {
    const lockedUntilColumn = users.lockedUntil;
    expect(lockedUntilColumn.name).toBe('locked_until');
    expect(lockedUntilColumn.dataType).toBe('date');
    expect(lockedUntilColumn.notNull).toBe(false);
  });

  test('should have failedLoginAttempts column with default 0', () => {
    const failedLoginAttemptsColumn = users.failedLoginAttempts;
    expect(failedLoginAttemptsColumn.name).toBe('failed_login_attempts');
    expect(failedLoginAttemptsColumn.dataType).toBe('number');
    expect(failedLoginAttemptsColumn.notNull).toBe(true);
    expect(failedLoginAttemptsColumn.hasDefault).toBe(true);
  });

  test('should have createdAt column with default now', () => {
    const createdAtColumn = users.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.dataType).toBe('date');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });

  test('should have updatedAt column with default now', () => {
    const updatedAtColumn = users.updatedAt;
    expect(updatedAtColumn.name).toBe('updated_at');
    expect(updatedAtColumn.dataType).toBe('date');
    expect(updatedAtColumn.notNull).toBe(true);
    expect(updatedAtColumn.hasDefault).toBe(true);
  });

  test('should have version column for optimistic concurrency control', () => {
    const versionColumn = users.version;
    expect(versionColumn.name).toBe('version');
    expect(versionColumn.dataType).toBe('number');
    expect(versionColumn.notNull).toBe(true);
    expect(versionColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: refreshTokens schema
// ============================================================================

describe('refreshTokens schema', () => {
  test('should have correct table name', () => {
    expect(getTableName(refreshTokens)).toBe('refresh_tokens');
  });

  test('should have id column as primary key', () => {
    const idColumn = refreshTokens.id;
    expect(idColumn.name).toBe('id');
    expect(idColumn.dataType).toBe('string');
    expect(idColumn.columnType).toBe('PgUUID');
    expect(idColumn.notNull).toBe(true);
    expect(idColumn.primary).toBe(true);
  });

  test('should have userId column with foreign key reference', () => {
    const userIdColumn = refreshTokens.userId;
    expect(userIdColumn.name).toBe('user_id');
    expect(userIdColumn.dataType).toBe('string');
    expect(userIdColumn.columnType).toBe('PgUUID');
    expect(userIdColumn.notNull).toBe(true);
  });

  test('should have familyId column as nullable (for reuse detection)', () => {
    const familyIdColumn = refreshTokens.familyId;
    expect(familyIdColumn.name).toBe('family_id');
    expect(familyIdColumn.dataType).toBe('string');
    expect(familyIdColumn.columnType).toBe('PgUUID');
    expect(familyIdColumn.notNull).toBe(false);
  });

  test('should have token column as unique', () => {
    const tokenColumn = refreshTokens.token;
    expect(tokenColumn.name).toBe('token');
    expect(tokenColumn.dataType).toBe('string');
    expect(tokenColumn.notNull).toBe(true);
    expect(tokenColumn.isUnique).toBe(true);
  });

  test('should have expiresAt column as required', () => {
    const expiresAtColumn = refreshTokens.expiresAt;
    expect(expiresAtColumn.name).toBe('expires_at');
    expect(expiresAtColumn.dataType).toBe('date');
    expect(expiresAtColumn.notNull).toBe(true);
  });

  test('should have createdAt column with default', () => {
    const createdAtColumn = refreshTokens.createdAt;
    expect(createdAtColumn.name).toBe('created_at');
    expect(createdAtColumn.dataType).toBe('date');
    expect(createdAtColumn.notNull).toBe(true);
    expect(createdAtColumn.hasDefault).toBe(true);
  });
});

// ============================================================================
// Tests: Type exports
// ============================================================================

describe('type exports', () => {
  test('should export User type (compile-time check)', () => {
    const user: import('../users').User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Test User',
      role: 'user',
      emailVerified: false,
      emailVerifiedAt: null,
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('user');
    expect(user.version).toBe(0);
  });

  test('should export NewUser type (compile-time check)', () => {
    // NewUser should allow omitting fields with defaults
    const newUser: import('../users').NewUser = {
      email: 'new@example.com',
      passwordHash: 'hashedpassword456',
    };
    expect(newUser.email).toBe('new@example.com');
    // Optional fields can be omitted
    expect(newUser.name).toBeUndefined();
  });

  test('should export RefreshToken type (compile-time check)', () => {
    const refreshToken: import('../users').RefreshToken = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      familyId: '123e4567-e89b-12d3-a456-426614174002',
      token: 'refresh-token-value',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    expect(refreshToken.token).toBe('refresh-token-value');
    expect(refreshToken.userId).toBeDefined();
  });

  test('should export NewRefreshToken type (compile-time check)', () => {
    const newRefreshToken: import('../users').NewRefreshToken = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      token: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    expect(newRefreshToken.token).toBe('new-refresh-token');
    // familyId is optional
    expect(newRefreshToken.familyId).toBeUndefined();
  });
});
