// main/server/db/src/repositories/auth/totp-backup-codes.test.ts
/**
 * Tests for TOTP Backup Codes Repository
 *
 * Validates TOTP backup code operations including creation, finding unused codes,
 * marking codes as used, and bulk deletion by user ID.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTotpBackupCodeRepository } from './totp-backup-codes';

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

const mockBackupCode = {
  id: 'tbc-123',
  user_id: 'usr-123',
  code_hash: 'sha256hash',
  used_at: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTotpBackupCodeRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new backup code successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockBackupCode);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        codeHash: 'sha256hash',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.codeHash).toBe('sha256hash');
      expect(result.usedAt).toBeNull();
      expect(result.createdAt).toEqual(new Date('2024-01-01'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTotpBackupCodeRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          codeHash: 'sha256hash',
        }),
      ).rejects.toThrow('Failed to create TOTP backup code');
    });

    it('should use INSERT INTO query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockBackupCode);

      const repo = createTotpBackupCodeRepository(mockDb);
      await repo.create({
        userId: 'usr-123',
        codeHash: 'sha256hash',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*totp_backup_codes/i),
        }),
      );
    });
  });

  describe('findUnusedByUserId', () => {
    it('should return unused backup codes when found', async () => {
      const mockUnusedCodes = [
        mockBackupCode,
        {
          id: 'tbc-456',
          user_id: 'usr-123',
          code_hash: 'sha256hash2',
          used_at: null,
          created_at: new Date('2024-01-01'),
        },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mockUnusedCodes);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.findUnusedByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[0]?.codeHash).toBe('sha256hash');
      expect(result[0]?.usedAt).toBeNull();
      expect(result[1]?.codeHash).toBe('sha256hash2');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no unused codes found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.findUnusedByUserId('usr-123');

      expect(result).toEqual([]);
    });

    it('should filter by user_id and used_at IS NULL', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTotpBackupCodeRepository(mockDb);
      await repo.findUnusedByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*used_at.*IS NULL/s),
        }),
      );
    });
  });

  describe('markAsUsed', () => {
    it('should mark backup code as used successfully', async () => {
      const mockUsedCode = {
        ...mockBackupCode,
        used_at: new Date('2024-01-15'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsedCode);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.markAsUsed('tbc-123');

      expect(result).toBeDefined();
      expect(result?.usedAt).toEqual(new Date('2024-01-15'));
      expect(result?.userId).toBe('usr-123');
      expect(result?.codeHash).toBe('sha256hash');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when backup code not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.markAsUsed('nonexistent-code');

      expect(result).toBeNull();
    });

    it('should set used_at in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockBackupCode,
        used_at: new Date(),
      });

      const repo = createTotpBackupCodeRepository(mockDb);
      await repo.markAsUsed('tbc-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('used_at'),
        }),
      );
    });
  });

  describe('deleteByUserId', () => {
    it('should delete backup codes for a user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return zero when no backup codes to delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTotpBackupCodeRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(0);
    });

    it('should filter by user_id in delete query', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTotpBackupCodeRepository(mockDb);
      await repo.deleteByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*user_id/s),
        }),
      );
    });
  });
});
