// packages/db/src/repositories/users.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createRefreshTokenRepository,
  createUserRepository,
  type AdminUserListFilters,
} from './users';

import type { RawDb } from '../client';
import type { NewRefreshToken, NewUser, UpdateUser } from '../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  raw: vi.fn(),
  healthCheck: vi.fn(),
  getClient: vi.fn(),
});

// ============================================================================
// User Repository Tests
// ============================================================================

describe('UserRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createUserRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createUserRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return user when found', async () => {
      const mockUser: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'hash123',
        name: 'Test User',
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date('2024-01-01'),
        version: 1,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUser);

      const result = await repository.findById('user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: 'hash123',
        name: 'Test User',
        avatarUrl: null,
        role: 'user',
        emailVerified: true,
        emailVerifiedAt: mockUser['email_verified_at'],
        lockedUntil: null,
        failedLoginAttempts: 0,
        createdAt: mockUser['created_at'],
        updatedAt: mockUser['updated_at'],
        version: 1,
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when user not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });
  });

  describe('findByEmail', () => {
    test('should return user when found by email', async () => {
      const mockUser: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'hash123',
        name: 'Test User',
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date('2024-01-01'),
        version: 1,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('user@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('user@example.com');
      expect(result?.passwordHash).toBe('hash123');
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when user not found by email', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    test('should handle email case sensitivity', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await repository.findByEmail('User@Example.COM');

      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });
  });

  describe('create', () => {
    test('should create new user with required fields', async () => {
      const newUser: NewUser = {
        email: 'newuser@example.com',
        passwordHash: 'hash123',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'user-123',
        email: 'newuser@example.com',
        ['password_hash']: 'hash123',
        name: null,
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: false,
        ['email_verified_at']: null,
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
        version: 1,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newUser);

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('newuser@example.com');
      expect(result.passwordHash).toBe('hash123');
      expect(result.role).toBe('user');
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should create user with optional fields', async () => {
      const newUser: NewUser = {
        email: 'admin@example.com',
        passwordHash: 'hash456',
        name: 'Admin User',
        role: 'admin',
        emailVerified: true,
      };

      const mockCreated: Record<string, unknown> = {
        id: 'user-456',
        email: 'admin@example.com',
        ['password_hash']: 'hash456',
        name: 'Admin User',
        ['avatar_url']: null,
        role: 'admin',
        ['email_verified']: true,
        ['email_verified_at']: new Date(),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
        version: 1,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newUser);

      expect(result.name).toBe('Admin User');
      expect(result.role).toBe('admin');
      expect(result.emailVerified).toBe(true);
    });

    test('should throw error when creation fails', async () => {
      const newUser: NewUser = {
        email: 'fail@example.com',
        passwordHash: 'hash123',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newUser)).rejects.toThrow('Failed to create user');
    });
  });

  describe('update', () => {
    test('should update user fields', async () => {
      const updateData: UpdateUser = {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'hash123',
        name: 'Updated Name',
        ['avatar_url']: 'https://example.com/avatar.jpg',
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
        version: 2,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-123', updateData);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Name');
      expect(result?.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when user not found', async () => {
      const updateData: UpdateUser = {
        name: 'Updated Name',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.update('nonexistent', updateData);

      expect(result).toBeNull();
    });

    test('should update password hash', async () => {
      const updateData: UpdateUser = {
        passwordHash: 'newhash456',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'newhash456',
        name: 'Test User',
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
        version: 2,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-123', updateData);

      expect(result?.passwordHash).toBe('newhash456');
    });

    test('should update role', async () => {
      const updateData: UpdateUser = {
        role: 'admin',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'hash123',
        name: 'Test User',
        ['avatar_url']: null,
        role: 'admin',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
        version: 2,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('user-123', updateData);

      expect(result?.role).toBe('admin');
    });
  });

  describe('updateWithVersion', () => {
    test('should update user with version check', async () => {
      const updateData: UpdateUser = {
        name: 'Version Update',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'user-123',
        email: 'user@example.com',
        ['password_hash']: 'hash123',
        name: 'Version Update',
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
        version: 2,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.updateWithVersion('user-123', updateData, 1);

      expect(result).toBeDefined();
      expect(result?.version).toBe(2);
      expect(result?.name).toBe('Version Update');
    });

    test('should return null when version mismatch', async () => {
      const updateData: UpdateUser = {
        name: 'Version Update',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.updateWithVersion('user-123', updateData, 99);

      expect(result).toBeNull();
    });

    test('should increment version number', async () => {
      const updateData: UpdateUser = {
        email: 'newemail@example.com',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'user-123',
        email: 'newemail@example.com',
        ['password_hash']: 'hash123',
        name: 'Test User',
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date('2024-01-01'),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
        version: 6,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.updateWithVersion('user-123', updateData, 5);

      expect(result?.version).toBe(6);
    });
  });

  describe('delete', () => {
    test('should delete user and return true', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.delete('user-123');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when user not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    test('should return paginated users without cursor', async () => {
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          ['password_hash']: 'hash1',
          name: 'User 1',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-02'),
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-02'),
          ['updated_at']: new Date('2024-01-02'),
          version: 1,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          ['password_hash']: 'hash2',
          name: 'User 2',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-01'),
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockUsers);

      const result = await repository.list({ limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.email).toBe('user1@example.com');
      expect(result.nextCursor).toBeNull();
    });

    test('should handle cursor-based pagination', async () => {
      const mockUsers: Record<string, unknown>[] = [];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockUsers);

      const cursor = '2024-01-01T00:00:00.000Z_user-123';
      const result = await repository.list({ limit: 20, cursor });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    test('should indicate more items available', async () => {
      const mockUsers: Record<string, unknown>[] = Array.from({ length: 21 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        ['password_hash']: `hash${i}`,
        name: `User ${i}`,
        ['avatar_url']: null,
        role: 'user',
        ['email_verified']: true,
        ['email_verified_at']: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        ['locked_until']: null,
        ['failed_login_attempts']: 0,
        ['created_at']: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        ['updated_at']: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        version: 1,
      }));

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockUsers);

      const result = await repository.list({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();
      expect(result.nextCursor).toContain('user-19');
    });

    test('should support ascending direction', async () => {
      const mockUsers: Record<string, unknown>[] = [];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockUsers);

      await repository.list({ limit: 10, direction: 'asc' });

      expect(mockedQuery).toHaveBeenCalledOnce();
    });

    test('should handle empty cursor parts', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      await repository.list({ cursor: '_' });

      expect(mockedQuery).toHaveBeenCalledOnce();
    });
  });

  describe('existsByEmail', () => {
    test('should return true when email exists', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue({ exists: '1' });

      const result = await repository.existsByEmail('existing@example.com');

      expect(result).toBe(true);
    });

    test('should return false when email does not exist', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('listWithFilters', () => {
    test('should return paginated users without filters', async () => {
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          ['password_hash']: 'hash1',
          name: 'User 1',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-01'),
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue(mockUsers);
      mockedQueryOne.mockResolvedValue({ count: '1' });

      const result = await repository.listWithFilters({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    test('should filter by search term', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue([]);
      mockedQueryOne.mockResolvedValue({ count: '0' });

      const filters: AdminUserListFilters = {
        search: 'john',
      };

      const result = await repository.listWithFilters(filters);

      expect(result.items).toEqual([]);
      expect(mockedQuery).toHaveBeenCalledOnce();
    });

    test('should filter by role', async () => {
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'admin-1',
          email: 'admin@example.com',
          ['password_hash']: 'hash1',
          name: 'Admin User',
          ['avatar_url']: null,
          role: 'admin',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-01'),
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue(mockUsers);
      mockedQueryOne.mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = {
        role: 'admin',
      };

      const result = await repository.listWithFilters(filters);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.role).toBe('admin');
    });

    test('should filter by locked status', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'locked-1',
          email: 'locked@example.com',
          ['password_hash']: 'hash1',
          name: 'Locked User',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-01'),
          ['locked_until']: futureDate,
          ['failed_login_attempts']: 5,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue(mockUsers);
      mockedQueryOne.mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = {
        status: 'locked',
      };

      const result = await repository.listWithFilters(filters);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.lockedUntil).toEqual(futureDate);
    });

    test('should filter by unverified status', async () => {
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'unverified-1',
          email: 'unverified@example.com',
          ['password_hash']: 'hash1',
          name: 'Unverified User',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: false,
          ['email_verified_at']: null,
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue(mockUsers);
      mockedQueryOne.mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = {
        status: 'unverified',
      };

      const result = await repository.listWithFilters(filters);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.emailVerified).toBe(false);
    });

    test('should filter by active status', async () => {
      const mockUsers: Record<string, unknown>[] = [
        {
          id: 'active-1',
          email: 'active@example.com',
          ['password_hash']: 'hash1',
          name: 'Active User',
          ['avatar_url']: null,
          role: 'user',
          ['email_verified']: true,
          ['email_verified_at']: new Date('2024-01-01'),
          ['locked_until']: null,
          ['failed_login_attempts']: 0,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
          version: 1,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue(mockUsers);
      mockedQueryOne.mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = {
        status: 'active',
      };

      const result = await repository.listWithFilters(filters);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.emailVerified).toBe(true);
      expect(result.items[0]?.lockedUntil).toBeNull();
    });

    test('should handle sorting and pagination', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue([]);
      mockedQueryOne.mockResolvedValue({ count: '100' });

      const filters: AdminUserListFilters = {
        sortBy: 'email',
        sortOrder: 'asc',
        page: 2,
        limit: 10,
      };

      const result = await repository.listWithFilters(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    test('should combine multiple filters', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue([]);
      mockedQueryOne.mockResolvedValue({ count: '0' });

      const filters: AdminUserListFilters = {
        search: 'admin',
        role: 'admin',
        status: 'active',
      };

      await repository.listWithFilters(filters);

      expect(mockedQuery).toHaveBeenCalledOnce();
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should handle empty search string', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);

      mockedQuery.mockResolvedValue([]);
      mockedQueryOne.mockResolvedValue({ count: '0' });

      await repository.listWithFilters({ search: '' });

      expect(mockedQuery).toHaveBeenCalledOnce();
    });
  });

  describe('incrementFailedAttempts', () => {
    test('should increment failed login attempts', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.incrementFailedAttempts('user-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('resetFailedAttempts', () => {
    test('should reset failed attempts and unlock account', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.resetFailedAttempts('user-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('lockAccount', () => {
    test('should lock account until specified date', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const lockUntil = new Date(Date.now() + 3600000);
      await repository.lockAccount('user-123', lockUntil);

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('unlockAccount', () => {
    test('should unlock account and reset failed attempts', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.unlockAccount('user-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('verifyEmail', () => {
    test('should mark email as verified with timestamp', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.verifyEmail('user-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================================
// Refresh Token Repository Tests
// ============================================================================

describe('RefreshTokenRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createRefreshTokenRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createRefreshTokenRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return refresh token when found', async () => {
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['family_id']: 'family-789',
        token: 'refresh-token-abc',
        ['expires_at']: new Date('2024-12-31'),
        ['created_at']: new Date('2024-01-01'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findById('token-123');

      expect(result).toEqual({
        id: 'token-123',
        userId: 'user-456',
        familyId: 'family-789',
        token: 'refresh-token-abc',
        expiresAt: mockToken['expires_at'],
        createdAt: mockToken['created_at'],
      });
    });

    test('should return null when token not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByToken', () => {
    test('should return refresh token when found by token string', async () => {
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['family_id']: 'family-789',
        token: 'refresh-token-abc',
        ['expires_at']: new Date('2024-12-31'),
        ['created_at']: new Date('2024-01-01'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findByToken('refresh-token-abc');

      expect(result).toBeDefined();
      expect(result?.token).toBe('refresh-token-abc');
      expect(result?.userId).toBe('user-456');
    });

    test('should return null when token not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('should return all refresh tokens for user', async () => {
      const mockTokens: Record<string, unknown>[] = [
        {
          id: 'token-1',
          ['user_id']: 'user-456',
          ['family_id']: 'family-1',
          token: 'token-abc',
          ['expires_at']: new Date('2024-12-31'),
          ['created_at']: new Date('2024-01-02'),
        },
        {
          id: 'token-2',
          ['user_id']: 'user-456',
          ['family_id']: 'family-2',
          token: 'token-def',
          ['expires_at']: new Date('2024-12-31'),
          ['created_at']: new Date('2024-01-01'),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockTokens);

      const result = await repository.findByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('user-456');
      expect(result[1]?.userId).toBe('user-456');
    });

    test('should return empty array when no tokens found', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const result = await repository.findByUserId('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    test('should create new refresh token', async () => {
      const newToken: NewRefreshToken = {
        userId: 'user-456',
        token: 'new-refresh-token',
        expiresAt: new Date('2024-12-31'),
        familyId: 'family-789',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['family_id']: 'family-789',
        token: 'new-refresh-token',
        ['expires_at']: newToken.expiresAt,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.id).toBe('token-123');
      expect(result.userId).toBe('user-456');
      expect(result.token).toBe('new-refresh-token');
      expect(result.familyId).toBe('family-789');
    });

    test('should create token without family ID', async () => {
      const newToken: NewRefreshToken = {
        userId: 'user-456',
        token: 'standalone-token',
        expiresAt: new Date('2024-12-31'),
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['family_id']: null,
        token: 'standalone-token',
        ['expires_at']: newToken.expiresAt,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.familyId).toBeNull();
    });

    test('should throw error when creation fails', async () => {
      const newToken: NewRefreshToken = {
        userId: 'user-456',
        token: 'fail-token',
        expiresAt: new Date('2024-12-31'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newToken)).rejects.toThrow('Failed to create refresh token');
    });
  });

  describe('delete', () => {
    test('should delete token by ID and return true', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.delete('token-123');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when token not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByToken', () => {
    test('should delete token by token string and return true', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.deleteByToken('refresh-token-abc');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when token not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteByToken('nonexistent-token');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all tokens for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(5);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(5);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when no tokens found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(0);
    });
  });

  describe('deleteByFamilyId', () => {
    test('should delete all tokens in family', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(3);

      const count = await repository.deleteByFamilyId('family-789');

      expect(count).toBe(3);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when no tokens found in family', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.deleteByFamilyId('nonexistent-family');

      expect(count).toBe(0);
    });
  });

  describe('deleteExpired', () => {
    test('should delete expired tokens', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(42);

      const count = await repository.deleteExpired();

      expect(count).toBe(42);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when no expired tokens', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.deleteExpired();

      expect(count).toBe(0);
    });
  });
});
