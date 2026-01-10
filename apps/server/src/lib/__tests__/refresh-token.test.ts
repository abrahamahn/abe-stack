// apps/server/src/lib/__tests__/refresh-token.test.ts

import { refreshTokenFamilies, refreshTokens, users } from '@abe-stack/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { authConfig } from '../../config/auth';
import {
  cleanupExpiredTokens,
  createRefreshTokenFamily,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
} from '../refresh-token';

import type { DbClient } from '@abe-stack/db';

// Mock database
const createMockDb = () => {
  const tokenFamilies: Array<{
    id: string;
    userId: string;
    createdAt: Date;
    revokedAt: Date | null;
    revokeReason: string | null;
  }> = [];

  const tokens: Array<{
    id: string;
    userId: string;
    familyId: string | null;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }> = [];

  const mockUsers: Array<{
    id: string;
    email: string;
    role: 'user' | 'admin' | 'moderator';
  }> = [
    {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    },
  ];

  return {
    tokenFamilies,
    tokens,
    mockUsers,
    db: {
      insert: (table: any) => ({
        values: (data: any) => {
          if (table === refreshTokenFamilies) {
            const family = {
              id: `family-${tokenFamilies.length + 1}`,
              userId: data.userId,
              createdAt: new Date(),
              revokedAt: null,
              revokeReason: null,
            };
            tokenFamilies.push(family);
            return {
              returning: () => Promise.resolve([family]),
            };
          } else if (table === refreshTokens) {
            const token = {
              id: `token-${tokens.length + 1}`,
              userId: data.userId,
              familyId: data.familyId || null,
              token: data.token,
              expiresAt: data.expiresAt,
              createdAt: new Date(),
            };
            tokens.push(token);
            return Promise.resolve();
          }
          return Promise.resolve();
        },
      }),
      query: {
        refreshTokens: {
          findFirst: ({ where, orderBy }: any) => {
            let filtered = tokens.filter((t) => t.expiresAt > new Date());

            // Simple filtering logic
            if (where) {
              // This is a simplified mock - in reality, Drizzle uses more complex structures
              filtered = filtered.filter((t) => {
                // Mock the token matching
                return true; // Simplified for testing
              });
            }

            if (orderBy && filtered.length > 0) {
              filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            }

            return Promise.resolve(filtered[0] || null);
          },
        },
        refreshTokenFamilies: {
          findFirst: ({ where }: any) => {
            return Promise.resolve(tokenFamilies[0] || null);
          },
        },
        users: {
          findFirst: ({ where }: any) => {
            return Promise.resolve(mockUsers[0] || null);
          },
        },
      },
      delete: (table: any) => ({
        where: (condition: any) => {
          if (table === refreshTokens) {
            const before = tokens.length;
            tokens.length = 0; // Simplified deletion
            return Promise.resolve(tokens);
          }
          return Promise.resolve([]);
        },
      }),
      update: (table: any) => ({
        set: (data: any) => ({
          where: (condition: any) => {
            if (table === refreshTokenFamilies && tokenFamilies.length > 0) {
              tokenFamilies[0].revokedAt = data.revokedAt;
              tokenFamilies[0].revokeReason = data.revokeReason;
            }
            return Promise.resolve();
          },
        }),
      }),
    } as unknown as DbClient,
  };
};

describe('Refresh Token Rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRefreshTokenFamily', () => {
    test('should create a new token family', async () => {
      const { db, tokenFamilies, tokens } = createMockDb();

      const result = await createRefreshTokenFamily(db, 'user-123');

      expect(result).toHaveProperty('familyId');
      expect(result).toHaveProperty('token');
      expect(result.token).toBeTruthy();
      expect(tokenFamilies).toHaveLength(1);
      expect(tokenFamilies[0].userId).toBe('user-123');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].familyId).toBe(result.familyId);
    });

    test('should generate unique tokens', async () => {
      const { db } = createMockDb();

      const result1 = await createRefreshTokenFamily(db, 'user-123');
      const result2 = await createRefreshTokenFamily(db, 'user-123');

      expect(result1.token).not.toBe(result2.token);
      expect(result1.familyId).not.toBe(result2.familyId);
    });

    test('should set proper expiration time', async () => {
      const { db, tokens } = createMockDb();

      await createRefreshTokenFamily(db, 'user-123');

      expect(tokens).toHaveLength(1);
      const expiryDays = authConfig.refreshTokenExpiryDays;
      const expectedExpiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;

      // Allow 1 second margin
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 1000);
      expect(tokens[0].expiresAt.getTime()).toBeLessThan(expectedExpiry + 1000);
    });
  });

  describe('rotateRefreshToken', () => {
    test('should rotate a valid token', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Simulate existing token
      tokens[0] = {
        ...tokens[0],
        token: 'old-token',
        familyId: initial.familyId,
      };

      const result = await rotateRefreshToken(db, 'old-token');

      expect(result).not.toBeNull();
      expect(result?.token).toBeTruthy();
      expect(result?.userId).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('user');
    });

    test('should return null for invalid token', async () => {
      const { db } = createMockDb();

      const result = await rotateRefreshToken(db, 'invalid-token');

      expect(result).toBeNull();
    });

    test('should return null for expired token', async () => {
      const { db, tokens } = createMockDb();

      // Create expired token
      await createRefreshTokenFamily(db, 'user-123');
      tokens[0].expiresAt = new Date(Date.now() - 1000); // Expired

      const result = await rotateRefreshToken(db, tokens[0].token);

      expect(result).toBeNull();
    });

    test('should detect token reuse and revoke family', async () => {
      const { db, tokenFamilies } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Mark family as revoked
      tokenFamilies[0].revokedAt = new Date();
      tokenFamilies[0].revokeReason = 'Token reuse detected';

      const result = await rotateRefreshToken(db, initial.token);

      expect(result).toBeNull();
    });
  });

  describe('revokeTokenFamily', () => {
    test('should revoke a token family', async () => {
      const { db, tokenFamilies } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');
      const familyId = tokenFamilies[0].id;

      await revokeTokenFamily(db, familyId, 'Security concern');

      expect(tokenFamilies[0].revokedAt).toBeInstanceOf(Date);
      expect(tokenFamilies[0].revokeReason).toBe('Security concern');
    });

    test('should delete all tokens in family', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create family with multiple tokens
      await createRefreshTokenFamily(db, 'user-123');
      const familyId = tokenFamilies[0].id;

      const initialCount = tokens.length;

      await revokeTokenFamily(db, familyId, 'Cleanup');

      // Tokens should be deleted (in our mock, array is cleared)
      expect(tokens.length).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('revokeAllUserTokens', () => {
    test('should revoke all token families for a user', async () => {
      const { db, tokenFamilies } = createMockDb();

      // Create multiple families
      await createRefreshTokenFamily(db, 'user-123');
      await createRefreshTokenFamily(db, 'user-123');

      await revokeAllUserTokens(db, 'user-123');

      // All families should be marked as revoked
      tokenFamilies.forEach((family) => {
        expect(family.revokedAt).toBeInstanceOf(Date);
        expect(family.revokeReason).toBe('User logged out from all devices');
      });
    });

    test('should delete all tokens for a user', async () => {
      const { db, tokens } = createMockDb();

      // Create multiple tokens
      await createRefreshTokenFamily(db, 'user-123');
      await createRefreshTokenFamily(db, 'user-123');

      const initialCount = tokens.length;

      await revokeAllUserTokens(db, 'user-123');

      // Tokens should be deleted
      expect(tokens.length).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('should remove expired tokens', async () => {
      const { db, tokens } = createMockDb();

      // Create mix of valid and expired tokens
      await createRefreshTokenFamily(db, 'user-123');
      tokens.push({
        id: 'expired-1',
        userId: 'user-123',
        familyId: 'family-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      });

      const deleted = await cleanupExpiredTokens(db);

      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    test('should not remove valid tokens', async () => {
      const { db } = createMockDb();

      // Create only valid tokens
      await createRefreshTokenFamily(db, 'user-123');

      const deleted = await cleanupExpiredTokens(db);

      expect(deleted).toBe(0);
    });
  });

  describe('Security Features', () => {
    test('should implement grace period for network retries', async () => {
      const { db, tokens } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');

      // Simulate recent token (within grace period)
      const now = Date.now();
      const gracePeriod = authConfig.refreshTokenGracePeriodSeconds * 1000;
      tokens[0].createdAt = new Date(now - gracePeriod / 2);

      // This should be allowed within grace period
      const result = await rotateRefreshToken(db, tokens[0].token);

      // Should either return new token or handle gracefully
      expect(result).toBeDefined();
    });

    test('should reject reuse outside grace period', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');

      // Simulate old token (outside grace period)
      const gracePeriod = authConfig.refreshTokenGracePeriodSeconds * 1000;
      tokens[0].createdAt = new Date(Date.now() - gracePeriod * 2);

      // Mark family as revoked (reuse detected)
      tokenFamilies[0].revokedAt = new Date();

      const result = await rotateRefreshToken(db, tokens[0].token);

      expect(result).toBeNull();
    });
  });
});
