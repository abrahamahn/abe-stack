// src/server/core/src/users/service.test.ts
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
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    listWithFilters: vi.fn(),
    lockAccount: vi.fn(),
    unlockAccount: vi.fn(),
    incrementTokenVersion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        canonicalEmail: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        passwordHash: 'hashed',
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: null,
        phoneVerified: false,
        dateOfBirth: null,
        gender: null,
        city: null,
        state: null,
        country: null,
        bio: null,
        language: null,
        website: null,
        lastUsernameChange: null,
        deactivatedAt: null,
        deletedAt: null,
        deletionGracePeriodEnds: null,
        tokenVersion: 0,
        version: 1,
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        phone: null,
        phoneVerified: false,
        dateOfBirth: null,
        gender: null,
        bio: null,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    test('should return null when user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null);

      const result = await getUserById(mockUserRepo, 'nonexistent');

      expect(result).toBeNull();
    });

    test('should convert dateOfBirth Date to ISO date string', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        canonicalEmail: 'test@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin' as const,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01'),
        passwordHash: 'hashed',
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        totpSecret: null,
        totpEnabled: false,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        city: null,
        state: null,
        country: null,
        bio: null,
        language: null,
        website: null,
        lastUsernameChange: null,
        deactivatedAt: null,
        deletedAt: null,
        deletionGracePeriodEnds: null,
        tokenVersion: 0,
        version: 1,
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: null,
        role: 'admin',
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: true,
        dateOfBirth: '1990-05-15',
        gender: 'male',
        bio: null,
        city: null,
        state: null,
        country: null,
        language: null,
        website: null,
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
