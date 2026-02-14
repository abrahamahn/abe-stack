// main/server/core/src/users/data-hygiene.test.ts
/**
 * Soft-Delete Enforcement Service Tests
 *
 * @module users/data-hygiene.test
 */

import { describe, expect, test } from 'vitest';

import { filterDeletedUsers, isUserDeleted } from './data-hygiene';

// ============================================================================
// Test Data
// ============================================================================

function makeUser(overrides: { deletedAt: Date | null }) {
  return {
    id: 'user-1',
    deletedAt: overrides.deletedAt,
  };
}

// ============================================================================
// Tests: isUserDeleted
// ============================================================================

describe('isUserDeleted', () => {
  test('should return true when deletedAt is set', () => {
    const user = makeUser({ deletedAt: new Date('2026-01-01') });
    expect(isUserDeleted(user)).toBe(true);
  });

  test('should return false when deletedAt is null', () => {
    const user = makeUser({ deletedAt: null });
    expect(isUserDeleted(user)).toBe(false);
  });
});

// ============================================================================
// Tests: filterDeletedUsers
// ============================================================================

describe('filterDeletedUsers', () => {
  test('should remove soft-deleted users from array', () => {
    const users = [
      { id: 'active-1', deletedAt: null },
      { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
      { id: 'active-2', deletedAt: null },
      { id: 'deleted-2', deletedAt: new Date('2026-01-15') },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(2);
    expect(result.map((u) => u.id)).toEqual(['active-1', 'active-2']);
  });

  test('should return empty array when all users are deleted', () => {
    const users = [
      { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
      { id: 'deleted-2', deletedAt: new Date('2026-01-15') },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(0);
  });

  test('should return all users when none are deleted', () => {
    const users = [
      { id: 'active-1', deletedAt: null },
      { id: 'active-2', deletedAt: null },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(2);
  });

  test('should return empty array for empty input', () => {
    const result = filterDeletedUsers([]);
    expect(result).toHaveLength(0);
  });
});
