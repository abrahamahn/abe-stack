// server/core/src/users/service.test.ts
/**
 * Users Service Unit Tests
 *
 * Tests for user lookup and listing operations.
 *
 * @complexity O(1) per test - all operations are single-entity lookups
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getUserById } from './service';

import type { UserRepository } from '@abe-stack/db';

describe('Users Service', () => {
  // Mock UserRepository with all required methods
  const mockUserRepo: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listWithFilters: vi.fn(),
    lockAccount: vi.fn(),
    unlockAccount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        passwordHash: 'hashed',
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    test('should return null when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      const result = await getUserById(mockUserRepo, 'nonexistent');

      expect(result).toBeNull();
    });

    test('should handle user with null name', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        avatarUrl: null,
        role: 'admin' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        passwordHash: 'hashed',
        lockedUntil: null,
        failedLoginAttempts: 0,
        version: 1,
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        avatarUrl: null,
        role: 'admin',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    test('should query with correct user id', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      await getUserById(mockUserRepo, 'specific-user-id');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('specific-user-id');
    });
  });
});
