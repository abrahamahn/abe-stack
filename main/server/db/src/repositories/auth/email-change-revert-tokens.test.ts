// main/server/db/src/repositories/auth/email-change-revert-tokens.test.ts
/**
 * Tests for Email Change Revert Tokens Repository
 *
 * Validates email change revert token operations including token lookup by hash,
 * creation, marking as used, invalidation of pending tokens, and cleanup of expired tokens.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEmailChangeRevertTokenRepository } from './email-change-revert-tokens';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb =>
  ({
    query: vi.fn(),
    raw: vi.fn() as RawDb['raw'],
    transaction: vi.fn() as RawDb['transaction'],
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn() as RawDb['getClient'],
    queryOne: vi.fn(),
    execute: vi.fn(),
    withSession: vi.fn() as RawDb['withSession'],
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockToken = {
  id: 'ecrt-123',
  user_id: 'usr-123',
  old_email: 'old@example.com',
  new_email: 'new@example.com',
  token_hash: 'sha256hash',
  expires_at: new Date('2024-02-01'),
  used_at: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createEmailChangeRevertTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new email change revert token successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.userId).toBe('usr-123');
      expect(result.oldEmail).toBe('old@example.com');
      expect(result.newEmail).toBe('new@example.com');
      expect(result.tokenHash).toBe('sha256hash');
      expect(result.expiresAt).toEqual(new Date('2024-02-01'));
      expect(result.usedAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailChangeRevertTokenRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          tokenHash: 'sha256hash',
          expiresAt: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create email change revert token');
    });

    it('should transform camelCase input to snake_case for database', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.create({
        userId: 'usr-123',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
          values: expect.arrayContaining([
            'usr-123',
            'old@example.com',
            'new@example.com',
            'sha256hash',
          ]),
        }),
      );
    });
  });

  describe('findByTokenHash', () => {
    it('should return token when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.findByTokenHash('sha256hash');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.oldEmail).toBe('old@example.com');
      expect(result?.newEmail).toBe('new@example.com');
      expect(result?.tokenHash).toBe('sha256hash');
      expect(result?.usedAt).toBeNull();
      expect(result?.expiresAt).toEqual(new Date('2024-02-01'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.findByTokenHash('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should filter by token_hash in WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.findByTokenHash('sha256hash');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('token_hash'),
        }),
      );
    });

    it('should transform snake_case result to camelCase', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.findByTokenHash('sha256hash');

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('oldEmail');
      expect(result).toHaveProperty('newEmail');
      expect(result).toHaveProperty('tokenHash');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('usedAt');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used successfully', async () => {
      const mockUsedToken = {
        ...mockToken,
        used_at: new Date('2024-01-15'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsedToken);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.markAsUsed('ecrt-123');

      expect(result).toBeDefined();
      expect(result?.usedAt).toEqual(new Date('2024-01-15'));
      expect(result?.userId).toBe('usr-123');
      expect(result?.oldEmail).toBe('old@example.com');
      expect(result?.newEmail).toBe('new@example.com');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.markAsUsed('nonexistent-token');

      expect(result).toBeNull();
    });

    it('should set used_at in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockToken,
        used_at: new Date(),
      });

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.markAsUsed('ecrt-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('used_at'),
        }),
      );
    });

    it('should filter by id in WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockToken,
        used_at: new Date(),
      });

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.markAsUsed('ecrt-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
          values: expect.arrayContaining(['ecrt-123']),
        }),
      );
    });
  });

  describe('invalidateForUser', () => {
    it('should invalidate pending tokens for a user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.invalidateForUser('usr-123');

      expect(result).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return zero when no pending tokens to invalidate', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.invalidateForUser('usr-123');

      expect(result).toBe(0);
    });

    it('should set used_at in update query', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.invalidateForUser('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('used_at'),
        }),
      );
    });

    it('should filter by user_id and used_at IS NULL', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.invalidateForUser('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*used_at.*IS NULL/s),
        }),
      );
    });

    it('should only invalidate unused tokens', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.invalidateForUser('usr-123');

      const call = vi.mocked(mockDb.execute).mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.text).toMatch(/IS NULL/);
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired tokens', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.deleteExpired();

      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return zero when no expired tokens exist', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      const result = await repo.deleteExpired();

      expect(result).toBe(0);
    });

    it('should filter by expires_at in WHERE clause', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createEmailChangeRevertTokenRepository(mockDb);
      await repo.deleteExpired();

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('expires_at'),
        }),
      );
    });
  });
});
