// main/server/db/src/utils/optimistic-lock.test.ts
import { describe, expect, test, vi } from 'vitest';

import {
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
} from './optimistic-lock';

import type { RawDb } from '../client';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a mock RawDb that returns predetermined values from queryOne.
 * Accepts an array of return values — one per sequential call.
 * @param responses - Ordered list of values queryOne will resolve to
 * @returns Mock RawDb with a spied queryOne method
 */
function createMockDb(responses: (Record<string, unknown> | null)[]): RawDb {
  let callIndex = 0;
  return {
    query: vi.fn(),
    queryOne: vi.fn().mockImplementation(() => {
      const value = responses[callIndex] ?? null;
      callIndex++;
      return Promise.resolve(value);
    }),
    execute: vi.fn(),
    raw: vi.fn(),
    transaction: vi.fn(),
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn(),
    withSession: vi.fn(),
  } as unknown as RawDb;
}

/** Snake-case user row as returned from the database */
const MOCK_USER_ROW: Record<string, unknown> = {
  id: 'user-123',
  email: 'test@example.com',
  canonical_email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  role: 'user',
  email_verified: false,
  email_verified_at: null,
  locked_until: null,
  lock_reason: null,
  failed_login_attempts: 0,
  totp_secret: null,
  totp_enabled: false,
  phone: null,
  phone_verified: null,
  date_of_birth: null,
  gender: null,
  city: null,
  state: null,
  country: null,
  bio: null,
  language: null,
  website: null,
  last_username_change: null,
  deactivated_at: null,
  deleted_at: null,
  deletion_grace_period_ends: null,
  token_version: 1,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-02'),
  version: 2,
};

// ============================================================================
// Tests
// ============================================================================

describe('OptimisticLockError', () => {
  test('should set name, statusCode, and currentVersion', () => {
    const error = new OptimisticLockError(5);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('OptimisticLockError');
    expect(error.statusCode).toBe(409);
    expect(error.currentVersion).toBe(5);
    expect(error.message).toBe('Record was modified by another request');
  });

  test('should accept a custom message', () => {
    const error = new OptimisticLockError(3, 'Custom conflict message');
    expect(error.message).toBe('Custom conflict message');
    expect(error.currentVersion).toBe(3);
  });
});

describe('isOptimisticLockError', () => {
  test('should return true for OptimisticLockError instances', () => {
    const error = new OptimisticLockError(1);
    expect(isOptimisticLockError(error)).toBe(true);
  });

  test('should return false for generic Error', () => {
    expect(isOptimisticLockError(new Error('generic'))).toBe(false);
  });

  test('should return false for non-error values', () => {
    expect(isOptimisticLockError(null)).toBe(false);
    expect(isOptimisticLockError(undefined)).toBe(false);
    expect(isOptimisticLockError('string')).toBe(false);
    expect(isOptimisticLockError(409)).toBe(false);
    expect(isOptimisticLockError({ statusCode: 409 })).toBe(false);
  });
});

describe('updateUserWithVersion', () => {
  test('should return the updated user on success', async () => {
    const db = createMockDb([MOCK_USER_ROW]);

    const result = await updateUserWithVersion(db, 'user-123', { firstName: 'New' }, 1);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
      }),
    );
    expect(db.queryOne).toHaveBeenCalledTimes(1);
  });

  test('should throw OptimisticLockError on version mismatch', async () => {
    // First call (UPDATE) returns null (no rows matched),
    // second call (SELECT version) returns current version
    const db = createMockDb([null, { version: 5 }]);

    await expect(updateUserWithVersion(db, 'user-123', { firstName: 'New' }, 1)).rejects.toThrow(
      OptimisticLockError,
    );

    try {
      await updateUserWithVersion(
        createMockDb([null, { version: 7 }]),
        'user-123',
        { firstName: 'X' },
        1,
      );
    } catch (error: unknown) {
      expect(isOptimisticLockError(error)).toBe(true);
      if (isOptimisticLockError(error)) {
        expect(error.currentVersion).toBe(7);
        expect(error.statusCode).toBe(409);
      }
    }
  });

  test('should throw Error when record is not found', async () => {
    // First call (UPDATE) returns null, second call (SELECT version) returns null
    const db = createMockDb([null, null]);

    await expect(updateUserWithVersion(db, 'nonexistent', { firstName: 'X' }, 1)).rejects.toThrow(
      'Record not found',
    );
    expect(db.queryOne).toHaveBeenCalledTimes(2);
  });

  test('should pass data through toSnakeCase for the update', async () => {
    const db = createMockDb([MOCK_USER_ROW]);

    await updateUserWithVersion(db, 'user-123', { firstName: 'Updated', email: 'new@test.com' }, 1);

    // The first queryOne call is the UPDATE — verify it was called
    expect(db.queryOne).toHaveBeenCalledTimes(1);
    const call = vi.mocked(db.queryOne).mock.calls[0];
    const queryResult = call?.[0] as { text: string; values: readonly unknown[] };

    // The SQL should reference the users table and contain SET with snake_case columns
    expect(queryResult.text).toContain('users');
    expect(queryResult.text).toContain('SET');
  });

  test('should convert the returned row to camelCase', async () => {
    const snakeRow: Record<string, unknown> = {
      id: 'user-456',
      email: 'camel@test.com',
      canonical_email: 'camel@test.com',
      username: 'cameluser',
      password_hash: 'hash123',
      first_name: 'Camel',
      last_name: 'User',
      avatar_url: 'https://example.com/pic.jpg',
      role: 'admin',
      email_verified: true,
      email_verified_at: new Date('2026-02-01'),
      locked_until: null,
      lock_reason: null,
      failed_login_attempts: 3,
      totp_secret: null,
      totp_enabled: false,
      phone: null,
      phone_verified: null,
      date_of_birth: null,
      gender: null,
      city: null,
      state: null,
      country: null,
      bio: null,
      language: null,
      website: null,
      last_username_change: null,
      deactivated_at: null,
      deleted_at: null,
      deletion_grace_period_ends: null,
      token_version: 1,
      created_at: new Date('2026-01-15'),
      updated_at: new Date('2026-02-05'),
      version: 10,
    };

    const db = createMockDb([snakeRow]);
    const result = await updateUserWithVersion(db, 'user-456', { role: 'admin' as const }, 9);

    expect(result.id).toBe('user-456');
    expect(result.passwordHash).toBe('hash123');
    expect(result.avatarUrl).toBe('https://example.com/pic.jpg');
    expect(result.emailVerified).toBe(true);
    expect(result.emailVerifiedAt).toEqual(new Date('2026-02-01'));
    expect(result.failedLoginAttempts).toBe(3);
    expect(result.version).toBe(10);
  });
});
