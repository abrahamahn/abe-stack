// apps/server/src/modules/auth/magic-link/__tests__/service.test.ts
import { loadAuth } from '@abe-stack/core';
import { requestMagicLink, verifyMagicLink } from '@auth/magic-link/service';
import { withTransaction } from '@infrastructure';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { DbClient, Repositories } from '@database';
import type { EmailService } from '@infrastructure';

vi.mock('@infrastructure', async () => {
  const actual = await vi.importActual<typeof import('@infrastructure')>('@infrastructure');
  return {
    ...actual,
    withTransaction: vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): DbClient {
  const db = {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(async (cb: (tx: DbClient) => Promise<unknown>) => cb(db as DbClient)),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
  return db as unknown as DbClient;
}

function createMockRepos(): Repositories {
  return {
    users: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
    refreshTokens: {
      findByToken: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    refreshTokenFamilies: {
      findById: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn(),
    },
    loginAttempts: {
      findByIp: vi.fn(),
      create: vi.fn(),
    },
    passwordResetTokens: {
      findByToken: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    emailVerificationTokens: {
      findByToken: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    securityEvents: {
      create: vi.fn(),
      findByUserId: vi.fn(),
    },
    magicLinkTokens: {
      findById: vi.fn(),
      findValidByTokenHash: vi.fn(),
      findValidByEmail: vi.fn(),
      findRecentByEmail: vi.fn(),
      create: vi.fn(),
      markAsUsed: vi.fn(),
      deleteByEmail: vi.fn(),
      deleteExpired: vi.fn(),
      countRecentByEmail: vi.fn(),
      countRecentByIp: vi.fn(),
    },
    oauthConnections: {
      findByProvider: vi.fn(),
      create: vi.fn(),
    },
    pushSubscriptions: {
      findByEndpoint: vi.fn(),
      create: vi.fn(),
    },
    notificationPreferences: {
      findByUserId: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as Repositories;
}

// ============================================================================
// Tests: createMagicLinkToken
// ============================================================================

describe('Magic Link Service', () => {
  let mockDb: DbClient;
  let mockRepos: Repositories;

  beforeEach(() => {
    mockDb = createMockDb();
    mockRepos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('createMagicLinkToken', () => {
    test('should create a magic link token', async () => {
      const email = 'test@example.com';
      const baseUrl = 'http://localhost:5173';
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';
      const emailService: EmailService = {
        send: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as EmailService;

      vi.mocked(mockRepos.magicLinkTokens.create).mockResolvedValue({
        id: 'token-123',
        email,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        ipAddress,
        userAgent,
      });
      vi.mocked(mockRepos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);
      vi.mocked(mockRepos.magicLinkTokens.countRecentByIp).mockResolvedValue(0);

      const result = await requestMagicLink(
        mockDb,
        mockRepos,
        emailService,
        email,
        baseUrl,
        ipAddress,
        userAgent,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockRepos.magicLinkTokens.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: email.toLowerCase(),
          tokenHash: expect.any(String),
          ipAddress,
          userAgent,
        }),
      );
      expect(emailService.send).toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      const email = 'test@example.com';
      const baseUrl = 'http://localhost:5173';
      const emailService: EmailService = {
        send: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as EmailService;

      vi.mocked(mockRepos.magicLinkTokens.create).mockRejectedValue(new Error('DB error'));
      vi.mocked(mockRepos.magicLinkTokens.countRecentByEmail).mockResolvedValue(0);

      await expect(
        requestMagicLink(
          mockDb,
          mockRepos,
          emailService,
          email,
          baseUrl,
          '192.168.1.1',
          'test-agent',
        ),
      ).rejects.toThrow('DB error');
    });
  });

  describe('verifyMagicLinkToken', () => {
    test('should verify a valid magic link token', async () => {
      const token = 'valid-token';
      const auth = loadAuth(
        {
          JWT_SECRET: 'test-secret-32-characters-long!!',
        },
        'http://localhost:8080',
      );

      vi.mocked(withTransaction).mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: null,
          avatarUrl: null,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        refreshToken: 'refresh-token',
      });

      const result = await verifyMagicLink(mockDb, mockRepos, auth, token);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
    });

    test('should return null for non-existent token', async () => {
      vi.mocked(withTransaction).mockRejectedValue(new Error('Invalid or expired magic link'));
      const auth = loadAuth(
        {
          JWT_SECRET: 'test-secret-32-characters-long!!',
        },
        'http://localhost:8080',
      );

      await expect(verifyMagicLink(mockDb, mockRepos, auth, 'non-existent-token')).rejects.toThrow(
        'Invalid or expired magic link',
      );

      expect(withTransaction).toHaveBeenCalled();
    });

    test('should return null for expired token', async () => {
      vi.mocked(withTransaction).mockRejectedValue(new Error('Invalid or expired magic link'));
      const auth = loadAuth(
        {
          JWT_SECRET: 'test-secret-32-characters-long!!',
        },
        'http://localhost:8080',
      );

      await expect(verifyMagicLink(mockDb, mockRepos, auth, 'expired-token')).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });

    test('should return null for already used token', async () => {
      vi.mocked(withTransaction).mockRejectedValue(new Error('Invalid or expired magic link'));
      const auth = loadAuth(
        {
          JWT_SECRET: 'test-secret-32-characters-long!!',
        },
        'http://localhost:8080',
      );

      await expect(verifyMagicLink(mockDb, mockRepos, auth, 'used-token')).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });
  });
});
