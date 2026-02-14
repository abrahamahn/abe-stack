// main/server/db/src/repositories/auth/refresh-token-families.test.ts
/**
 * Tests for Refresh Token Families Repository
 *
 * Validates token family operations including active family lookups,
 * creation, and revocation for reuse detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createRefreshTokenFamilyRepository } from './refresh-token-families';

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

const mockFamily = {
  id: 'fam-123',
  user_id: 'usr-123',
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  created_at: new Date('2024-01-01'),
  revoked_at: null,
  revoke_reason: null,
};

// ============================================================================
// Tests
// ============================================================================

describe('createRefreshTokenFamilyRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findActiveByUserId', () => {
    it('should return active families for a user', async () => {
      const mockFamilies = [
        mockFamily,
        {
          ...mockFamily,
          id: 'fam-456',
          ip_address: '192.168.1.1',
          user_agent: 'Chrome/120.0',
          created_at: new Date('2024-01-15'),
        },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mockFamilies);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[0].ipAddress).toBe('127.0.0.1');
      expect(result[0].revokedAt).toBeNull();
      expect(result[1].ipAddress).toBe('192.168.1.1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no active families found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result).toEqual([]);
    });

    it('should filter by user_id and null revoked_at', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      await repo.findActiveByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*revoked_at/s),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return family when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFamily);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.findById('fam-123');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.ipAddress).toBe('127.0.0.1');
      expect(result?.userAgent).toBe('Mozilla/5.0');
      expect(result?.revokedAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when family not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.findById('nonexistent-family');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new refresh token family successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFamily);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.ipAddress).toBe('127.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createRefreshTokenFamilyRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow('Failed to create refresh token family');
    });
  });

  describe('revoke', () => {
    it('should revoke a family successfully', async () => {
      const mockRevokedFamily = {
        ...mockFamily,
        revoked_at: new Date('2024-01-15'),
        revoke_reason: 'token_reuse_detected',
      };

      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRevokedFamily);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.revoke('fam-123', 'token_reuse_detected');

      expect(result).toBeDefined();
      expect(result?.revokedAt).toEqual(new Date('2024-01-15'));
      expect(result?.revokeReason).toBe('token_reuse_detected');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when family not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createRefreshTokenFamilyRepository(mockDb);
      const result = await repo.revoke('nonexistent-family', 'manual_revoke');

      expect(result).toBeNull();
    });
  });
});
