// src/server/core/src/users/handlers/avatar.test.ts
/**
 * Avatar & Profile Service Unit Tests
 *
 * Tests for profile updates, password changes, and avatar management.
 *
 * @complexity O(1) per test - all operations are single-entity lookups/updates
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changePassword,
  deleteAvatar,
  getAvatarUrl,
  updateProfile,
  uploadAvatar,
  type ProfileUser,
  type StorageProvider,
  type UpdateProfileData,
} from './avatar';

import type { UsersAuthConfig } from '../types';
import type { DbClient, Repositories, User } from '@abe-stack/db';

// ============================================================================
// Mock Dependencies
// ============================================================================

const { mockValidatePassword, mockHashPassword, mockVerifyPassword, mockRevokeAllUserTokens } =
  vi.hoisted(() => ({
    mockValidatePassword: vi.fn(),
    mockHashPassword: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockRevokeAllUserTokens: vi.fn(),
  }));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    validatePassword: mockValidatePassword,
  };
});

vi.mock('../../auth', () => ({
  hashPassword: mockHashPassword,
  revokeAllUserTokens: mockRevokeAllUserTokens,
  verifyPassword: mockVerifyPassword,
}));

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Creates a complete mock DB user with all required fields.
 *
 * @param overrides - Fields to override from defaults
 * @returns Complete User object
 */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    role: 'user' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01'),
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
    ...overrides,
  };
}

const mockUser = createMockUser();

const mockAuthConfig: UsersAuthConfig = {
  argon2: {
    type: 2,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  },
};

function createMockRepos(): Repositories {
  return {
    users: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      listWithFilters: vi.fn(),
      lockAccount: vi.fn(),
      unlockAccount: vi.fn(),
      incrementTokenVersion: vi.fn(),
    },
    refreshTokens: {} as Repositories['refreshTokens'],
    refreshTokenFamilies: {} as Repositories['refreshTokenFamilies'],
    loginAttempts: {} as Repositories['loginAttempts'],
    passwordResetTokens: {} as Repositories['passwordResetTokens'],
    emailVerificationTokens: {} as Repositories['emailVerificationTokens'],
    securityEvents: {} as Repositories['securityEvents'],
    totpBackupCodes: {} as Repositories['totpBackupCodes'],
    emailChangeTokens: {} as Repositories['emailChangeTokens'],
    emailChangeRevertTokens: {} as Repositories['emailChangeRevertTokens'],
    magicLinkTokens: {} as Repositories['magicLinkTokens'],
    oauthConnections: {} as Repositories['oauthConnections'],
    apiKeys: {} as Repositories['apiKeys'],
    pushSubscriptions: {} as Repositories['pushSubscriptions'],
    notificationPreferences: {} as Repositories['notificationPreferences'],
    plans: {} as Repositories['plans'],
    subscriptions: {} as Repositories['subscriptions'],
    customerMappings: {} as Repositories['customerMappings'],
    invoices: {} as Repositories['invoices'],
    paymentMethods: {} as Repositories['paymentMethods'],
    billingEvents: {} as Repositories['billingEvents'],
    userSessions: {} as Repositories['userSessions'],
    tenants: {} as Repositories['tenants'],
    memberships: {} as Repositories['memberships'],
    invitations: {} as Repositories['invitations'],
    notifications: {} as Repositories['notifications'],
    auditEvents: {} as Repositories['auditEvents'],
    jobs: {} as Repositories['jobs'],
    webhooks: {} as Repositories['webhooks'],
    webhookDeliveries: {} as Repositories['webhookDeliveries'],
    featureFlags: {} as Repositories['featureFlags'],
    tenantFeatureOverrides: {} as Repositories['tenantFeatureOverrides'],
    usageMetrics: {} as Repositories['usageMetrics'],
    usageSnapshots: {} as Repositories['usageSnapshots'],
    legalDocuments: {} as Repositories['legalDocuments'],
    userAgreements: {} as Repositories['userAgreements'],
    consentLogs: {} as Repositories['consentLogs'],
    dataExportRequests: {} as Repositories['dataExportRequests'],
    activities: {} as Repositories['activities'],
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
  };
}

// ============================================================================
// Tests: updateProfile
// ============================================================================

describe('updateProfile', () => {
  let mockRepos: Repositories;

  beforeEach(() => {
    mockRepos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when user exists and firstName is updated', () => {
    it('should update user firstName and return profile', async () => {
      const updatedUser = createMockUser({ firstName: 'Jane' });
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepos.users.update).mockResolvedValue(updatedUser);

      const data: UpdateProfileData = { firstName: 'Jane' };
      const result = await updateProfile(mockRepos, mockUser.id, data);

      expect(mockRepos.users.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockRepos.users.update).toHaveBeenCalledWith(mockUser.id, { firstName: 'Jane' });
      expect(result).toEqual<ProfileUser>({
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: 'Jane',
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      });
    });

    it('should update username with uniqueness check', async () => {
      const updatedUser = createMockUser({ username: 'newname' });
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepos.users.findByUsername).mockResolvedValue(null);
      vi.mocked(mockRepos.users.update).mockResolvedValue(updatedUser);

      const data: UpdateProfileData = { username: 'newname' };
      const result = await updateProfile(mockRepos, mockUser.id, data);

      expect(mockRepos.users.findByUsername).toHaveBeenCalledWith('newname');
      expect(mockRepos.users.update).toHaveBeenCalledWith(mockUser.id, { username: 'newname' });
      expect(result.username).toBe('newname');
    });
  });

  describe('when no changes are provided', () => {
    it('should return user without calling update', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);

      const data: UpdateProfileData = {};
      const result = await updateProfile(mockRepos, mockUser.id, data);

      expect(mockRepos.users.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockRepos.users.update).not.toHaveBeenCalled();
      expect(result.id).toBe(mockUser.id);
    });
  });

  describe('when user does not exist', () => {
    it('should throw NotFoundError', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      const data: UpdateProfileData = { firstName: 'New Name' };

      await expect(updateProfile(mockRepos, 'non-existent', data)).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'User not found',
        statusCode: 404,
      });
    });
  });
});

// ============================================================================
// Tests: changePassword
// ============================================================================

describe('changePassword', () => {
  let mockRepos: Repositories;

  beforeEach(() => {
    mockRepos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when current password is correct and new password is valid', () => {
    it('should hash new password and update user', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockValidatePassword.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      mockHashPassword.mockResolvedValue('$argon2id$new-hash');
      vi.mocked(mockRepos.users.update).mockResolvedValue(
        createMockUser({
          passwordHash: '$argon2id$new-hash',
        }),
      );

      await changePassword(
        {} as DbClient,
        mockRepos,
        mockAuthConfig,
        mockUser.id,
        'currentPassword123',
        'newStrongPassword456!',
      );

      expect(mockRepos.users.findById).toHaveBeenCalledWith(mockUser.id);
      expect(mockVerifyPassword).toHaveBeenCalledWith('currentPassword123', mockUser.passwordHash);
      expect(mockValidatePassword).toHaveBeenCalledWith('newStrongPassword456!', [
        mockUser.email,
        mockUser.username,
        mockUser.firstName,
        mockUser.lastName,
      ]);
      expect(mockHashPassword).toHaveBeenCalledWith('newStrongPassword456!', mockAuthConfig.argon2);
      expect(mockRepos.users.update).toHaveBeenCalledWith(mockUser.id, {
        passwordHash: '$argon2id$new-hash',
      });
      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    });
  });

  describe('when user does not exist', () => {
    it('should throw NotFoundError', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      await expect(
        changePassword({} as DbClient, mockRepos, mockAuthConfig, 'non-existent', 'current', 'new'),
      ).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'User not found',
        statusCode: 404,
      });
    });
  });

  describe('when user has OAuth-only account', () => {
    it('should throw BadRequestError for oauth: prefix', async () => {
      const oauthUser = createMockUser({ passwordHash: 'oauth:google' });
      vi.mocked(mockRepos.users.findById).mockResolvedValue(oauthUser);

      await expect(
        changePassword({} as DbClient, mockRepos, mockAuthConfig, mockUser.id, 'current', 'new'),
      ).rejects.toThrow('Cannot change password for accounts without a password');
    });
  });

  describe('when current password is incorrect', () => {
    it('should throw BadRequestError', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);

      await expect(
        changePassword(
          {} as DbClient,
          mockRepos,
          mockAuthConfig,
          mockUser.id,
          'wrongPassword',
          'newPassword',
        ),
      ).rejects.toMatchObject({
        name: 'BadRequestError',
        message: 'Current password is incorrect',
        statusCode: 400,
      });
    });
  });

  describe('when new password is weak', () => {
    it('should throw WeakPasswordError', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockValidatePassword.mockResolvedValue({
        isValid: false,
        errors: ['Password is too short'],
      });

      await expect(
        changePassword(
          {} as DbClient,
          mockRepos,
          mockAuthConfig,
          mockUser.id,
          'currentPassword',
          'weak',
        ),
      ).rejects.toMatchObject({
        name: 'WeakPasswordError',
      });
    });
  });
});

// ============================================================================
// Tests: uploadAvatar
// ============================================================================

describe('uploadAvatar', () => {
  let mockRepos: Repositories;
  let mockStorage: StorageProvider;

  beforeEach(() => {
    mockRepos = createMockRepos();
    mockStorage = createMockStorage();
    vi.clearAllMocks();
  });

  it('should upload JPEG avatar and update user', async () => {
    const fileBuffer = Buffer.from('fake-image-data');
    const file = {
      buffer: fileBuffer,
      mimetype: 'image/jpeg',
      size: 1024 * 500, // 500KB
    };

    const avatarKeyPattern = /^avatars\/user-123\/[a-f0-9]{32}\.jpg$/;

    vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);
    vi.mocked(mockStorage.upload).mockImplementation((key) => Promise.resolve(key));
    vi.mocked(mockStorage.getSignedUrl).mockResolvedValue(
      'https://storage.example.com/signed-avatar-url',
    );
    vi.mocked(mockRepos.users.update).mockResolvedValue(
      createMockUser({
        avatarUrl: 'avatars/user-123/test.jpg',
      }),
    );

    const result = await uploadAvatar(mockRepos, mockStorage, mockUser.id, file);

    expect(mockRepos.users.findById).toHaveBeenCalledWith(mockUser.id);
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringMatching(avatarKeyPattern),
      fileBuffer,
      'image/jpeg',
    );
    expect(result).toBe('https://storage.example.com/signed-avatar-url');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    const file = {
      buffer: Buffer.from('fake-data'),
      mimetype: 'image/jpeg',
      size: 1024 * 500,
    };

    vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

    await expect(uploadAvatar(mockRepos, mockStorage, 'non-existent', file)).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });

  it('should throw BadRequestError for unsupported image types', async () => {
    const file = {
      buffer: Buffer.from('fake-data'),
      mimetype: 'image/bmp',
      size: 1024 * 500,
    };

    vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);

    await expect(uploadAvatar(mockRepos, mockStorage, mockUser.id, file)).rejects.toMatchObject({
      name: 'BadRequestError',
      statusCode: 400,
    });
  });

  it('should throw BadRequestError for files larger than 5MB', async () => {
    const file = {
      buffer: Buffer.from('fake-large-data'),
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024, // 6MB
    };

    vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);

    await expect(uploadAvatar(mockRepos, mockStorage, mockUser.id, file)).rejects.toMatchObject({
      name: 'BadRequestError',
      statusCode: 400,
    });
  });
});

// ============================================================================
// Tests: deleteAvatar
// ============================================================================

describe('deleteAvatar', () => {
  let mockRepos: Repositories;
  let mockStorage: StorageProvider;

  beforeEach(() => {
    mockRepos = createMockRepos();
    mockStorage = createMockStorage();
    vi.clearAllMocks();
  });

  it('should clear avatar URL from user', async () => {
    const userWithAvatar = createMockUser({ avatarUrl: 'avatars/user-123/avatar.jpg' });
    vi.mocked(mockRepos.users.findById).mockResolvedValue(userWithAvatar);
    vi.mocked(mockRepos.users.update).mockResolvedValue(createMockUser({ avatarUrl: null }));

    await deleteAvatar(mockRepos, mockStorage, mockUser.id);

    expect(mockRepos.users.update).toHaveBeenCalledWith(mockUser.id, { avatarUrl: null });
  });

  it('should return early without updating if avatarUrl is null', async () => {
    vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);

    await deleteAvatar(mockRepos, mockStorage, mockUser.id);

    expect(mockRepos.users.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when user does not exist', async () => {
    vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

    await expect(deleteAvatar(mockRepos, mockStorage, 'non-existent')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    });
  });
});

// ============================================================================
// Tests: getAvatarUrl
// ============================================================================

describe('getAvatarUrl', () => {
  let mockRepos: Repositories;
  let mockStorage: StorageProvider;

  beforeEach(() => {
    mockRepos = createMockRepos();
    mockStorage = createMockStorage();
    vi.clearAllMocks();
  });

  it('should generate signed URL for storage-based avatar', async () => {
    const userWithAvatar = createMockUser({ avatarUrl: 'avatars/user-123/avatar.jpg' });
    vi.mocked(mockRepos.users.findById).mockResolvedValue(userWithAvatar);
    vi.mocked(mockStorage.getSignedUrl).mockResolvedValue(
      'https://storage.example.com/avatars/user-123/avatar.jpg?signature=xyz',
    );

    const result = await getAvatarUrl(mockRepos, mockStorage, mockUser.id);

    expect(mockStorage.getSignedUrl).toHaveBeenCalledWith('avatars/user-123/avatar.jpg');
    expect(result).toBe('https://storage.example.com/avatars/user-123/avatar.jpg?signature=xyz');
  });

  it('should return external URL as-is', async () => {
    const userWithExternalAvatar = createMockUser({
      avatarUrl: 'https://gravatar.com/avatar/123',
    });
    vi.mocked(mockRepos.users.findById).mockResolvedValue(userWithExternalAvatar);

    const result = await getAvatarUrl(mockRepos, mockStorage, mockUser.id);

    expect(mockStorage.getSignedUrl).not.toHaveBeenCalled();
    expect(result).toBe('https://gravatar.com/avatar/123');
  });

  it('should return null if avatarUrl is null', async () => {
    vi.mocked(mockRepos.users.findById).mockResolvedValue(mockUser);

    const result = await getAvatarUrl(mockRepos, mockStorage, mockUser.id);

    expect(result).toBeNull();
    expect(mockStorage.getSignedUrl).not.toHaveBeenCalled();
  });

  it('should return null if user not found', async () => {
    vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

    const result = await getAvatarUrl(mockRepos, mockStorage, 'non-existent');

    expect(result).toBeNull();
  });
});
