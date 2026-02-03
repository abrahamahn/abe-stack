// modules/admin/src/userService.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getUserById,
  getUserStatus,
  listUsers,
  lockUser,
  unlockUser,
  updateUser,
} from './userService';

import type { User as DbUser, UserRepository } from '@abe-stack/db';

// ============================================================================
// Mock Factory
// ============================================================================

function createMockUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hash',
    name: 'Test User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01'),
    lockedUntil: null,
    failedLoginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockUserRepository(): UserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateWithVersion: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    listWithFilters: vi.fn(),
    existsByEmail: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    resetFailedAttempts: vi.fn(),
    lockAccount: vi.fn(),
    unlockAccount: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as UserRepository;
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin User Service', () => {
  let mockRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    mockRepo = createMockUserRepository();
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    test('should return paginated users', async () => {
      const mockUsers = [
        createMockUser(),
        createMockUser({ id: 'user-456', email: 'other@example.com' }),
      ];
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: mockUsers,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await listUsers(mockRepo, {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(mockRepo.listWithFilters).toHaveBeenCalled();
    });

    test('should pass filters to repository', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      await listUsers(mockRepo, {
        search: 'test',
        role: 'admin',
        status: 'active',
        sortBy: 'email',
        sortOrder: 'asc',
        page: 2,
        limit: 10,
      });

      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'test',
        role: 'admin',
        status: 'active',
        sortBy: 'email',
        sortOrder: 'asc',
        page: 2,
        limit: 10,
      });
    });

    test('should convert DB user to AdminUser format', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await listUsers(mockRepo, {});

      expect(result.data[0]).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        emailVerified: mockUser.emailVerified,
        emailVerifiedAt: mockUser.emailVerifiedAt?.toISOString() ?? null,
        lockedUntil: null,
        failedLoginAttempts: mockUser.failedLoginAttempts,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);

      const result = await getUserById(mockRepo, 'user-123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(mockRepo.findById).toHaveBeenCalledWith('user-123');
    });

    test('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(getUserById(mockRepo, 'nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    test('should update user name', async () => {
      const mockUser = createMockUser();
      const updatedUser = createMockUser({ name: 'New Name' });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepo.update).mockResolvedValue(updatedUser);

      const result = await updateUser(mockRepo, 'user-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockRepo.update).toHaveBeenCalledWith('user-123', { name: 'New Name' });
    });

    test('should update user role', async () => {
      const mockUser = createMockUser();
      const updatedUser = createMockUser({ role: 'admin' });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepo.update).mockResolvedValue(updatedUser);

      const result = await updateUser(mockRepo, 'user-123', { role: 'admin' });

      expect(result.role).toBe('admin');
      expect(mockRepo.update).toHaveBeenCalledWith('user-123', { role: 'admin' });
    });

    test('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(updateUser(mockRepo, 'nonexistent', { name: 'Test' })).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('lockUser', () => {
    test('should lock user with duration', async () => {
      const mockUser = createMockUser();
      const lockedUser = createMockUser({ lockedUntil: new Date('2099-12-31') });
      vi.mocked(mockRepo.findById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(lockedUser);
      vi.mocked(mockRepo.lockAccount).mockResolvedValue();

      const result = await lockUser(mockRepo, 'user-123', 'Violation of terms', 60);

      expect(result.lockedUntil).not.toBeNull();
      expect(mockRepo.lockAccount).toHaveBeenCalled();
    });

    test('should lock user indefinitely when no duration provided', async () => {
      const mockUser = createMockUser();
      const lockedUser = createMockUser({ lockedUntil: new Date('2099-12-31') });
      vi.mocked(mockRepo.findById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(lockedUser);
      vi.mocked(mockRepo.lockAccount).mockResolvedValue();

      const result = await lockUser(mockRepo, 'user-123', 'Permanent ban');

      expect(result.lockedUntil).not.toBeNull();
      expect(mockRepo.lockAccount).toHaveBeenCalled();
    });

    test('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(lockUser(mockRepo, 'nonexistent', 'Test reason')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('unlockUser', () => {
    test('should unlock user', async () => {
      const lockedUser = createMockUser({ lockedUntil: new Date('2099-12-31') });
      const unlockedUser = createMockUser({ lockedUntil: null });
      vi.mocked(mockRepo.findById)
        .mockResolvedValueOnce(lockedUser)
        .mockResolvedValueOnce(unlockedUser);
      vi.mocked(mockRepo.unlockAccount).mockResolvedValue();

      const result = await unlockUser(mockRepo, 'user-123', 'User verified identity');

      expect(result.lockedUntil).toBeNull();
      expect(mockRepo.unlockAccount).toHaveBeenCalledWith('user-123');
    });

    test('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(unlockUser(mockRepo, 'nonexistent', 'Test reason')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getUserStatus', () => {
    test('should return "locked" when user is locked', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        name: null,
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: null,
        lockedUntil: futureDate,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('locked');
    });

    test('should return "unverified" when email not verified', () => {
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        name: null,
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('unverified');
    });

    test('should return "active" when user is verified and not locked', () => {
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        name: null,
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('active');
    });

    test('should return "active" when lock has expired', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        name: null,
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        lockedUntil: pastDate,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('active');
    });
  });
});
