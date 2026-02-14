// main/server/core/src/auth/utils/refresh-token.test.ts
// backend/core/src/auth/utils/refresh-token.test.ts
/**
 * Refresh Token Management Tests
 *
 * Comprehensive tests for refresh token rotation, family tracking,
 * and token reuse attack detection with proper database mocking.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { withTransaction } from '../../../../db/src';
import { logTokenFamilyRevokedEvent, logTokenReuseEvent } from '../security/events';

import { createRefreshToken, getRefreshTokenExpiry } from './jwt';
import {
    cleanupExpiredTokens,
    createRefreshTokenFamily,
    revokeAllUserTokens,
    revokeTokenFamily,
    rotateRefreshToken,
} from './refresh-token';

import type { DbClient, RefreshToken, RefreshTokenFamily, User } from '../../../../db/src';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('./jwt', () => ({
  createRefreshToken: vi.fn(),
  getRefreshTokenExpiry: vi.fn(),
}));

vi.mock('../security/events', () => ({
  logTokenReuseEvent: vi.fn(),
  logTokenFamilyRevokedEvent: vi.fn(),
}));

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/src')>('@abe-stack/db');
  return {
    ...actual,
    withTransaction: vi.fn((db, callback) => callback(db)),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDbClient(): DbClient {
  return {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn((callback) =>
      callback({ query: vi.fn(), queryOne: vi.fn(), execute: vi.fn() }),
    ),
  } as unknown as DbClient;
}

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as User;
}

function createMockRefreshToken(overrides?: Partial<RefreshToken>): RefreshToken {
  return {
    id: 'token-123',
    userId: 'user-123',
    familyId: 'family-123',
    token: 'mock-token-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 60000), // 1 minute ago
    ...overrides,
  } as RefreshToken;
}

function createMockRefreshTokenFamily(overrides?: Partial<RefreshTokenFamily>): RefreshTokenFamily {
  return {
    id: 'family-123',
    userId: 'user-123',
    revokedAt: null,
    revokeReason: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as RefreshTokenFamily;
}

// ============================================================================
// Tests: createRefreshTokenFamily
// ============================================================================

describe('createRefreshTokenFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should create a new token family and return familyId and token', async () => {
    const db = createMockDbClient();
    const mockFamily = createMockRefreshTokenFamily();
    const mockToken = 'generated-refresh-token-123';
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = {
        query: vi.fn().mockResolvedValue([
          {
            id: mockFamily.id,
            user_id: mockFamily.userId,
            revoked_at: null,
            revoke_reason: null,
            created_at: mockFamily.createdAt,
          },
        ]),
        execute: vi.fn().mockResolvedValue(1),
      };
      return await callback(tx as unknown as DbClient);
    });

    vi.mocked(createRefreshToken).mockReturnValue(mockToken);
    vi.mocked(getRefreshTokenExpiry).mockReturnValue(expiryDate);

    const result = await createRefreshTokenFamily(db, 'user-123', 7);

    expect(result).toEqual({
      familyId: mockFamily.id,
      token: mockToken,
    });

    expect(withTransaction).toHaveBeenCalledWith(db, expect.any(Function));
    expect(createRefreshToken).toHaveBeenCalled();
    expect(getRefreshTokenExpiry).toHaveBeenCalledWith(7);
  });

  test('should throw error if family creation fails', async () => {
    const db = createMockDbClient();

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = {
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn(),
      };
      return await callback(tx as unknown as DbClient);
    });

    await expect(createRefreshTokenFamily(db, 'user-123')).rejects.toThrow(
      'Failed to create refresh token family',
    );
  });

  test('should use custom expiry days when provided', async () => {
    const db = createMockDbClient();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      const tx = {
        query: vi.fn().mockResolvedValue([
          {
            id: 'family-123',
            user_id: 'user-123',
            revoked_at: null,
            revoke_reason: null,
            created_at: new Date(),
          },
        ]),
        execute: vi.fn().mockResolvedValue(1),
      };
      return await callback(tx as unknown as DbClient);
    });

    vi.mocked(createRefreshToken).mockReturnValue('token-123');
    vi.mocked(getRefreshTokenExpiry).mockReturnValue(expiryDate);

    await createRefreshTokenFamily(db, 'user-123', 30);

    expect(getRefreshTokenExpiry).toHaveBeenCalledWith(30);
  });
});

// ============================================================================
// Tests: rotateRefreshToken
// ============================================================================

describe('rotateRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful rotation', () => {
    test('should rotate token and return new token with user info', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken();
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();
      const newToken = 'new-token-xyz789';

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
        const tx = {
          execute: vi.fn().mockResolvedValue(1),
        };
        return await callback(tx as unknown as DbClient);
      });

      vi.mocked(createRefreshToken).mockReturnValue(newToken);
      vi.mocked(getRefreshTokenExpiry).mockReturnValue(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

      const result = await rotateRefreshToken(db, 'old-token-abc123', '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual({
        token: newToken,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(db.queryOne).toHaveBeenCalled();
      expect(withTransaction).toHaveBeenCalled();
      expect(createRefreshToken).toHaveBeenCalled();
    });

    test('should delete old token and insert new one in transaction', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken();
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();
      const mockTx = {
        execute: vi.fn().mockResolvedValue(1),
      };

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
        return await callback(mockTx as unknown as DbClient);
      });

      vi.mocked(createRefreshToken).mockReturnValue('new-token');
      vi.mocked(getRefreshTokenExpiry).mockReturnValue(new Date());

      await rotateRefreshToken(db, 'old-token');

      expect(mockTx.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalid token scenarios', () => {
    test('should return null if token not found', async () => {
      const db = createMockDbClient();

      vi.mocked(db.queryOne).mockResolvedValue(null);

      const result = await rotateRefreshToken(db, 'non-existent-token');

      expect(result).toBeNull();
      expect(db.queryOne).toHaveBeenCalledTimes(1);
    });

    test('should return null if token is expired', async () => {
      const db = createMockDbClient();

      vi.mocked(db.queryOne).mockResolvedValue(null);

      const result = await rotateRefreshToken(db, 'expired-token');

      expect(result).toBeNull();
    });

    test('should return null if user does not exist', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken();

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce(null);

      const result = await rotateRefreshToken(db, 'token-123');

      expect(result).toBeNull();
    });
  });

  describe('token reuse detection', () => {
    test('should throw TokenReuseError if family is already revoked', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken();
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily({ revokedAt: new Date() });

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: mockFamily.revokedAt,
          revoke_reason: 'Token reuse detected',
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null);

      await expect(rotateRefreshToken(db, 'old-token', '127.0.0.1', 'Mozilla/5.0')).rejects.toThrow(
        'Token has already been used',
      );

      expect(logTokenReuseEvent).toHaveBeenCalledWith(
        db,
        mockUser.id,
        mockUser.email,
        mockToken.familyId,
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    test('should throw TokenReuseError if newer token exists outside grace period', async () => {
      const db = createMockDbClient();
      const oldTokenCreatedAt = new Date(Date.now() - 60000); // 1 minute ago
      const mockToken = createMockRefreshToken({ createdAt: oldTokenCreatedAt });
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();
      const newerToken = createMockRefreshToken({
        token: 'newer-token',
        createdAt: new Date(),
      });

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: newerToken.id,
          user_id: newerToken.userId,
          family_id: newerToken.familyId,
          token: newerToken.token,
          expires_at: newerToken.expiresAt,
          created_at: newerToken.createdAt,
        });

      await expect(
        rotateRefreshToken(db, mockToken.token, '127.0.0.1', 'Mozilla/5.0', 7, 30),
      ).rejects.toThrow('Token has already been used');

      expect(logTokenReuseEvent).toHaveBeenCalled();
      expect(logTokenFamilyRevokedEvent).toHaveBeenCalled();
    });
  });

  describe('grace period handling', () => {
    test('should return newer token if within grace period', async () => {
      const db = createMockDbClient();
      const now = Date.now();
      const recentCreatedAt = new Date(now - 10000); // 10 seconds ago (within 30s grace period)
      const mockToken = createMockRefreshToken({ createdAt: recentCreatedAt });
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();
      const newerToken = createMockRefreshToken({
        token: 'newer-token-within-grace',
        createdAt: new Date(now - 5000), // 5 seconds ago
      });

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: newerToken.id,
          user_id: newerToken.userId,
          family_id: newerToken.familyId,
          token: newerToken.token,
          expires_at: newerToken.expiresAt,
          created_at: newerToken.createdAt,
        });

      const result = await rotateRefreshToken(
        db,
        mockToken.token,
        '127.0.0.1',
        'Mozilla/5.0',
        7,
        30,
      );

      expect(result).toEqual({
        token: newerToken.token,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(logTokenReuseEvent).not.toHaveBeenCalled();
      expect(withTransaction).not.toHaveBeenCalled();
    });

    test('should use custom grace period when provided', async () => {
      const db = createMockDbClient();
      const now = Date.now();
      const recentCreatedAt = new Date(now - 50000); // 50 seconds ago
      const mockToken = createMockRefreshToken({ createdAt: recentCreatedAt });
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();
      const newerToken = createMockRefreshToken({
        token: 'newer-token',
        createdAt: new Date(now - 40000), // 40 seconds ago
      });

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: newerToken.id,
          user_id: newerToken.userId,
          family_id: newerToken.familyId,
          token: newerToken.token,
          expires_at: newerToken.expiresAt,
          created_at: newerToken.createdAt,
        });

      const result = await rotateRefreshToken(
        db,
        mockToken.token,
        '127.0.0.1',
        'Mozilla/5.0',
        7,
        60, // 60 second grace period
      );

      expect(result).toEqual({
        token: newerToken.token,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(logTokenReuseEvent).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle token without family ID', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken({ familyId: null });
      const mockUser = createMockUser();
      const newToken = 'new-token-xyz';

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: null,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce(null);

      vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
        const tx = {
          execute: vi.fn().mockResolvedValue(1),
        };
        return await callback(tx as unknown as DbClient);
      });

      vi.mocked(createRefreshToken).mockReturnValue(newToken);
      vi.mocked(getRefreshTokenExpiry).mockReturnValue(new Date());

      const result = await rotateRefreshToken(db, mockToken.token);

      expect(result).toEqual({
        token: newToken,
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    test('should handle missing IP address and user agent', async () => {
      const db = createMockDbClient();
      const mockToken = createMockRefreshToken();
      const mockUser = createMockUser();
      const mockFamily = createMockRefreshTokenFamily();

      vi.mocked(db.queryOne)
        .mockResolvedValueOnce({
          id: mockToken.id,
          user_id: mockToken.userId,
          family_id: mockToken.familyId,
          token: mockToken.token,
          expires_at: mockToken.expiresAt,
          created_at: mockToken.createdAt,
        })
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          email_verified: mockUser.emailVerified,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        })
        .mockResolvedValueOnce({
          id: mockFamily.id,
          user_id: mockFamily.userId,
          revoked_at: null,
          revoke_reason: null,
          created_at: mockFamily.createdAt,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
        const tx = {
          execute: vi.fn().mockResolvedValue(1),
        };
        return await callback(tx as unknown as DbClient);
      });

      vi.mocked(createRefreshToken).mockReturnValue('new-token');
      vi.mocked(getRefreshTokenExpiry).mockReturnValue(new Date());

      const result = await rotateRefreshToken(db, mockToken.token);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUser.id);
    });
  });
});

// ============================================================================
// Tests: revokeTokenFamily
// ============================================================================

describe('revokeTokenFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should revoke family and delete all tokens in transaction', async () => {
    const db = createMockDbClient();
    const mockTx = {
      execute: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return await callback(mockTx as unknown as DbClient);
    });

    await revokeTokenFamily(db, 'family-123', 'Token reuse detected');

    expect(withTransaction).toHaveBeenCalledWith(db, expect.any(Function));
    expect(mockTx.execute).toHaveBeenCalledTimes(3);
  });

  test('should set revoked_at and revoke_reason on family', async () => {
    const db = createMockDbClient();
    const mockTx = {
      execute: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return await callback(mockTx as unknown as DbClient);
    });

    await revokeTokenFamily(db, 'family-123', 'Manual revocation');

    expect(mockTx.execute).toHaveBeenCalled();
  });

  test('should handle transaction rollback on error', async () => {
    const db = createMockDbClient();
    const error = new Error('Database error');

    vi.mocked(withTransaction).mockRejectedValue(error);

    await expect(revokeTokenFamily(db, 'family-123', 'Test reason')).rejects.toThrow(
      'Database error',
    );
  });
});

// ============================================================================
// Tests: revokeAllUserTokens
// ============================================================================

describe('revokeAllUserTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should revoke all families and delete all tokens for user', async () => {
    const db = createMockDbClient();
    const mockTx = {
      execute: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return await callback(mockTx as unknown as DbClient);
    });

    await revokeAllUserTokens(db, 'user-123');

    expect(withTransaction).toHaveBeenCalledWith(db, expect.any(Function));
    expect(mockTx.execute).toHaveBeenCalledTimes(3);
  });

  test('should set appropriate revoke reason', async () => {
    const db = createMockDbClient();
    const mockTx = {
      execute: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return await callback(mockTx as unknown as DbClient);
    });

    await revokeAllUserTokens(db, 'user-123');

    expect(mockTx.execute).toHaveBeenCalled();
  });

  test('should handle transaction rollback on error', async () => {
    const db = createMockDbClient();
    const error = new Error('Transaction failed');

    vi.mocked(withTransaction).mockRejectedValue(error);

    await expect(revokeAllUserTokens(db, 'user-123')).rejects.toThrow('Transaction failed');
  });
});

// ============================================================================
// Tests: cleanupExpiredTokens
// ============================================================================

describe('cleanupExpiredTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should delete expired tokens and return count', async () => {
    const db = createMockDbClient();

    vi.mocked(db.execute).mockResolvedValue(5);

    const result = await cleanupExpiredTokens(db);

    expect(result).toBe(5);
    expect(db.execute).toHaveBeenCalled();
  });

  test('should use current date for expiration check', async () => {
    const db = createMockDbClient();

    vi.mocked(db.execute).mockResolvedValue(0);

    const result = await cleanupExpiredTokens(db);

    expect(result).toBe(0);
    expect(db.execute).toHaveBeenCalled();
  });

  test('should return zero if no expired tokens found', async () => {
    const db = createMockDbClient();

    vi.mocked(db.execute).mockResolvedValue(0);

    const result = await cleanupExpiredTokens(db);

    expect(result).toBe(0);
  });

  test('should handle database errors gracefully', async () => {
    const db = createMockDbClient();
    const error = new Error('Database error');

    vi.mocked(db.execute).mockRejectedValue(error);

    await expect(cleanupExpiredTokens(db)).rejects.toThrow('Database error');
  });
});
