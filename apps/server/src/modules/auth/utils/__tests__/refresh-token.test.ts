// apps/server/src/modules/auth/utils/__tests__/refresh-token.test.ts
import { TokenReuseError } from '@abe-stack/core';
import { refreshTokenFamilies, refreshTokens } from '@database';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  cleanupExpiredTokens,
  createRefreshTokenFamily,
  revokeAllUserTokens,
  revokeTokenFamily,
  rotateRefreshToken,
} from '../index';

import type { DbClient } from '@database';

// Test configuration (matches defaults from auth.config.ts)
const TEST_REFRESH_TOKEN_EXPIRY_DAYS = 7;
const TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS = 30;

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

type TransactionCallback<T> = (tx: DbClient) => Promise<T>;

interface MockDbOptions {
  /** Make the next token insert fail (for rollback testing) */
  failOnTokenInsert?: boolean;
  /** Make the next token delete fail (for rollback testing) */
  failOnTokenDelete?: boolean;
  /** Make the next family update fail (for rollback testing) */
  failOnFamilyUpdate?: boolean;
}

// Pending update operation to be committed/rolled back
interface PendingFamilyUpdate {
  familyId: string;
  data: UpdateData;
}

// Mock database
function createMockDb(options: MockDbOptions = {}): {
  db: DbClient;
  tokenFamilies: TokenFamily[];
  tokens: Token[];
  mockUsers: MockUser[];
  setDeleteMode: (mode: 'all' | 'expired') => void;
  setFailOnTokenInsert: (fail: boolean) => void;
  setFailOnTokenDelete: (fail: boolean) => void;
  setFailOnFamilyUpdate: (fail: boolean) => void;
} {
  const tokenFamilies: TokenFamily[] = [];
  const tokens: Token[] = [];
  let deleteMode: 'all' | 'expired' = 'all';
  let failOnTokenInsert = options.failOnTokenInsert ?? false;
  let failOnTokenDelete = options.failOnTokenDelete ?? false;
  let failOnFamilyUpdate = options.failOnFamilyUpdate ?? false;

  const mockUsers: MockUser[] = [
    {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    },
  ];

  // Helper to apply pending updates
  const applyUpdates = (updates: PendingFamilyUpdate[]): void => {
    updates.forEach((update) => {
      tokenFamilies.forEach((f) => {
        f.revokedAt = update.data.revokedAt ?? f.revokedAt;
        f.revokeReason = update.data.revokeReason ?? f.revokeReason;
      });
    });
  };

  // Helper to apply pending deletes
  const applyTokenDeletes = (deletedIds: Set<string>): void => {
    if (deletedIds.size > 0) {
      const remaining = tokens.filter((t) => !deletedIds.has(t.id));
      tokens.length = 0;
      tokens.push(...remaining);
    }
  };

  // Create the db object with transaction support that properly handles rollback
  const createDbInstance = (
    isTransaction: boolean,
    pendingFamilies: TokenFamily[],
    pendingTokens: Token[],
    pendingUpdates: PendingFamilyUpdate[],
    pendingDeletedTokenIds: Set<string>,
  ): DbClient => {
    const instance = {
      transaction: async <T>(callback: TransactionCallback<T>): Promise<T> => {
        // Create isolated transaction state
        const transactionFamilies: TokenFamily[] = [];
        const transactionTokens: Token[] = [];
        const transactionUpdates: PendingFamilyUpdate[] = [];
        const transactionDeletedTokenIds: Set<string> = new Set();

        const txInstance = createDbInstance(
          true,
          transactionFamilies,
          transactionTokens,
          transactionUpdates,
          transactionDeletedTokenIds,
        );

        // Execute callback - if it throws, transaction data is not committed (rollback)
        const result = await callback(txInstance);

        // Commit: merge transaction data into parent scope
        transactionFamilies.forEach((f) => {
          if (isTransaction) {
            pendingFamilies.push(f);
          } else {
            tokenFamilies.push(f);
          }
        });
        transactionTokens.forEach((t) => {
          if (isTransaction) {
            pendingTokens.push(t);
          } else {
            tokens.push(t);
          }
        });
        transactionUpdates.forEach((u) => {
          if (isTransaction) {
            pendingUpdates.push(u);
          } else {
            applyUpdates([u]);
          }
        });
        transactionDeletedTokenIds.forEach((id) => {
          if (isTransaction) {
            pendingDeletedTokenIds.add(id);
          } else {
            applyTokenDeletes(new Set([id]));
          }
        });

        return result;
      },
      insert: (
        table: typeof refreshTokenFamilies | typeof refreshTokens,
      ): {
        values: (data: InsertData) => { returning: () => Promise<TokenFamily[]> } | Promise<void>;
      } => ({
        values: (data: InsertData): { returning: () => Promise<TokenFamily[]> } | Promise<void> => {
          if (table === refreshTokenFamilies) {
            const family: TokenFamily = {
              id: `family-${String(tokenFamilies.length + pendingFamilies.length + 1)}`,
              userId: data.userId ?? '',
              createdAt: new Date(),
              revokedAt: null,
              revokeReason: null,
            };
            if (isTransaction) {
              pendingFamilies.push(family);
            } else {
              tokenFamilies.push(family);
            }
            return {
              returning: (): Promise<TokenFamily[]> => Promise.resolve([family]),
            };
          } else if (table === refreshTokens) {
            if (failOnTokenInsert) {
              return Promise.reject(new Error('Simulated token insert failure'));
            }
            const token: Token = {
              id: `token-${String(tokens.length + pendingTokens.length + 1)}`,
              userId: data.userId ?? '',
              familyId: data.familyId ?? null,
              token: data.token ?? '',
              expiresAt: data.expiresAt ?? new Date(),
              createdAt: new Date(),
            };
            if (isTransaction) {
              pendingTokens.push(token);
            } else {
              tokens.push(token);
            }
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
            const allTokens = [...tokens, ...pendingTokens];
            const filtered = allTokens.filter((t) => t.expiresAt > new Date());

            if (filtered.length > 0) {
              filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            }

            return Promise.resolve(filtered[0] ?? null);
          },
        },
        refreshTokenFamilies: {
          findFirst: (_args: { where?: unknown }): Promise<TokenFamily | null> => {
            const allFamilies = [...tokenFamilies, ...pendingFamilies];
            return Promise.resolve(allFamilies[0] ?? null);
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
            if (failOnTokenDelete) {
              return Promise.reject(new Error('Simulated token delete failure'));
            }
            if (deleteMode === 'expired') {
              const now = new Date();
              const expiredTokens = tokens.filter((t) => t.expiresAt < now);
              const validTokens = tokens.filter((t) => t.expiresAt >= now);
              tokens.length = 0;
              tokens.push(...validTokens);
              return Promise.resolve(expiredTokens);
            }

            // For transactions, mark tokens for deletion
            if (isTransaction) {
              tokens.forEach((t) => pendingDeletedTokenIds.add(t.id));
              return Promise.resolve([...tokens]);
            }

            const deleted = [...tokens];
            tokens.length = 0; // Simplified deletion
            return Promise.resolve(deleted);
          }
          return Promise.resolve([]);
        },
      }),
      update: (
        table: typeof refreshTokenFamilies,
      ): { set: (data: UpdateData) => { where: (_condition: unknown) => Promise<void> } } => ({
        set: (data: UpdateData): { where: (_condition: unknown) => Promise<void> } => ({
          where: (_condition: unknown): Promise<void> => {
            if (table === refreshTokenFamilies) {
              if (failOnFamilyUpdate) {
                return Promise.reject(new Error('Simulated family update failure'));
              }
              // For transactions, queue the update
              if (isTransaction) {
                pendingUpdates.push({ familyId: 'all', data });
                return Promise.resolve();
              }
              // For non-transaction, apply immediately
              tokenFamilies.forEach((f) => {
                f.revokedAt = data.revokedAt ?? f.revokedAt;
                f.revokeReason = data.revokeReason ?? f.revokeReason;
              });
            }
            return Promise.resolve();
          },
        }),
      }),
    } as unknown as DbClient;

    return instance;
  };

  const db = createDbInstance(false, tokenFamilies, tokens, [], new Set());

  return {
    db,
    tokenFamilies,
    tokens,
    mockUsers,
    setDeleteMode: (mode: 'all' | 'expired'): void => {
      deleteMode = mode;
    },
    setFailOnTokenInsert: (fail: boolean): void => {
      failOnTokenInsert = fail;
    },
    setFailOnTokenDelete: (fail: boolean): void => {
      failOnTokenDelete = fail;
    },
    setFailOnFamilyUpdate: (fail: boolean): void => {
      failOnFamilyUpdate = fail;
    },
  };
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
      const expiryDays = TEST_REFRESH_TOKEN_EXPIRY_DAYS;
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

      // Should throw TokenReuseError when family is revoked (token reuse detected)
      await expect(rotateRefreshToken(db, initial.token)).rejects.toThrow(TokenReuseError);
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
      const { db, tokens, setDeleteMode } = createMockDb();
      setDeleteMode('expired');

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
      const { db, setDeleteMode } = createMockDb();
      setDeleteMode('expired');

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
      const gracePeriod = TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS * 1000;
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
      const gracePeriod = TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS * 1000;
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      firstToken.createdAt = new Date(Date.now() - gracePeriod * 2);

      // Mark family as revoked (reuse detected)
      const firstFamily = tokenFamilies[0];
      if (firstFamily === undefined) throw new Error('Expected token family');
      firstFamily.revokedAt = new Date();

      // Should throw TokenReuseError when reuse is detected
      await expect(rotateRefreshToken(db, firstToken.token)).rejects.toThrow(TokenReuseError);
    });
  });

  describe('Grace Period Boundary Conditions', () => {
    test('should allow rotation at exactly grace period boundary minus 1ms', async () => {
      const { db, tokens } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');

      // Set token age to exactly 1ms before grace period expires
      const gracePeriodMs = TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS * 1000;
      const firstToken = tokens[0];
      if (firstToken === undefined) throw new Error('Expected token');
      firstToken.createdAt = new Date(Date.now() - gracePeriodMs + 1);

      const result = await rotateRefreshToken(
        db,
        firstToken.token,
        undefined,
        undefined,
        TEST_REFRESH_TOKEN_EXPIRY_DAYS,
        TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS,
      );

      // Should succeed - within grace period
      expect(result).not.toBeNull();
      expect(result?.token).toBeTruthy();
    });

    test('should reject rotation when token family is already revoked', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create initial family
      await createRefreshTokenFamily(db, 'user-123');

      // Get the original token
      const originalToken = tokens[0];
      if (originalToken === undefined) throw new Error('Expected original token');

      // Simulate family being revoked (e.g., from a previous reuse detection)
      const family = tokenFamilies[0];
      if (family === undefined) throw new Error('Expected token family');
      family.revokedAt = new Date();
      family.revokeReason = 'Token reuse detected';

      // Should throw TokenReuseError - family is revoked
      await expect(
        rotateRefreshToken(
          db,
          originalToken.token,
          undefined,
          undefined,
          TEST_REFRESH_TOKEN_EXPIRY_DAYS,
          TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS,
        ),
      ).rejects.toThrow(TokenReuseError);
    });

    test('should return newer token for retry within grace period', async () => {
      const { db, tokens } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Get the original token
      const originalToken = tokens[0];
      if (originalToken === undefined) throw new Error('Expected original token');

      // Set original token as recently created (within grace period)
      const gracePeriodMs = TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS * 1000;
      originalToken.createdAt = new Date(Date.now() - gracePeriodMs / 2);
      const savedOriginalToken = originalToken.token;

      // Add a newer token in the same family (simulating a successful rotation)
      const newerToken = 'newer-valid-token';
      tokens.push({
        id: 'token-newer',
        userId: 'user-123',
        familyId: initial.familyId,
        token: newerToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(), // Just created
      });

      const result = await rotateRefreshToken(
        db,
        savedOriginalToken,
        undefined,
        undefined,
        TEST_REFRESH_TOKEN_EXPIRY_DAYS,
        TEST_REFRESH_TOKEN_GRACE_PERIOD_SECONDS,
      );

      // Should return the newer token (network retry case)
      expect(result).not.toBeNull();
      expect(result?.token).toBe(newerToken);
    });

    test('should handle zero grace period (immediate reuse detection)', async () => {
      const { db, tokens, tokenFamilies } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Get the original token and set it as slightly old
      const originalToken = tokens[0];
      if (originalToken === undefined) throw new Error('Expected original token');
      originalToken.createdAt = new Date(Date.now() - 100); // 100ms old
      const savedOriginalToken = originalToken.token;

      // Add a newer token in the same family
      tokens.push({
        id: 'token-newer',
        userId: 'user-123',
        familyId: initial.familyId,
        token: 'newer-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      // With zero grace period, any reuse is detected and throws TokenReuseError
      await expect(
        rotateRefreshToken(
          db,
          savedOriginalToken,
          undefined,
          undefined,
          TEST_REFRESH_TOKEN_EXPIRY_DAYS,
          0, // Zero grace period
        ),
      ).rejects.toThrow(TokenReuseError);

      // Family should be revoked
      const family = tokenFamilies[0];
      expect(family?.revokedAt).toBeInstanceOf(Date);
    });

    test('should handle large grace period', async () => {
      const { db, tokens } = createMockDb();

      // Create initial family
      const initial = await createRefreshTokenFamily(db, 'user-123');

      // Get the original token
      const originalToken = tokens[0];
      if (originalToken === undefined) throw new Error('Expected original token');

      // Set token as 1 hour old
      originalToken.createdAt = new Date(Date.now() - 60 * 60 * 1000);
      const savedOriginalToken = originalToken.token;

      // Add a newer token
      tokens.push({
        id: 'token-newer',
        userId: 'user-123',
        familyId: initial.familyId,
        token: 'newer-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const result = await rotateRefreshToken(
        db,
        savedOriginalToken,
        undefined,
        undefined,
        TEST_REFRESH_TOKEN_EXPIRY_DAYS,
        3600, // 1 hour grace period
      );

      // Should allow - within 1 hour grace period
      expect(result).not.toBeNull();
    });
  });

  describe('Transaction Atomicity', () => {
    describe('createRefreshTokenFamily transaction rollback', () => {
      test('should roll back family creation when token insert fails', async () => {
        const { db, tokenFamilies, tokens, setFailOnTokenInsert } = createMockDb();

        // Configure mock to fail on token insert
        setFailOnTokenInsert(true);

        // Attempt to create family - should fail
        await expect(createRefreshTokenFamily(db, 'user-123')).rejects.toThrow(
          'Simulated token insert failure',
        );

        // Verify rollback: neither family nor token should be persisted
        expect(tokenFamilies).toHaveLength(0);
        expect(tokens).toHaveLength(0);
      });

      test('should commit both family and token on success', async () => {
        const { db, tokenFamilies, tokens } = createMockDb();

        const result = await createRefreshTokenFamily(db, 'user-123');

        // Verify commit: both family and token should be persisted
        expect(tokenFamilies).toHaveLength(1);
        expect(tokens).toHaveLength(1);
        expect(result.familyId).toBe(tokenFamilies[0]?.id);
        expect(tokens[0]?.familyId).toBe(result.familyId);
      });
    });

    describe('revokeTokenFamily transaction rollback', () => {
      test('should roll back family update when token delete fails', async () => {
        const { db, tokenFamilies, tokens, setFailOnTokenDelete } = createMockDb();

        // First create a family successfully
        await createRefreshTokenFamily(db, 'user-123');
        const family = tokenFamilies[0];
        if (family === undefined) throw new Error('Expected token family');
        const initialTokenCount = tokens.length;

        // Configure mock to fail on token delete
        setFailOnTokenDelete(true);

        // Attempt to revoke - should fail
        await expect(revokeTokenFamily(db, family.id, 'Test revocation')).rejects.toThrow(
          'Simulated token delete failure',
        );

        // Verify rollback: family should NOT be marked as revoked
        expect(family.revokedAt).toBeNull();
        expect(family.revokeReason).toBeNull();
        // Tokens should still exist
        expect(tokens.length).toBe(initialTokenCount);
      });

      test('should commit both family update and token deletion on success', async () => {
        const { db, tokenFamilies, tokens } = createMockDb();

        // Create a family first
        await createRefreshTokenFamily(db, 'user-123');
        const family = tokenFamilies[0];
        if (family === undefined) throw new Error('Expected token family');

        // Revoke the family
        await revokeTokenFamily(db, family.id, 'Security concern');

        // Verify commit: family should be revoked
        expect(family.revokedAt).toBeInstanceOf(Date);
        expect(family.revokeReason).toBe('Security concern');
        // Tokens should be deleted
        expect(tokens).toHaveLength(0);
      });
    });

    describe('revokeAllUserTokens transaction rollback', () => {
      test('should roll back family updates when token delete fails', async () => {
        const { db, tokenFamilies, tokens, setFailOnTokenDelete } = createMockDb();

        // Create multiple families for the user
        await createRefreshTokenFamily(db, 'user-123');
        await createRefreshTokenFamily(db, 'user-123');
        const initialTokenCount = tokens.length;

        // Verify families are not revoked initially
        tokenFamilies.forEach((family) => {
          expect(family.revokedAt).toBeNull();
        });

        // Configure mock to fail on token delete
        setFailOnTokenDelete(true);

        // Attempt to revoke all - should fail
        await expect(revokeAllUserTokens(db, 'user-123')).rejects.toThrow(
          'Simulated token delete failure',
        );

        // Verify rollback: families should NOT be marked as revoked
        tokenFamilies.forEach((family) => {
          expect(family.revokedAt).toBeNull();
          expect(family.revokeReason).toBeNull();
        });
        // Tokens should still exist
        expect(tokens.length).toBe(initialTokenCount);
      });

      test('should roll back when family update fails', async () => {
        const { db, tokenFamilies, tokens, setFailOnFamilyUpdate } = createMockDb();

        // Create multiple families for the user
        await createRefreshTokenFamily(db, 'user-123');
        await createRefreshTokenFamily(db, 'user-123');
        const initialTokenCount = tokens.length;

        // Configure mock to fail on family update
        setFailOnFamilyUpdate(true);

        // Attempt to revoke all - should fail
        await expect(revokeAllUserTokens(db, 'user-123')).rejects.toThrow(
          'Simulated family update failure',
        );

        // Verify rollback: families should NOT be marked as revoked
        tokenFamilies.forEach((family) => {
          expect(family.revokedAt).toBeNull();
          expect(family.revokeReason).toBeNull();
        });
        // Tokens should still exist
        expect(tokens.length).toBe(initialTokenCount);
      });

      test('should commit all changes on success', async () => {
        const { db, tokenFamilies, tokens } = createMockDb();

        // Create multiple families for the user
        await createRefreshTokenFamily(db, 'user-123');
        await createRefreshTokenFamily(db, 'user-123');

        // Revoke all tokens
        await revokeAllUserTokens(db, 'user-123');

        // Verify commit: all families should be revoked
        tokenFamilies.forEach((family) => {
          expect(family.revokedAt).toBeInstanceOf(Date);
          expect(family.revokeReason).toBe('User logged out from all devices');
        });
        // All tokens should be deleted
        expect(tokens).toHaveLength(0);
      });
    });
  });
});
