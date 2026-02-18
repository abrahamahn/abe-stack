// main/server/core/src/auth/email-change.test.ts

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  confirmEmailChange,
  createEmailChangeRevertToken,
  initiateEmailChange,
  revertEmailChange,
} from './email-change';

import type { AuthConfig } from '@bslt/shared/config';
import type { DbClient, Repositories } from '../../../db/src';
import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...actual,
    canonicalizeEmail: vi.fn((e: string) => e.toLowerCase()),
    normalizeEmail: vi.fn((e: string) => e.toLowerCase().trim()),
  };
});

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    verifyPasswordSafe: vi.fn(),
    revokeAllUserTokens: vi.fn(),
  };
});

// ============================================================================
// Test Setup
// ============================================================================

const { verifyPasswordSafe, revokeAllUserTokens } = await import('./utils');
const { InvalidCredentialsError, InvalidTokenError } = await import('@bslt/shared');

describe('email-change', () => {
  let mockDb: DbClient;
  let mockRepos: Repositories;
  let mockEmailService: AuthEmailService;
  let mockEmailTemplates: AuthEmailTemplates;
  let mockConfig: AuthConfig;
  let mockLog: AuthLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {} as unknown as DbClient;

    mockRepos = {
      users: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        update: vi.fn().mockResolvedValue(null),
      },
      emailChangeTokens: {
        invalidateForUser: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: 'ect-123',
          userId: 'user-123',
          newEmail: 'new@example.com',
          tokenHash: 'hash',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        }),
        findByTokenHash: vi.fn(),
        markAsUsed: vi.fn().mockResolvedValue(null),
      },
      emailChangeRevertTokens: {
        invalidateForUser: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: 'ecrt-123',
          userId: 'user-123',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          tokenHash: 'hash',
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
        }),
        findByTokenHash: vi.fn(),
        markAsUsed: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Repositories;

    mockEmailService = {
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthEmailService;

    mockEmailTemplates = {
      emailVerification: vi.fn((url: string, _ttl: number) => ({
        html: `<a href="${url}">Verify</a>`,
        text: `Verify: ${url}`,
      })),
    } as unknown as AuthEmailTemplates;

    mockConfig = {
      jwt: {
        issuer: 'https://example.com',
      },
    } as AuthConfig;

    mockLog = {
      error: vi.fn(),
    } as unknown as AuthLogger;
  });

  // ==========================================================================
  // initiateEmailChange
  // ==========================================================================

  describe('initiateEmailChange', () => {
    test('should verify password and send verification email', async () => {
      const userId = 'user-123';
      const currentEmail = 'old@example.com';
      const newEmail = 'new@example.com';
      const password = 'valid-password';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: currentEmail,
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);

      const result = await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        newEmail,
        password,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('If the email is available, a verification link has been sent.');

      expect(mockRepos.users.findById).toHaveBeenCalledWith(userId);
      expect(verifyPasswordSafe).toHaveBeenCalledWith(password, 'hashed');
      expect(mockRepos.users.findByEmail).toHaveBeenCalledWith('new@example.com');

      // Should invalidate existing tokens via repo
      expect(mockRepos.emailChangeTokens.invalidateForUser).toHaveBeenCalledWith(userId);

      // Should create new token via repo
      expect(mockRepos.emailChangeTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          newEmail: 'new@example.com',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );

      // Should send verification email
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@example.com',
          subject: 'Confirm your new email address',
          html: expect.stringContaining('Verify'),
          text: expect.stringContaining('Verify'),
        }),
      );

      expect(mockEmailTemplates.emailVerification).toHaveBeenCalledWith(
        expect.stringContaining('/auth/change-email/confirm?token='),
        1440, // 24 hours * 60 minutes
      );
    });

    test('should throw InvalidCredentialsError when user not found', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      await expect(
        initiateEmailChange(
          mockDb,
          mockRepos,
          mockEmailService,
          mockEmailTemplates,
          mockConfig,
          'user-123',
          'new@example.com',
          'password',
        ),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    test('should throw InvalidCredentialsError when password is invalid', async () => {
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

      await expect(
        initiateEmailChange(
          mockDb,
          mockRepos,
          mockEmailService,
          mockEmailTemplates,
          mockConfig,
          'user-123',
          'new@example.com',
          'wrong-password',
        ),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockEmailService.send).not.toHaveBeenCalled();
    });

    test('should return success but not send email when email is already taken (anti-enumeration)', async () => {
      const userId = 'user-123';
      const currentEmail = 'old@example.com';
      const newEmail = 'taken@example.com';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: currentEmail,
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);

      // Email is taken by another user
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue({
        id: 'other-user',
        email: newEmail,
      } as never);

      const result = await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        newEmail,
        'password',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('If the email is available, a verification link has been sent.');

      // Should NOT send email or create token
      expect(mockEmailService.send).not.toHaveBeenCalled();
      expect(mockRepos.emailChangeTokens.create).not.toHaveBeenCalled();
    });

    test('should allow changing to same email (same user)', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email,
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);

      // Same user returned
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue({
        id: userId,
        email,
      } as never);

      const result = await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        email,
        'password',
      );

      expect(result.success).toBe(true);
      expect(mockEmailService.send).toHaveBeenCalled();
    });

    test('should use custom baseUrl when provided', async () => {
      const userId = 'user-123';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: 'old@example.com',
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);

      const customBaseUrl = 'https://custom.com';

      await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        'new@example.com',
        'password',
        customBaseUrl,
      );

      expect(mockEmailTemplates.emailVerification).toHaveBeenCalledWith(
        expect.stringContaining(`${customBaseUrl}/auth/change-email/confirm?token=`),
        1440,
      );
    });

    test('should log error but still return success if email sending fails', async () => {
      const userId = 'user-123';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: 'old@example.com',
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);

      const emailError = new Error('SMTP error');
      vi.mocked(mockEmailService.send).mockRejectedValue(emailError);

      const result = await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        'new@example.com',
        'password',
        undefined,
        mockLog,
      );

      expect(result.success).toBe(true);
      expect(mockLog.error).toHaveBeenCalledWith(
        { err: emailError },
        'Failed to send email change verification',
      );
    });

    test('should not log error when logger not provided and email fails', async () => {
      const userId = 'user-123';

      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: 'old@example.com',
        passwordHash: 'hashed',
      } as never);

      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(mockEmailService.send).mockRejectedValue(new Error('SMTP error'));

      const result = await initiateEmailChange(
        mockDb,
        mockRepos,
        mockEmailService,
        mockEmailTemplates,
        mockConfig,
        userId,
        'new@example.com',
        'password',
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // confirmEmailChange
  // ==========================================================================

  describe('confirmEmailChange', () => {
    test('should confirm valid token and update email', async () => {
      const userId = 'user-123';
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Mock token lookup via repo
      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue({
        id: 'token-123',
        userId,
        newEmail,
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      // New email is available
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);

      // User exists with old email
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: oldEmail,
      } as never);

      const result = await confirmEmailChange(mockDb, mockRepos, 'valid-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email address has been updated successfully.');
      expect(result.email).toBe(newEmail);
      expect(result.previousEmail).toBe(oldEmail);
      expect(result.userId).toBe(userId);

      // Should update user email via repo
      expect(mockRepos.users.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          email: newEmail,
          canonicalEmail: newEmail.toLowerCase(),
          updatedAt: expect.any(Date),
        }),
      );

      // Should mark token as used via repo
      expect(mockRepos.emailChangeTokens.markAsUsed).toHaveBeenCalledWith('token-123');
    });

    test('should throw InvalidTokenError when token not found', async () => {
      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue(null);

      await expect(confirmEmailChange(mockDb, mockRepos, 'invalid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(confirmEmailChange(mockDb, mockRepos, 'invalid-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    test('should throw InvalidTokenError when token already used', async () => {
      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: new Date(), // Already used
        createdAt: new Date(),
      } as never);

      await expect(confirmEmailChange(mockDb, mockRepos, 'used-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(confirmEmailChange(mockDb, mockRepos, 'used-token')).rejects.toThrow(
        'Token has already been used',
      );
    });

    test('should throw InvalidTokenError when token expired', async () => {
      const pastDate = new Date(Date.now() - 10000);

      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: pastDate, // Expired
        usedAt: null,
        createdAt: new Date(),
      } as never);

      await expect(confirmEmailChange(mockDb, mockRepos, 'expired-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(confirmEmailChange(mockDb, mockRepos, 'expired-token')).rejects.toThrow(
        'Token has expired',
      );
    });

    test('should throw InvalidTokenError when email no longer available', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      // Email is now taken by someone else
      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue({
        id: 'other-user',
        email: 'new@example.com',
      } as never);

      await expect(confirmEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(confirmEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        'Email address is no longer available',
      );
    });

    test('should throw InvalidTokenError when user not found', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      vi.mocked(mockRepos.emailChangeTokens.findByTokenHash).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      vi.mocked(mockRepos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      await expect(confirmEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(confirmEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        'User not found',
      );
    });
  });

  // ==========================================================================
  // createEmailChangeRevertToken
  // ==========================================================================

  describe('createEmailChangeRevertToken', () => {
    test('should create revert token and return plain token', async () => {
      const userId = 'user-123';
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';

      const token = await createEmailChangeRevertToken(
        mockDb,
        mockRepos,
        userId,
        oldEmail,
        newEmail,
      );

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Should invalidate existing revert tokens via repo
      expect(mockRepos.emailChangeRevertTokens.invalidateForUser).toHaveBeenCalledWith(userId);

      // Should create new revert token via repo
      expect(mockRepos.emailChangeRevertTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          oldEmail,
          newEmail,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });

    test('should generate different tokens on subsequent calls', async () => {
      const userId = 'user-123';
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';

      const token1 = await createEmailChangeRevertToken(
        mockDb,
        mockRepos,
        userId,
        oldEmail,
        newEmail,
      );
      const token2 = await createEmailChangeRevertToken(
        mockDb,
        mockRepos,
        userId,
        oldEmail,
        newEmail,
      );

      expect(token1).not.toBe(token2);
    });
  });

  // ==========================================================================
  // revertEmailChange
  // ==========================================================================

  describe('revertEmailChange', () => {
    test('should revert email, lock account, and revoke tokens', async () => {
      const userId = 'user-123';
      const oldEmail = 'old@example.com';
      const newEmail = 'new@example.com';
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Mock revert token lookup via repo
      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue({
        id: 'revert-token-123',
        userId,
        oldEmail,
        newEmail,
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      // User has new email
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: userId,
        email: newEmail,
      } as never);

      const result = await revertEmailChange(mockDb, mockRepos, 'valid-revert-token');

      expect(result.message).toBe(
        'Email address has been reverted and your account has been locked.',
      );
      expect(result.email).toBe(oldEmail);

      // Should update user email and lock account via repo
      expect(mockRepos.users.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          email: oldEmail,
          canonicalEmail: oldEmail.toLowerCase(),
          lockedUntil: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );

      // Should mark revert token as used via repo
      expect(mockRepos.emailChangeRevertTokens.markAsUsed).toHaveBeenCalledWith('revert-token-123');

      // Should revoke all user tokens
      expect(revokeAllUserTokens).toHaveBeenCalledWith(mockDb, userId);
    });

    test('should throw InvalidTokenError when token not found', async () => {
      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue(null);

      await expect(revertEmailChange(mockDb, mockRepos, 'invalid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(revertEmailChange(mockDb, mockRepos, 'invalid-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    test('should throw InvalidTokenError when token already used', async () => {
      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue({
        id: 'revert-token-123',
        userId: 'user-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: new Date(), // Already used
        createdAt: new Date(),
      } as never);

      await expect(revertEmailChange(mockDb, mockRepos, 'used-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(revertEmailChange(mockDb, mockRepos, 'used-token')).rejects.toThrow(
        'Token has already been used',
      );
    });

    test('should throw InvalidTokenError when token expired', async () => {
      const pastDate = new Date(Date.now() - 10000);

      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue({
        id: 'revert-token-123',
        userId: 'user-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: pastDate, // Expired
        usedAt: null,
        createdAt: new Date(),
      } as never);

      await expect(revertEmailChange(mockDb, mockRepos, 'expired-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(revertEmailChange(mockDb, mockRepos, 'expired-token')).rejects.toThrow(
        'Token has expired',
      );
    });

    test('should throw InvalidTokenError when user not found', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue({
        id: 'revert-token-123',
        userId: 'user-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      vi.mocked(mockRepos.users.findById).mockResolvedValue(null);

      await expect(revertEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(revertEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        'User not found',
      );
    });

    test('should throw InvalidTokenError when email already reversed or superseded', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

      vi.mocked(mockRepos.emailChangeRevertTokens.findByTokenHash).mockResolvedValue({
        id: 'revert-token-123',
        userId: 'user-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'hash',
        expiresAt: futureDate,
        usedAt: null,
        createdAt: new Date(),
      } as never);

      // User email is different (already reverted or changed again)
      vi.mocked(mockRepos.users.findById).mockResolvedValue({
        id: 'user-123',
        email: 'different@example.com',
      } as never);

      await expect(revertEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        InvalidTokenError,
      );

      await expect(revertEmailChange(mockDb, mockRepos, 'valid-token')).rejects.toThrow(
        'Email change already reversed or superseded',
      );
    });
  });
});
