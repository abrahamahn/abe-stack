// apps/server/src/modules/users/__tests__/profile.service.test.ts
import { deleteAvatar, updateProfile, uploadAvatar } from '@users/profile.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { UserRepository } from '@abe-stack/db';
import type { Repositories, StorageProvider } from '@infrastructure';

describe('Profile Service', () => {
  const mockUsers: Partial<UserRepository> = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  const mockRepos = {
    users: mockUsers,
  } as unknown as Repositories;

  const mockStorage: Partial<StorageProvider> = {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    test('should update user name', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
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
      const updatedUser = { ...mockUser, name: 'New Name' };

      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);
      vi.mocked(mockUsers.update!).mockResolvedValue(updatedUser);

      const result = await updateProfile(mockRepos, 'user-123', { name: 'New Name' });

      expect(mockUsers.update).toHaveBeenCalledWith('user-123', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    test('should throw error when user not found', async () => {
      vi.mocked(mockUsers.findById!).mockResolvedValue(null);

      await expect(updateProfile(mockRepos, 'user-123', { name: 'New Name' })).rejects.toThrow(
        'User not found',
      );
    });

    test('should return unchanged user when no changes provided', async () => {
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);

      const result = await updateProfile(mockRepos, 'user-123', {});

      expect(mockUsers.update).not.toHaveBeenCalled();
      expect(result.name).toBe('Test User');
    });
  });

  describe('uploadAvatar', () => {
    test('should upload avatar and return signed URL', async () => {
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);
      vi.mocked(mockStorage.upload!).mockResolvedValue({ key: 'avatars/user-123/123.jpg' });
      vi.mocked(mockStorage.getSignedUrl!).mockResolvedValue(
        'https://storage.example.com/signed-url',
      );

      const file = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        size: 1024,
      };

      const result = await uploadAvatar(
        mockRepos,
        mockStorage as StorageProvider,
        'user-123',
        file,
      );

      expect(mockStorage.upload).toHaveBeenCalled();
      expect(mockUsers.update).toHaveBeenCalled();
      expect(result).toBe('https://storage.example.com/signed-url');
    });

    test('should throw error for invalid file type', async () => {
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);

      const file = {
        buffer: Buffer.from('fake-pdf-data'),
        mimetype: 'application/pdf',
        size: 1024,
      };

      await expect(
        uploadAvatar(mockRepos, mockStorage as StorageProvider, 'user-123', file),
      ).rejects.toThrow('Invalid file type');
    });

    test('should throw error for file too large', async () => {
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);

      const file = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
      };

      await expect(
        uploadAvatar(mockRepos, mockStorage as StorageProvider, 'user-123', file),
      ).rejects.toThrow('File too large');
    });
  });

  describe('deleteAvatar', () => {
    test('should clear avatar URL from user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'avatars/user-123/123.jpg',
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);

      await deleteAvatar(mockRepos, mockStorage as StorageProvider, 'user-123');

      expect(mockUsers.update).toHaveBeenCalledWith('user-123', { avatarUrl: null });
    });

    test('should do nothing when user has no avatar', async () => {
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
      vi.mocked(mockUsers.findById!).mockResolvedValue(mockUser);

      await deleteAvatar(mockRepos, mockStorage as StorageProvider, 'user-123');

      expect(mockUsers.update).not.toHaveBeenCalled();
    });
  });
});
