// main/apps/server/src/__tests__/integration/avatar-pipeline.integration.test.ts
/**
 * Avatar Pipeline Verification Tests
 *
 * Integration tests verifying the full avatar lifecycle:
 *   upload -> validate -> store -> update user -> retrieve
 *   delete -> fallback chain
 *
 * These tests exercise the avatar service functions from
 * `core/src/users/handlers/avatar.ts` with mocked repositories
 * and storage to validate the end-to-end pipeline without
 * requiring a live database or object store.
 */

import {
  cacheBustAvatarUrl,
  deleteAvatar,
  getAvatarFallbackUrl,
  getAvatarUrl,
  getGravatarUrl,
  getInitialsAvatarUrl,
  uploadAvatar,
} from '@bslt/core/users/handlers/avatar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Repositories, User } from '@bslt/core/db';
import type { StorageProvider } from '@bslt/core/users/handlers/avatar';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-avatar-1',
    email: 'avatar-test@example.com',
    canonicalEmail: 'avatar-test@example.com',
    username: 'avataruser',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash',
    firstName: 'Avatar',
    lastName: 'Tester',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1,
    ...overrides,
  };
}

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
    loginAttempts: {} as Repositories['loginAttempts'],
    authTokens: {} as Repositories['authTokens'],
    securityEvents: {} as Repositories['securityEvents'],
    totpBackupCodes: {} as Repositories['totpBackupCodes'],
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
    consentRecords: {} as Repositories['consentRecords'],
    dataExportRequests: {} as Repositories['dataExportRequests'],
    activities: {} as Repositories['activities'],
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn().mockImplementation((key: string) => Promise.resolve(key)),
    getSignedUrl: vi
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(`https://storage.example.com/${key}?sig=test`),
      ),
  };
}

// ============================================================================
// Avatar Upload Pipeline
// ============================================================================

describe('Avatar Upload Pipeline', () => {
  let repos: Repositories;
  let storage: StorageProvider;
  const mockUser = createMockUser();

  beforeEach(() => {
    repos = createMockRepos();
    storage = createMockStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('upload -> validate -> store -> update user', () => {
    it('should validate MIME type, upload to storage, and update user avatarUrl', async () => {
      const fileBuffer = Buffer.from('fake-jpeg-data');
      const file = { buffer: fileBuffer, mimetype: 'image/jpeg', size: 500 * 1024 };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(repos.users.update).mockResolvedValue(
        createMockUser({ avatarUrl: 'avatars/user-avatar-1/test.jpg' }),
      );

      const result = await uploadAvatar(repos, storage, mockUser.id, file);

      // Step 1: Looked up user
      expect(repos.users.findById).toHaveBeenCalledWith(mockUser.id);

      // Step 2: Uploaded to storage with correct key pattern
      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/user-avatar-1\/[a-f0-9]{32}\.jpg$/),
        fileBuffer,
        'image/jpeg',
      );

      // Step 3: Generated signed URL
      expect(storage.getSignedUrl).toHaveBeenCalledOnce();

      // Step 4: Updated user record with storage key
      expect(repos.users.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          avatarUrl: expect.stringMatching(/^avatars\/user-avatar-1\/[a-f0-9]{32}\.jpg$/),
        }),
      );

      // Step 5: Returned signed URL to caller
      expect(result).toContain('https://storage.example.com/');
      expect(result).toContain('sig=test');
    });

    it('should support PNG uploads', async () => {
      const file = { buffer: Buffer.from('png-data'), mimetype: 'image/png', size: 100 * 1024 };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(repos.users.update).mockResolvedValue(
        createMockUser({ avatarUrl: 'avatars/user-avatar-1/test.png' }),
      );

      const result = await uploadAvatar(repos, storage, mockUser.id, file);

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/\.png$/),
        expect.any(Buffer),
        'image/png',
      );
      expect(result).toBeDefined();
    });

    it('should support WebP uploads', async () => {
      const file = { buffer: Buffer.from('webp-data'), mimetype: 'image/webp', size: 50 * 1024 };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(repos.users.update).mockResolvedValue(
        createMockUser({ avatarUrl: 'avatars/user-avatar-1/test.webp' }),
      );

      const result = await uploadAvatar(repos, storage, mockUser.id, file);

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/\.webp$/),
        expect.any(Buffer),
        'image/webp',
      );
      expect(result).toBeDefined();
    });

    it('should reject invalid MIME types (e.g. image/bmp)', async () => {
      const file = { buffer: Buffer.from('bmp-data'), mimetype: 'image/bmp', size: 100 };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);

      await expect(uploadAvatar(repos, storage, mockUser.id, file)).rejects.toThrow(
        'Invalid file type',
      );

      // Storage should NOT have been called
      expect(storage.upload).not.toHaveBeenCalled();
      expect(repos.users.update).not.toHaveBeenCalled();
    });

    it('should reject non-image MIME types', async () => {
      const file = {
        buffer: Buffer.from('pdf-data'),
        mimetype: 'application/pdf',
        size: 100,
      };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);

      await expect(uploadAvatar(repos, storage, mockUser.id, file)).rejects.toThrow(
        'Invalid file type',
      );
    });

    it('should reject files exceeding max avatar size', async () => {
      const file = {
        buffer: Buffer.from('oversized'),
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6 MB
      };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);

      await expect(uploadAvatar(repos, storage, mockUser.id, file)).rejects.toThrow(
        'File too large',
      );

      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('should reject upload for non-existent user', async () => {
      const file = { buffer: Buffer.from('data'), mimetype: 'image/jpeg', size: 100 };

      vi.mocked(repos.users.findById).mockResolvedValue(null);

      await expect(uploadAvatar(repos, storage, 'ghost-user', file)).rejects.toThrow(
        'User not found',
      );
    });

    it('should generate unique file IDs for sequential uploads', async () => {
      const file = { buffer: Buffer.from('data'), mimetype: 'image/jpeg', size: 100 };

      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(repos.users.update).mockResolvedValue(createMockUser());

      await uploadAvatar(repos, storage, mockUser.id, file);
      await uploadAvatar(repos, storage, mockUser.id, file);

      const call1Key = vi.mocked(storage.upload).mock.calls[0]![0] as string;
      const call2Key = vi.mocked(storage.upload).mock.calls[1]![0] as string;

      expect(call1Key).not.toBe(call2Key);
    });
  });

  // ============================================================================
  // Avatar Deletion & Fallback Chain
  // ============================================================================

  describe('avatar deletion and fallback chain', () => {
    it('should clear avatarUrl on user record when deleting avatar', async () => {
      const userWithAvatar = createMockUser({
        avatarUrl: 'avatars/user-avatar-1/existing.jpg',
      });

      vi.mocked(repos.users.findById).mockResolvedValue(userWithAvatar);
      vi.mocked(repos.users.update).mockResolvedValue(createMockUser({ avatarUrl: null }));

      await deleteAvatar(repos, storage, mockUser.id);

      expect(repos.users.update).toHaveBeenCalledWith(mockUser.id, { avatarUrl: null });
    });

    it('should no-op when user has no avatar to delete', async () => {
      vi.mocked(repos.users.findById).mockResolvedValue(mockUser); // avatarUrl is null

      await deleteAvatar(repos, storage, mockUser.id);

      expect(repos.users.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when deleting avatar for non-existent user', async () => {
      vi.mocked(repos.users.findById).mockResolvedValue(null);

      await expect(deleteAvatar(repos, storage, 'ghost-user')).rejects.toThrow('User not found');
    });

    it('should return null from getAvatarUrl when user has no avatar', async () => {
      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);

      const url = await getAvatarUrl(repos, storage, mockUser.id);

      expect(url).toBeNull();
      expect(storage.getSignedUrl).not.toHaveBeenCalled();
    });

    it('should return signed URL for storage-based avatar via getAvatarUrl', async () => {
      const userWithAvatar = createMockUser({
        avatarUrl: 'avatars/user-avatar-1/avatar.jpg',
      });
      vi.mocked(repos.users.findById).mockResolvedValue(userWithAvatar);

      const url = await getAvatarUrl(repos, storage, mockUser.id);

      expect(storage.getSignedUrl).toHaveBeenCalledWith('avatars/user-avatar-1/avatar.jpg');
      expect(url).toContain('https://storage.example.com/');
    });

    it('should return external URL as-is via getAvatarUrl', async () => {
      const userWithExternalAvatar = createMockUser({
        avatarUrl: 'https://gravatar.com/avatar/abc123',
      });
      vi.mocked(repos.users.findById).mockResolvedValue(userWithExternalAvatar);

      const url = await getAvatarUrl(repos, storage, mockUser.id);

      expect(url).toBe('https://gravatar.com/avatar/abc123');
      expect(storage.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Fallback URL Generators
  // ============================================================================

  describe('avatar fallback chain helpers', () => {
    it('getAvatarFallbackUrl returns a gravatar URL', () => {
      const url = getAvatarFallbackUrl('test@example.com', 'Test', 'User');

      expect(url).toContain('https://www.gravatar.com/avatar/');
      expect(url).toContain('d=blank');
    });

    it('getGravatarUrl returns a properly hashed URL', () => {
      const url = getGravatarUrl('test@example.com', 100, 'identicon');

      expect(url).toContain('https://www.gravatar.com/avatar/');
      expect(url).toContain('s=100');
      expect(url).toContain('d=identicon');
      // MD5 hash should be 32 hex chars
      expect(url).toMatch(/\/avatar\/[a-f0-9]{32}\?/);
    });

    it('getGravatarUrl normalizes email (lowercase + trim)', () => {
      const url1 = getGravatarUrl('Test@Example.com');
      const url2 = getGravatarUrl('test@example.com');

      expect(url1).toBe(url2);
    });

    it('getInitialsAvatarUrl encodes names properly', () => {
      const url = getInitialsAvatarUrl('John', 'Doe', 64);

      expect(url).toContain('ui-avatars.com');
      expect(url).toContain('name=John%20Doe');
      expect(url).toContain('size=64');
    });

    it('cacheBustAvatarUrl appends version parameter', () => {
      const baseUrl = 'https://storage.example.com/avatar.jpg';
      const busted = cacheBustAvatarUrl(baseUrl, 42);

      expect(busted).toBe('https://storage.example.com/avatar.jpg?v=42');
    });

    it('cacheBustAvatarUrl uses & for URLs with existing query params', () => {
      const baseUrl = 'https://storage.example.com/avatar.jpg?sig=abc';
      const busted = cacheBustAvatarUrl(baseUrl, new Date('2024-06-15T00:00:00Z'));

      expect(busted).toContain('&v=');
      expect(busted).toContain('sig=abc');
    });
  });

  // ============================================================================
  // Full Pipeline: Upload -> Delete -> Fallback
  // ============================================================================

  describe('full pipeline: upload -> retrieve -> delete -> fallback', () => {
    it('should complete the full avatar lifecycle', async () => {
      const file = { buffer: Buffer.from('image-data'), mimetype: 'image/jpeg', size: 1024 };

      // 1. Upload avatar
      vi.mocked(repos.users.findById).mockResolvedValue(mockUser);
      vi.mocked(repos.users.update).mockResolvedValue(
        createMockUser({ avatarUrl: 'avatars/user-avatar-1/new.jpg' }),
      );

      const uploadedUrl = await uploadAvatar(repos, storage, mockUser.id, file);
      expect(uploadedUrl).toBeDefined();
      expect(uploadedUrl).toContain('https://');

      // 2. Retrieve avatar URL
      const userAfterUpload = createMockUser({ avatarUrl: 'avatars/user-avatar-1/new.jpg' });
      vi.mocked(repos.users.findById).mockResolvedValue(userAfterUpload);

      const retrievedUrl = await getAvatarUrl(repos, storage, mockUser.id);
      expect(retrievedUrl).toContain('https://storage.example.com/');

      // 3. Delete avatar
      vi.mocked(repos.users.update).mockResolvedValue(createMockUser({ avatarUrl: null }));

      await deleteAvatar(repos, storage, mockUser.id);
      expect(repos.users.update).toHaveBeenCalledWith(mockUser.id, { avatarUrl: null });

      // 4. After deletion, getAvatarUrl should return null -> UI uses fallback
      vi.mocked(repos.users.findById).mockResolvedValue(createMockUser({ avatarUrl: null }));
      const postDeleteUrl = await getAvatarUrl(repos, storage, mockUser.id);
      expect(postDeleteUrl).toBeNull();

      // 5. Fallback chain is available
      const fallbackUrl = getAvatarFallbackUrl(
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
      );
      expect(fallbackUrl).toContain('gravatar.com');
    });
  });
});
