// src/server/db/src/repositories/magic-link/magic-link-tokens.test.ts
/**
 * Tests for Magic Link Tokens Repository
 *
 * Validates magic link token operations including rate limiting checks,
 * token creation, expiration cleanup, and validation lookups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMagicLinkTokenRepository } from './magic-link-tokens';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockMagicLinkToken = {
  id: 'ml-123',
  email: 'test@example.com',
  token_hash: 'sha256hash',
  expires_at: new Date('2024-02-01'),
  used_at: null,
  created_at: new Date('2024-01-01'),
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
};

// ============================================================================
// Tests
// ============================================================================

describe('createMagicLinkTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('countRecentByEmail', () => {
    it('should return count of recent tokens for email', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 3 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByEmail('test@example.com', since);

      expect(result).toBe(3);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('email'),
        }),
      );
    });

    it('should return zero when no recent tokens exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByEmail('new@example.com', since);

      expect(result).toBe(0);
    });

    it('should filter by time window', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 1 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      await repo.countRecentByEmail('test@example.com', since);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('created_at'),
        }),
      );
    });
  });

  describe('countRecentByIp', () => {
    it('should return count of recent tokens for IP', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByIp('192.168.1.1', since);

      expect(result).toBe(5);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ip_address'),
        }),
      );
    });

    it('should return zero when no recent tokens exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByIp('10.0.0.1', since);

      expect(result).toBe(0);
    });

    it('should filter by time window', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 2 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      await repo.countRecentByIp('192.168.1.1', since);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('created_at'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should insert and return new magic link token', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMagicLinkToken);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.create({
        email: 'test@example.com',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.tokenHash).toBe('sha256hash');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMagicLinkTokenRepository(mockDb);

      await expect(
        repo.create({
          email: 'test@example.com',
          tokenHash: 'sha256hash',
          expiresAt: new Date('2024-02-01'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      ).rejects.toThrow('Failed to create magic link token');
    });

    it('should handle optional user agent', async () => {
      const tokenWithoutUserAgent = {
        ...mockMagicLinkToken,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tokenWithoutUserAgent);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.create({
        email: 'test@example.com',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
        ipAddress: '192.168.1.1',
      });

      expect(result.userAgent).toBeNull();
    });
  });

  describe('deleteExpired', () => {
    it('should return count of deleted expired tokens', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createMagicLinkTokenRepository(mockDb);
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

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.deleteExpired();

      expect(result).toBe(0);
    });

    it('should filter by expires_at timestamp', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createMagicLinkTokenRepository(mockDb);
      await repo.deleteExpired();

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('expires_at'),
        }),
      );
    });
  });

  describe('findValidByTokenHash', () => {
    it('should return token when found and valid', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMagicLinkToken);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('sha256hash');

      expect(result).toBeDefined();
      expect(result?.tokenHash).toBe('sha256hash');
      expect(result?.email).toBe('test@example.com');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('token_hash'),
        }),
      );
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('nonexistent');

      expect(result).toBeNull();
    });

    it('should filter by expiration and used status', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMagicLinkToken);

      const repo = createMagicLinkTokenRepository(mockDb);
      await repo.findValidByTokenHash('sha256hash');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/expires_at.*used_at/s),
        }),
      );
    });

    it('should not return used tokens', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('used-token-hash');

      expect(result).toBeNull();
    });

    it('should not return expired tokens', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('expired-token-hash');

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle tokens with null IP address', async () => {
      const tokenWithoutIp = {
        ...mockMagicLinkToken,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tokenWithoutIp);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('sha256hash');

      expect(result?.ipAddress).toBeNull();
    });

    it('should handle different time windows for rate limiting', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 10 });

      const repo = createMagicLinkTokenRepository(mockDb);
      const shortWindow = new Date('2024-01-01T23:00:00Z');
      const longWindow = new Date('2024-01-01T00:00:00Z');
      const result1 = await repo.countRecentByEmail('test@example.com', shortWindow);
      const result2 = await repo.countRecentByEmail('test@example.com', longWindow);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(mockDb.queryOne).toHaveBeenCalledTimes(2);
    });

    it('should handle very long user agent strings', async () => {
      const longUserAgent = 'A'.repeat(500);
      const tokenWithLongUserAgent = {
        ...mockMagicLinkToken,
        user_agent: longUserAgent,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tokenWithLongUserAgent);

      const repo = createMagicLinkTokenRepository(mockDb);
      const result = await repo.create({
        email: 'test@example.com',
        tokenHash: 'sha256hash',
        expiresAt: new Date('2024-02-01'),
        ipAddress: '192.168.1.1',
        userAgent: longUserAgent,
      });

      expect(result.userAgent).toBe(longUserAgent);
    });
  });
});
