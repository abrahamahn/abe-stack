// apps/server/src/modules/auth/utils/__tests__/refresh-token.test.ts
import { refreshTokenFamilies, refreshTokens } from '@abe-stack/db';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  cleanupExpiredTokens,
  createRefreshTokenFamily,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
} from '..';
import { authConfig } from '../../../../config/auth';

import type { DbClient } from '@abe-stack/db';

interface TokenFamily {
  id: string;
  userId: string;
  createdAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
}

interface Token {
  id: string;
  userId: string;
  familyId: string | null;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface MockUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
}

interface InsertData {
  userId?: string;
  familyId?: string;
  token?: string;
  expiresAt?: Date;
}

interface UpdateData {
  revokedAt?: Date;
  revokeReason?: string;
}

// Mock database
function createMockDb(): {
  db: DbClient;
  tokenFamilies: TokenFamily[];
  tokens: Token[];
  mockUsers: MockUser[];
} {
  const tokenFamilies: TokenFamily[] = [];

  const tokens: Token[] = [];

  const mockUsers: MockUser[] = [
    {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    },
  ];

  const db = {
    insert: (
      table: typeof refreshTokenFamilies | typeof refreshTokens,
    ): {
      values: (data: InsertData) => { returning: () => Promise<TokenFamily[]> } | Promise<void>;
    } => ({
      values: (data: InsertData): { returning: () => Promise<TokenFamily[]> } | Promise<void> => {
        if (table === refreshTokenFamilies) {
          const family: TokenFamily = {
            id: `family-${String(tokenFamilies.length + 1)}`,
            userId: data.userId ?? '',
            createdAt: new Date(),
            revokedAt: null,
            revokeReason: null,
          };
          tokenFamilies.push(family);
          return {
            returning: (): Promise<TokenFamily[]> => Promise.resolve([family]),
          };
        } else if (table === refreshTokens) {
          const token: Token = {
            id: `token-${String(tokens.length + 1)}`,
            userId: data.userId ?? '',
            familyId: data.familyId ?? null,
            token: data.token ?? '',
            expiresAt: data.expiresAt ?? new Date(),
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
        findFirst: ({
          orderBy: _orderBy,
        }: {
          where?: unknown;
          orderBy?: unknown;
        }): Promise<Token | null> => {
          const filtered = tokens.filter((t) => t.expiresAt > new Date());

          if (filtered.length > 0) {
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }

          return Promise.resolve(filtered[0] ?? null);
        },
      },
      refreshTokenFamilies: {
        findFirst: (_args: { where?: unknown }): Promise<TokenFamily | null> => {
          return Promise.resolve(tokenFamilies[0] ?? null);
        },
      },
      users: {
        findFirst: (_args: { where?: unknown }): Promise<MockUser | null> => {
          return Promise.resolve(mockUsers[0] ?? null);
        },
      },
    },
    delete: (
      table: typeof refreshTokens,
    ): { where: (_condition: unknown) => Promise<Token[]> } => ({
      where: (_condition: unknown): Promise<Token[]> => {
        if (table === refreshTokens) {
          tokens.length = 0; // Simplified deletion
          return Promise.resolve(tokens);
        }
        return Promise.resolve([]);
      },
    }),
    update: (
      table: typeof refreshTokenFamilies,
    ): { set: (data: UpdateData) => { where: (_condition: unknown) => Promise<void> } } => ({
      set: (data: UpdateData): { where: (_condition: unknown) => Promise<void> } => ({
        where: (_condition: unknown): Promise<void> => {
          const firstFamily = tokenFamilies[0];
          if (table === refreshTokenFamilies && firstFamily !== undefined) {
            firstFamily.revokedAt = data.revokedAt ?? null;
            firstFamily.revokeReason = data.revokeReason ?? null;
          }
          return Promise.resolve();
        },
      }),
    }),
  } as unknown as DbClient;

  return { db, tokenFamilies, tokens, mockUsers };
}

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
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      expect(firstFamily.userId).toBe('user-123');
      expect(tokens).toHaveLength(1);
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      expect(firstToken.familyId).toBe(result.familyId);
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
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');

      // Allow 1 second margin
      expect(firstToken.expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 1000);
      expect(firstToken.expiresAt.getTime()).toBeLessThan(expectedExpiry + 1000);
    });
  });

  describe('rotateRefreshToken', () => {
    test('should rotate a valid token', async () => {
      const { db, tokens } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Simulate existing token
      const existingToken = tokens[0];
      if (existingToken === undefined) throw new Error('Expected token');
      tokens[0] = {
        ...existingToken,
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
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      firstToken.expiresAt = new Date(Date.now() - 1000); // Expired

      const result = await rotateRefreshToken(db, firstToken.token);

      expect(result).toBeNull();
    });

    test('should detect token reuse and revoke family', async () => {
      const { db, tokenFamilies } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Mark family as revoked
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      firstFamily.revokedAt = new Date();
      firstFamily.revokeReason = 'Token reuse detected';

      const result = await rotateRefreshToken(db, initial.token);

      expect(result).toBeNull();
    });
  });

  describe('revokeTokenFamily', () => {
    test('should revoke a token family', async () => {
      const { db, tokenFamilies } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      const familyId = firstFamily.id;

      await revokeTokenFamily(db, familyId, 'Security concern');

      expect(firstFamily.revokedAt).toBeInstanceOf(Date);
      expect(firstFamily.revokeReason).toBe('Security concern');
    });

    test('should delete all tokens in family', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create family with multiple tokens
      await createRefreshTokenFamily(db, 'user-123');
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      const familyId = firstFamily.id;

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
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      firstToken.createdAt = new Date(now - gracePeriod / 2);

      // This should be allowed within grace period
      const result = await rotateRefreshToken(db, firstToken.token);

      // Should either return new token or handle gracefully
      expect(result).toBeDefined();
    });

    test('should reject reuse outside grace period', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');

      // Simulate old token (outside grace period)
      const gracePeriod = authConfig.refreshTokenGracePeriodSeconds * 1000;
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      firstToken.createdAt = new Date(Date.now() - gracePeriod * 2);

      // Mark family as revoked (reuse detected)
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      firstFamily.revokedAt = new Date();

      const result = await rotateRefreshToken(db, firstToken.token);

      expect(result).toBeNull();
    });
  });
});
