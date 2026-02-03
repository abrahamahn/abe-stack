// packages/db/src/repositories/auth/email-verification-tokens.test.ts
/**
 * Tests for Email Verification Tokens Repository
 *
 * Validates email verification token operations including valid token lookups,
 * creation, and marking tokens as used.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEmailVerificationTokenRepository } from './email-verification-tokens';

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
  id: 'evt-123',
  user_id: 'usr-123',
  token_hash: 'sha256hash',
  expires_at: new Date('2024-02-01'),
  used_at: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createEmailVerificationTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findValidByTokenHash', () => {
    it('should return token when found and valid', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailVerificationTokenRepository(mockDb);
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

      const repo = createEmailVerificationTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should filter by token_hash, expires_at, and used_at', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailVerificationTokenRepository(mockDb);
      await repo.findValidByTokenHash('sha256hash');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/token_hash.*expires_at.*used_at/s),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a new email verification token successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockToken);

      const repo = createEmailVerificationTokenRepository(mockDb);
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

      const repo = createEmailVerificationTokenRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          tokenHash: 'sha256hash',
          expiresAt: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create email verification token');
    });
  });

  describe('markAsUsed', () => {
    it('should mark token as used successfully', async () => {
      const mockUsedToken = {
        ...mockToken,
        used_at: new Date('2024-01-15'),
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUsedToken);

      const repo = createEmailVerificationTokenRepository(mockDb);
      const result = await repo.markAsUsed('evt-123');

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

      const repo = createEmailVerificationTokenRepository(mockDb);
      const result = await repo.markAsUsed('nonexistent-token');

      expect(result).toBeNull();
    });

    it('should set used_at in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockToken,
        used_at: new Date(),
      });

      const repo = createEmailVerificationTokenRepository(mockDb);
      await repo.markAsUsed('evt-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('used_at'),
        }),
      );
    });
  });
});
