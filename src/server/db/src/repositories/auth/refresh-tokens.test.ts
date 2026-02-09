// src/server/db/src/repositories/auth/refresh-tokens.test.ts
/**
 * Tests for Refresh Tokens Repository
 *
 * Validates refresh token CRUD operations including token lookups,
 * creation, and deletion by token value or user ID.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createRefreshTokenRepository } from './refresh-tokens';

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

const mockRefreshToken = {
  id: 'rt-123',
  user_id: 'usr-123',
  family_id: 'fam-123',
  token: 'refresh-token-value',
  expires_at: new Date('2024-02-01'),
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createRefreshTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByToken', () => {
    it('should return refresh token when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRefreshToken);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.findByToken('refresh-token-value');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.familyId).toBe('fam-123');
      expect(result?.token).toBe('refresh-token-value');
      expect(result?.expiresAt).toEqual(new Date('2024-02-01'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when refresh token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });

    it('should filter by token value', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRefreshToken);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.findByToken('refresh-token-value');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('token'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a new refresh token successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRefreshToken);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        familyId: 'fam-123',
        token: 'refresh-token-value',
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.userId).toBe('usr-123');
      expect(result.familyId).toBe('fam-123');
      expect(result.token).toBe('refresh-token-value');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createRefreshTokenRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          familyId: 'fam-123',
          token: 'refresh-token-value',
          expiresAt: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create refresh token');
    });
  });

  describe('deleteByToken', () => {
    it('should return true when token is deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.deleteByToken('refresh-token-value');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when token not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.deleteByToken('nonexistent-token');

      expect(result).toBe(false);
    });

    it('should filter by token value in delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.deleteByToken('refresh-token-value');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('token'),
        }),
      );
    });
  });

  describe('deleteByUserId', () => {
    it('should delete all refresh tokens for a user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return zero when no tokens to delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(0);
    });

    it('should filter by user_id in delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.deleteByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });
  });
});
