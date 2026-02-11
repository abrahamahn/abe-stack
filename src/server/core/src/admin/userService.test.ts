// src/server/core/src/admin/userService.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getUserById,
  getUserStatus,
  hardBanUser,
  listUsers,
  lockUser,
  searchUsers,
  unlockUser,
  updateUser,
} from './userService';

import type { DbClient, User as DbUser, UserRepository } from '@abe-stack/db';

// Mock external dependencies used by hardBanUser
vi.mock('../auth/utils', () => ({
  revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../auth/security/events', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Mock Factory
// ============================================================================

function createMockUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01'),
    lockedUntil: null,
    lockReason: null,
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
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
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
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        emailVerified: mockUser.emailVerified,
        emailVerifiedAt: mockUser.emailVerifiedAt?.toISOString() ?? null,
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: mockUser.failedLoginAttempts,
        phone: null,
        phoneVerified: false,
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
    test('should update user firstName and lastName', async () => {
      const mockUser = createMockUser();
      const updatedUser = createMockUser({ firstName: 'New', lastName: 'Name' });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepo.update).mockResolvedValue(updatedUser);

      const result = await updateUser(mockRepo, 'user-123', {
        firstName: 'New',
        lastName: 'Name',
      });

      expect(result.firstName).toBe('New');
      expect(result.lastName).toBe('Name');
      expect(mockRepo.update).toHaveBeenCalledWith('user-123', {
        firstName: 'New',
        lastName: 'Name',
      });
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

      await expect(updateUser(mockRepo, 'nonexistent', { firstName: 'Test' })).rejects.toThrow(
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: null,
        lockedUntil: futureDate,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('locked');
    });

    test('should return "unverified" when email not verified', () => {
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: false,
        emailVerifiedAt: null,
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('unverified');
    });

    test('should return "active" when user is verified and not locked', () => {
      const result = getUserStatus({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        lockedUntil: null,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
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
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        lockedUntil: pastDate,
        lockReason: null,
        failedLoginAttempts: 0,
        phone: null,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(result).toBe('active');
    });
  });

  describe('searchUsers', () => {
    test('should search by partial text and return paginated results', async () => {
      const mockUsers = [createMockUser()];
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: mockUsers,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'test');

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'test',
        page: 1,
        limit: 20,
      });
    });

    test('should perform exact ID match for UUID queries', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = createMockUser({ id: uuid });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);

      const result = await searchUsers(mockRepo, uuid);

      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.id).toBe(uuid);
      expect(result.total).toBe(1);
      expect(mockRepo.findById).toHaveBeenCalledWith(uuid);
      // Should not call listWithFilters for UUID queries
      expect(mockRepo.listWithFilters).not.toHaveBeenCalled();
    });

    test('should return empty results for UUID that does not match', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      const result = await searchUsers(mockRepo, uuid);

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('should respect custom limit and offset', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'john', { limit: 10, offset: 10 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'john',
        page: 2,
        limit: 10,
      });
    });

    test('should convert offset to page number', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        items: [],
        total: 0,
        page: 3,
        limit: 5,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      await searchUsers(mockRepo, 'test', { limit: 5, offset: 10 });

      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'test',
        page: 3,
        limit: 5,
      });
    });
  });

  describe('hardBanUser', () => {
    const mockDb = {} as DbClient;

    test('should revoke tokens, lock account, and schedule deletion', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepo.lockAccount).mockResolvedValue();
      vi.mocked(mockRepo.update).mockResolvedValue(mockUser);

      const result = await hardBanUser(
        mockDb,
        mockRepo,
        'user-123',
        'admin-456',
        'Severe ToS violation',
      );

      expect(result.message).toBe('User has been permanently banned');
      expect(result.gracePeriodEnds).toBeDefined();

      // Verify lock was called with permanent date and reason
      expect(mockRepo.lockAccount).toHaveBeenCalledWith(
        'user-123',
        new Date('2099-12-31T23:59:59.999Z'),
        'Severe ToS violation',
      );

      // Verify deletion scheduling
      expect(mockRepo.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          deletedAt: expect.any(Date) as Date,
          deletionGracePeriodEnds: expect.any(Date) as Date,
        }),
      );
    });

    test('should set grace period to 7 days from now', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepo.lockAccount).mockResolvedValue();
      vi.mocked(mockRepo.update).mockResolvedValue(mockUser);

      const before = Date.now();
      const result = await hardBanUser(mockDb, mockRepo, 'user-123', 'admin-456', 'Spam');
      const after = Date.now();

      const gracePeriodEnd = new Date(result.gracePeriodEnds).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      // Grace period should be approximately 7 days from now
      expect(gracePeriodEnd).toBeGreaterThanOrEqual(before + sevenDaysMs);
      expect(gracePeriodEnd).toBeLessThanOrEqual(after + sevenDaysMs);
    });

    test('should throw UserNotFoundError when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        hardBanUser(mockDb, mockRepo, 'nonexistent', 'admin-456', 'Test'),
      ).rejects.toThrow('User not found');
    });
  });
});
