// main/server/db/src/repositories/users/users.test.ts
/**
 * Tests for Users Repository
 *
 * Validates user CRUD operations including email-based lookups,
 * authentication-related fields (password, failed login attempts, account locks),
 * role management, paginated listing with filters, and account lock/unlock operations.
 */

import { MS_PER_DAY } from '@abe-stack/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createUserRepository } from './users';

import type { AdminUserListFilters } from './users';
import type { RawDb } from '../../client';
import type { User, NewUser, UpdateUser } from '../../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockUser: User = {
  id: 'usr-123',
  email: 'test@example.com',
  canonicalEmail: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  name: 'Test User',
  avatarUrl: null,
  role: 'user',
  emailVerified: false,
  emailVerifiedAt: null,
  lockedUntil: null,
  failedLoginAttempts: 0,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  version: 1,
};

const mockDbRow = {
  id: 'usr-123',
  email: 'test@example.com',
  canonical_email: 'test@example.com',
  password_hash: '$2b$10$hashedpassword',
  name: 'Test User',
  avatar_url: null,
  role: 'user',
  email_verified: false,
  email_verified_at: null,
  locked_until: null,
  failed_login_attempts: 0,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
  version: 1,
};

// ============================================================================
// Tests
// ============================================================================

describe('createUserRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('users'),
        }),
      );
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserRepository(mockDb);
      const result = await repo.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should query with canonical_email where clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.findByEmail('test@example.com');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('canonical_email'),
        }),
      );
    });

    it('should handle email case sensitivity correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.findByEmail('TEST@EXAMPLE.COM');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['test@example.com']),
        }),
      );
    });

    it('should transform snake_case database fields to camelCase', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findByEmail('test@example.com');

      expect(result?.passwordHash).toBe('$2b$10$hashedpassword');
      expect(result?.emailVerified).toBe(false);
      expect(result?.emailVerifiedAt).toBeNull();
      expect(result?.failedLoginAttempts).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return user when found by ID', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result).toEqual(mockUser);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('users'),
        }),
      );
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query with id where clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.findById('usr-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should handle verified user with verified timestamp', async () => {
      const verifiedRow = {
        ...mockDbRow,
        email_verified: true,
        email_verified_at: new Date('2024-01-15T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(verifiedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.emailVerified).toBe(true);
      expect(result?.emailVerifiedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should handle locked user account', async () => {
      const lockedRow = {
        ...mockDbRow,
        locked_until: new Date('2024-02-01T10:00:00Z'),
        failed_login_attempts: 5,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(lockedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.lockedUntil).toEqual(new Date('2024-02-01T10:00:00Z'));
      expect(result?.failedLoginAttempts).toBe(5);
    });

    it('should handle user with avatar URL', async () => {
      const rowWithAvatar = {
        ...mockDbRow,
        avatar_url: 'https://example.com/avatar.jpg',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithAvatar);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should handle admin role', async () => {
      const adminRow = { ...mockDbRow, role: 'admin' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(adminRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.role).toBe('admin');
    });

    it('should handle moderator role', async () => {
      const moderatorRow = { ...mockDbRow, role: 'moderator' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(moderatorRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.role).toBe('moderator');
    });
  });

  describe('create', () => {
    it('should insert and return new user', async () => {
      const newUser: NewUser = {
        email: 'new@example.com',
        canonicalEmail: 'new@example.com',
        passwordHash: '$2b$10$newhashedpassword',
        name: 'New User',
      };

      const createdRow = {
        ...mockDbRow,
        id: 'usr-new',
        email: 'new@example.com',
        password_hash: '$2b$10$newhashedpassword',
        name: 'New User',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(createdRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.create(newUser);

      expect(result.email).toBe('new@example.com');
      expect(result.name).toBe('New User');
      expect(result.passwordHash).toBe('$2b$10$newhashedpassword');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should create user with minimal required fields', async () => {
      const minimalUser: NewUser = {
        email: 'minimal@example.com',
        canonicalEmail: 'minimal@example.com',
        passwordHash: '$2b$10$hash',
      };

      const minimalRow = {
        ...mockDbRow,
        id: 'usr-minimal',
        email: 'minimal@example.com',
        password_hash: '$2b$10$hash',
        name: null,
        avatar_url: null,
        role: 'user',
        email_verified: false,
        email_verified_at: null,
        locked_until: null,
        failed_login_attempts: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.create(minimalUser);

      expect(result.email).toBe('minimal@example.com');
      expect(result.name).toBeNull();
      expect(result.avatarUrl).toBeNull();
      expect(result.emailVerified).toBe(false);
      expect(result.failedLoginAttempts).toBe(0);
    });

    it('should create user with custom ID', async () => {
      const userWithId: NewUser = {
        id: 'custom-usr-id',
        email: 'custom@example.com',
        canonicalEmail: 'custom@example.com',
        passwordHash: '$2b$10$hash',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        id: 'custom-usr-id',
        email: 'custom@example.com',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.create(userWithId);

      expect(result.id).toBe('custom-usr-id');
    });

    it('should create user with admin role', async () => {
      const adminUser: NewUser = {
        email: 'admin@example.com',
        canonicalEmail: 'admin@example.com',
        passwordHash: '$2b$10$hash',
        role: 'admin',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        email: 'admin@example.com',
        role: 'admin',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.create(adminUser);

      expect(result.role).toBe('admin');
    });

    it('should create user with email already verified', async () => {
      const verifiedUser: NewUser = {
        email: 'verified@example.com',
        canonicalEmail: 'verified@example.com',
        passwordHash: '$2b$10$hash',
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-01T10:00:00Z'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        email: 'verified@example.com',
        email_verified: true,
        email_verified_at: new Date('2024-01-01T10:00:00Z'),
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.create(verifiedUser);

      expect(result.emailVerified).toBe(true);
      expect(result.emailVerifiedAt).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should create user with avatar URL', async () => {
      const userWithAvatar: NewUser = {
        email: 'avatar@example.com',
        canonicalEmail: 'avatar@example.com',
        passwordHash: '$2b$10$hash',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        email: 'avatar@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.create(userWithAvatar);

      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserRepository(mockDb);

      await expect(
        repo.create({
          email: 'fail@example.com',
          canonicalEmail: 'fail@example.com',
          passwordHash: '$2b$10$hash',
        }),
      ).rejects.toThrow('Failed to create user');
    });

    it('should return RETURNING clause in query', async () => {
      const newUser: NewUser = {
        email: 'returning@example.com',
        canonicalEmail: 'returning@example.com',
        passwordHash: '$2b$10$hash',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.create(newUser);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('RETURNING'),
        }),
      );
    });

    it('should convert camelCase input to snake_case for database', async () => {
      const newUser: NewUser = {
        email: 'camel@example.com',
        canonicalEmail: 'camel@example.com',
        passwordHash: '$2b$10$hash',
        emailVerified: true,
        failedLoginAttempts: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.create(newUser);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return modified user', async () => {
      const updateData: UpdateUser = {
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const updatedRow = {
        ...mockDbRow,
        name: 'Updated Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.name).toBe('Updated Name');
      expect(result?.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserRepository(mockDb);
      const result = await repo.update('nonexistent', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should update email', async () => {
      const updateData: UpdateUser = {
        email: 'newemail@example.com',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        email: 'newemail@example.com',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.email).toBe('newemail@example.com');
    });

    it('should update password hash', async () => {
      const updateData: UpdateUser = {
        passwordHash: '$2b$10$newhashedpassword',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        password_hash: '$2b$10$newhashedpassword',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.passwordHash).toBe('$2b$10$newhashedpassword');
    });

    it('should verify email', async () => {
      const updateData: UpdateUser = {
        emailVerified: true,
        emailVerifiedAt: new Date('2024-01-15T10:00:00Z'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        email_verified: true,
        email_verified_at: new Date('2024-01-15T10:00:00Z'),
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.emailVerified).toBe(true);
      expect(result?.emailVerifiedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should lock user account', async () => {
      const updateData: UpdateUser = {
        lockedUntil: new Date('2024-02-01T10:00:00Z'),
        failedLoginAttempts: 5,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        locked_until: new Date('2024-02-01T10:00:00Z'),
        failed_login_attempts: 5,
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.lockedUntil).toEqual(new Date('2024-02-01T10:00:00Z'));
      expect(result?.failedLoginAttempts).toBe(5);
    });

    it('should unlock user account', async () => {
      const updateData: UpdateUser = {
        lockedUntil: null,
        failedLoginAttempts: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        locked_until: null,
        failed_login_attempts: 0,
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.lockedUntil).toBeNull();
      expect(result?.failedLoginAttempts).toBe(0);
    });

    it('should increment failed login attempts', async () => {
      const updateData: UpdateUser = {
        failedLoginAttempts: 3,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        failed_login_attempts: 3,
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.failedLoginAttempts).toBe(3);
    });

    it('should reset failed login attempts', async () => {
      const updateData: UpdateUser = {
        failedLoginAttempts: 0,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        failed_login_attempts: 0,
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.failedLoginAttempts).toBe(0);
    });

    it('should change user role', async () => {
      const updateData: UpdateUser = {
        role: 'admin',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        role: 'admin',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.role).toBe('admin');
    });

    it('should handle partial updates', async () => {
      const updateData: UpdateUser = {
        name: 'Only Name Updated',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        name: 'Only Name Updated',
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.name).toBe('Only Name Updated');
      expect(result?.email).toBe('test@example.com');
      expect(result?.passwordHash).toBe('$2b$10$hashedpassword');
    });

    it('should handle updating to null values', async () => {
      const updateData: UpdateUser = {
        name: null,
        avatarUrl: null,
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockDbRow,
        name: null,
        avatar_url: null,
      });

      const repo = createUserRepository(mockDb);
      const result = await repo.update('usr-123', updateData);

      expect(result?.name).toBeNull();
      expect(result?.avatarUrl).toBeNull();
    });

    it('should include RETURNING clause in query', async () => {
      const updateData: UpdateUser = {
        name: 'Updated Name',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.update('usr-123', updateData);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('RETURNING'),
        }),
      );
    });

    it('should include WHERE clause with user ID', async () => {
      const updateData: UpdateUser = {
        name: 'Updated Name',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.update('usr-123', updateData);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
        }),
      );
    });

    it('should convert camelCase input to snake_case for database', async () => {
      const updateData: UpdateUser = {
        emailVerified: true,
        failedLoginAttempts: 0,
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockDbRow);

      const repo = createUserRepository(mockDb);
      await repo.update('usr-123', updateData);

      expect(mockDb.queryOne).toHaveBeenCalled();
    });
  });

  describe('role handling', () => {
    it('should handle user role', async () => {
      const userRow = { ...mockDbRow, role: 'user' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(userRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.role).toBe('user');
    });

    it('should handle admin role', async () => {
      const adminRow = { ...mockDbRow, role: 'admin' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(adminRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.role).toBe('admin');
    });

    it('should handle moderator role', async () => {
      const moderatorRow = { ...mockDbRow, role: 'moderator' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(moderatorRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.role).toBe('moderator');
    });
  });

  describe('authentication fields', () => {
    it('should handle password hash correctly', async () => {
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      const rowWithHash = { ...mockDbRow, password_hash: bcryptHash };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithHash);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.passwordHash).toBe(bcryptHash);
    });

    it('should handle zero failed login attempts', async () => {
      const cleanRow = { ...mockDbRow, failed_login_attempts: 0 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(cleanRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.failedLoginAttempts).toBe(0);
    });

    it('should handle multiple failed login attempts', async () => {
      const failedRow = { ...mockDbRow, failed_login_attempts: 3 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(failedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.failedLoginAttempts).toBe(3);
    });

    it('should handle account lock expiry', async () => {
      const lockedRow = {
        ...mockDbRow,
        locked_until: new Date('2024-02-01T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(lockedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.lockedUntil).toEqual(new Date('2024-02-01T10:00:00Z'));
    });

    it('should handle unlocked account', async () => {
      const unlockedRow = { ...mockDbRow, locked_until: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(unlockedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.lockedUntil).toBeNull();
    });
  });

  describe('email verification', () => {
    it('should handle unverified email', async () => {
      const unverifiedRow = {
        ...mockDbRow,
        email_verified: false,
        email_verified_at: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(unverifiedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.emailVerified).toBe(false);
      expect(result?.emailVerifiedAt).toBeNull();
    });

    it('should handle verified email with timestamp', async () => {
      const verifiedRow = {
        ...mockDbRow,
        email_verified: true,
        email_verified_at: new Date('2024-01-15T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(verifiedRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.emailVerified).toBe(true);
      expect(result?.emailVerifiedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });
  });

  describe('profile fields', () => {
    it('should handle user with name', async () => {
      const rowWithName = { ...mockDbRow, name: 'John Doe' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithName);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.name).toBe('John Doe');
    });

    it('should handle user without name', async () => {
      const rowWithoutName = { ...mockDbRow, name: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithoutName);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.name).toBeNull();
    });

    it('should handle user with avatar URL', async () => {
      const rowWithAvatar = {
        ...mockDbRow,
        avatar_url: 'https://example.com/avatar.jpg',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithAvatar);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should handle user without avatar URL', async () => {
      const rowWithoutAvatar = { ...mockDbRow, avatar_url: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithoutAvatar);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.avatarUrl).toBeNull();
    });
  });

  describe('timestamp handling', () => {
    it('should preserve createdAt timestamp', async () => {
      const createdDate = new Date('2024-01-01T10:00:00Z');
      const rowWithCreatedAt = { ...mockDbRow, created_at: createdDate };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithCreatedAt);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.createdAt).toEqual(createdDate);
    });

    it('should preserve updatedAt timestamp', async () => {
      const updatedDate = new Date('2024-01-15T10:00:00Z');
      const rowWithUpdatedAt = { ...mockDbRow, updated_at: updatedDate };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rowWithUpdatedAt);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.updatedAt).toEqual(updatedDate);
    });
  });

  describe('version handling', () => {
    it('should handle initial version 1', async () => {
      const versionOneRow = { ...mockDbRow, version: 1 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(versionOneRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.version).toBe(1);
    });

    it('should handle incremented version', async () => {
      const versionFiveRow = { ...mockDbRow, version: 5 };
      vi.mocked(mockDb.queryOne).mockResolvedValue(versionFiveRow);

      const repo = createUserRepository(mockDb);
      const result = await repo.findById('usr-123');

      expect(result?.version).toBe(5);
    });
  });

  // ==========================================================================
  // listWithFilters
  // ==========================================================================

  describe('listWithFilters', () => {
    it('should return paginated users without filters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockUser);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should use default sorting by created_at desc', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters({});

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });

    it('should apply search filter on email and name using ILIKE', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const filters: AdminUserListFilters = { search: 'john' };
      const repo = createUserRepository(mockDb);
      await repo.listWithFilters(filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ILIKE'),
        }),
      );
    });

    it('should filter by role', async () => {
      const adminRow = { ...mockDbRow, role: 'admin' };
      vi.mocked(mockDb.query).mockResolvedValue([adminRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = { role: 'admin' };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.role).toBe('admin');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
        }),
      );
    });

    it('should filter by locked status', async () => {
      const futureDate = new Date(Date.now() + MS_PER_DAY);
      const lockedRow = { ...mockDbRow, locked_until: futureDate, failed_login_attempts: 5 };
      vi.mocked(mockDb.query).mockResolvedValue([lockedRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = { status: 'locked' };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.lockedUntil).toEqual(futureDate);
    });

    it('should filter by unverified status', async () => {
      const unverifiedRow = { ...mockDbRow, email_verified: false, email_verified_at: null };
      vi.mocked(mockDb.query).mockResolvedValue([unverifiedRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = { status: 'unverified' };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.emailVerified).toBe(false);
    });

    it('should filter by active status', async () => {
      const activeRow = {
        ...mockDbRow,
        email_verified: true,
        email_verified_at: new Date('2024-01-01'),
        locked_until: null,
      };
      vi.mocked(mockDb.query).mockResolvedValue([activeRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const filters: AdminUserListFilters = { status: 'active' };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.emailVerified).toBe(true);
      expect(result.data[0]?.lockedUntil).toBeNull();
    });

    it('should handle pagination with page and limit', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '100' });

      const filters: AdminUserListFilters = {
        page: 2,
        limit: 10,
      };

      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should include OFFSET in query for pagination', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '50' });

      const filters: AdminUserListFilters = { page: 3, limit: 10 };
      const repo = createUserRepository(mockDb);
      await repo.listWithFilters(filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('OFFSET'),
        }),
      );
    });

    it('should apply custom sorting', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const filters: AdminUserListFilters = {
        sortBy: 'email',
        sortOrder: 'asc',
      };

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters(filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const filters: AdminUserListFilters = {
        search: 'admin',
        role: 'admin',
        status: 'active',
      };

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters(filters);

      expect(mockDb.query).toHaveBeenCalledOnce();
      expect(mockDb.queryOne).toHaveBeenCalledOnce();
    });

    it('should handle empty search string gracefully', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters({ search: '' });

      expect(mockDb.query).toHaveBeenCalledOnce();
    });

    it('should return hasNext false on last page', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '5' });

      const filters: AdminUserListFilters = { page: 1, limit: 10 };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.hasNext).toBe(false);
      expect(result.totalPages).toBe(1);
    });

    it('should return hasPrev false on first page', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '50' });

      const filters: AdminUserListFilters = { page: 1, limit: 10 };
      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters(filters);

      expect(result.hasPrev).toBe(false);
    });

    it('should handle zero total results', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle null count row gracefully', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters({});

      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should transform all rows from snake_case to camelCase', async () => {
      const row2 = {
        ...mockDbRow,
        id: 'usr-456',
        email: 'user2@example.com',
        name: 'User Two',
      };
      vi.mocked(mockDb.query).mockResolvedValue([mockDbRow, row2]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '2' });

      const repo = createUserRepository(mockDb);
      const result = await repo.listWithFilters({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.passwordHash).toBe('$2b$10$hashedpassword');
      expect(result.data[1]?.email).toBe('user2@example.com');
    });

    it('should use SELECT query for data and COUNT query for total', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters({});

      // Data query goes through db.query (returns array)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );

      // Count query goes through db.queryOne (returns single row)
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('COUNT'),
        }),
      );
    });

    it('should escape LIKE wildcards in search input', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '0' });

      const repo = createUserRepository(mockDb);
      await repo.listWithFilters({ search: '50%_off' });

      // The search pattern should contain escaped wildcards
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([expect.stringContaining('50\\%\\_off')]),
        }),
      );
    });
  });

  // ==========================================================================
  // lockAccount
  // ==========================================================================

  describe('lockAccount', () => {
    it('should execute UPDATE with locked_until value', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const lockDate = new Date('2024-06-01T00:00:00Z');
      const repo = createUserRepository(mockDb);
      await repo.lockAccount('usr-123', lockDate);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should include WHERE clause with user ID', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const lockDate = new Date('2024-06-01T00:00:00Z');
      const repo = createUserRepository(mockDb);
      await repo.lockAccount('usr-123', lockDate);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
        }),
      );
    });

    it('should pass the lockedUntil date as a parameter', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const lockDate = new Date('2024-06-01T00:00:00Z');
      const repo = createUserRepository(mockDb);
      await repo.lockAccount('usr-123', lockDate);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([lockDate]),
        }),
      );
    });

    it('should resolve without returning a value', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserRepository(mockDb);
      await repo.lockAccount('usr-123', new Date());

      expect(mockDb.execute).toHaveBeenCalledOnce();
    });

    it('should handle locking a non-existent user gracefully', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserRepository(mockDb);
      await repo.lockAccount('nonexistent', new Date());

      expect(mockDb.execute).toHaveBeenCalledOnce();
    });
  });

  // ==========================================================================
  // unlockAccount
  // ==========================================================================

  describe('unlockAccount', () => {
    it('should execute UPDATE setting locked_until to null', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserRepository(mockDb);
      await repo.unlockAccount('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should include WHERE clause with user ID', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserRepository(mockDb);
      await repo.unlockAccount('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
        }),
      );
    });

    it('should set failed_login_attempts to 0', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserRepository(mockDb);
      await repo.unlockAccount('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([0]),
        }),
      );
    });

    it('should resolve without returning a value', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserRepository(mockDb);
      await repo.unlockAccount('usr-123');

      expect(mockDb.execute).toHaveBeenCalledOnce();
    });

    it('should handle unlocking a non-existent user gracefully', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserRepository(mockDb);
      await repo.unlockAccount('nonexistent');

      expect(mockDb.execute).toHaveBeenCalledOnce();
    });
  });
});
