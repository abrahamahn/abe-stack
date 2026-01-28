// apps/server/src/modules/users/service.test.ts
import { getUserById } from './service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { UserRepository } from '@abe-stack/db';

describe('Users Service', () => {
  // Mock UserRepository with findById method
  const mockUserRepo: Partial<UserRepository> = {
    findById: vi.fn(),
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
      vi.mocked(mockUserRepo.findById!).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo as UserRepository, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        createdAt: mockUser.createdAt,
      });
    });

    test('should return null when user not found', async () => {
      vi.mocked(mockUserRepo.findById!).mockResolvedValue(null);

      const result = await getUserById(mockUserRepo as UserRepository, 'nonexistent');

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
      vi.mocked(mockUserRepo.findById!).mockResolvedValue(mockUser);

      const result = await getUserById(mockUserRepo as UserRepository, 'user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        avatarUrl: null,
        role: 'admin',
        createdAt: mockUser.createdAt,
      });
    });

    test('should query with correct user id', async () => {
      vi.mocked(mockUserRepo.findById!).mockResolvedValue(null);

      await getUserById(mockUserRepo as UserRepository, 'specific-user-id');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('specific-user-id');
    });
  });
});
