// main/server/db/src/repositories/auth/password-reset-tokens.test.ts
/**
 * Tests for Password Reset Tokens Repository
 *
 * Validates password reset token operations including valid token lookups,
 * creation, marking as used, and expired token cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createPasswordResetTokenRepository } from './password-reset-tokens';

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
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockToken = {
  id: 'prt-123',
  user_id: 'usr-123',
  token_hash: 'sha256hash',
  expires_at: new Date('2024-02-01'),
  used_at: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createPasswordResetTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findValidByTokenHash', () => {
    it('should return token when found and valid', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('sha256hash');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
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

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should filter by token_hash, expires_at, and used_at', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createPasswordResetTokenRepository(mockDb);
      await repo.findValidByTokenHash('sha256hash');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/token_hash.*expires_at.*used_at/s),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a new password reset token successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.userId).toBe('usr-123');
      expect(result.tokenHash).toBe('sha256hash');
      expect(result.expiresAt).toEqual(new Date('2024-02-01'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPasswordResetTokenRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          tokenHash: 'sha256hash',
          expiresAt: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create password reset token');
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used successfully', async () => {
      const mockUsedToken = {
        ...mockToken,
        used_at: new Date('2024-01-15'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsedToken);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.markAsUsed('prt-123');

      expect(result).toBeDefined();
      expect(result?.usedAt).toEqual(new Date('2024-01-15'));
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.markAsUsed('nonexistent-token');

      expect(result).toBeNull();
    });

    it('should set used_at in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockToken,
        used_at: new Date(),
      });

      const repo = createPasswordResetTokenRepository(mockDb);
      await repo.markAsUsed('prt-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('used_at'),
        }),
      );
    });
  });

  describe('deleteExpiredByUserId', () => {
    it('should delete expired tokens for a user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.deleteExpiredByUserId('usr-123');

      expect(result).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return zero when no expired tokens to delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPasswordResetTokenRepository(mockDb);
      const result = await repo.deleteExpiredByUserId('usr-123');

      expect(result).toBe(0);
    });

    it('should filter by user_id and expires_at', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createPasswordResetTokenRepository(mockDb);
      await repo.deleteExpiredByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*expires_at/s),
        }),
      );
    });
  });
});
