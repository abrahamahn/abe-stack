// main/server/db/src/repositories/auth/refresh-tokens.test.ts
/**
 * Tests for Refresh Tokens Repository
 *
 * Validates refresh token CRUD operations including token lookups,
 * creation, and deletion by token value or user ID.
 * Also validates family management methods that replace RefreshTokenFamilyRepository.
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
    withSession: vi.fn() as RawDb['withSession'],
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const now = new Date('2024-01-01');
const future = new Date('2024-02-01');

const mockRefreshToken = {
  id: 'rt-123',
  user_id: 'usr-123',
  family_id: 'fam-123',
  token: 'refresh-token-value',
  expires_at: future,
  family_ip_address: '1.2.3.4',
  family_user_agent: 'Mozilla/5.0',
  family_created_at: now,
  family_revoked_at: null,
  family_revoke_reason: null,
  created_at: now,
};

const mockFamilyRow = {
  family_id: 'fam-123',
  user_id: 'usr-123',
  ip_address: '1.2.3.4',
  user_agent: 'Mozilla/5.0',
  family_created_at: now,
  family_revoked_at: null,
  family_revoke_reason: null,
  latest_expires_at: future,
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
      expect(result?.expiresAt).toEqual(future);
      expect(result?.familyIpAddress).toBe('1.2.3.4');
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
        expiresAt: future,
        familyIpAddress: '1.2.3.4',
        familyUserAgent: 'Mozilla/5.0',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.familyId).toBe('fam-123');
      expect(result.token).toBe('refresh-token-value');
      expect(result.familyIpAddress).toBe('1.2.3.4');
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
          expiresAt: future,
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

  // ── findActiveFamilies ─────────────────────────────────────────────────────

  describe('findActiveFamilies', () => {
    it('should return active families for a user', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([mockFamilyRow]);

      const repo = createRefreshTokenRepository(mockDb);
      const results = await repo.findActiveFamilies('usr-123');

      expect(results).toHaveLength(1);
      expect(results[0]?.familyId).toBe('fam-123');
      expect(results[0]?.userId).toBe('usr-123');
      expect(results[0]?.ipAddress).toBe('1.2.3.4');
      expect(results[0]?.latestExpiresAt).toEqual(future);
    });

    it('should return empty array when user has no active families', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createRefreshTokenRepository(mockDb);
      const results = await repo.findActiveFamilies('usr-new');

      expect(results).toEqual([]);
    });

    it('should filter by user_id and family_revoked_at IS NULL', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.findActiveFamilies('usr-123');

      const [sql, values] = vi.mocked(mockDb.raw).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('user_id');
      expect(sql).toContain('family_revoked_at IS NULL');
      expect(values).toContain('usr-123');
    });

    it('should use DISTINCT ON to return one row per family', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.findActiveFamilies('usr-123');

      const [sql] = vi.mocked(mockDb.raw).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('DISTINCT ON');
    });
  });

  // ── findFamilyById ─────────────────────────────────────────────────────────

  describe('findFamilyById', () => {
    it('should return family view when found', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([mockFamilyRow]);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.findFamilyById('fam-123');

      expect(result).not.toBeNull();
      expect(result?.familyId).toBe('fam-123');
      expect(result?.familyRevokedAt).toBeNull();
    });

    it('should return null when family not found', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createRefreshTokenRepository(mockDb);
      const result = await repo.findFamilyById('nonexistent-family');

      expect(result).toBeNull();
    });

    it('should filter by family_id', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.findFamilyById('fam-999');

      const [sql, values] = vi.mocked(mockDb.raw).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('family_id');
      expect(values).toContain('fam-999');
    });
  });

  // ── revokeFamily ───────────────────────────────────────────────────────────

  describe('revokeFamily', () => {
    it('should revoke all tokens in a family and return count', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createRefreshTokenRepository(mockDb);
      const count = await repo.revokeFamily('fam-123', 'reuse_detected');

      expect(count).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return 0 when family not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createRefreshTokenRepository(mockDb);
      const count = await repo.revokeFamily('ghost-family', 'logout');

      expect(count).toBe(0);
    });

    it('should set family_revoked_at and family_revoke_reason', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.revokeFamily('fam-123', 'logout');

      const callArg = vi.mocked(mockDb.execute).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('family_revoked_at');
      expect(callArg?.text).toContain('family_revoke_reason');
    });

    it('should filter UPDATE by family_id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createRefreshTokenRepository(mockDb);
      await repo.revokeFamily('fam-456', 'admin_revoke');

      const callArg = vi.mocked(mockDb.execute).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('fam-456');
    });
  });
});
