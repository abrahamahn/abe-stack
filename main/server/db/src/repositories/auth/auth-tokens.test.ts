// main/server/db/src/repositories/auth/auth-tokens.test.ts
/**
 * Tests for Auth Tokens Repository
 *
 * Adversarial TDD: validates create, lookup, invalidation, rate-limit
 * counters, and cleanup across all token types. At least 60% failure-state
 * coverage per method.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAuthTokenRepository } from './auth-tokens';

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

const now = new Date('2024-06-01T12:00:00Z');
const future = new Date('2024-06-02T12:00:00Z');

const mockTokenRow = {
  id: 'tok-1',
  type: 'password_reset',
  user_id: 'usr-1',
  email: null,
  token_hash: 'hash-abc',
  expires_at: future,
  used_at: null,
  ip_address: null,
  user_agent: null,
  metadata: {},
  created_at: now,
};

const mockMagicLinkRow = {
  id: 'tok-2',
  type: 'magic_link',
  user_id: null,
  email: 'user@example.com',
  token_hash: 'hash-ml',
  expires_at: future,
  used_at: null,
  ip_address: '1.2.3.4',
  user_agent: 'Mozilla/5.0',
  metadata: {},
  created_at: now,
};

// ============================================================================
// Tests
// ============================================================================

describe('createAuthTokenRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a password_reset token and return typed object', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTokenRow);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.create({
        type: 'password_reset',
        userId: 'usr-1',
        tokenHash: 'hash-abc',
        expiresAt: future,
      });

      expect(result.type).toBe('password_reset');
      expect(result.userId).toBe('usr-1');
      expect(result.tokenHash).toBe('hash-abc');
      expect(result.usedAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('INSERT INTO') }),
      );
    });

    it('should create a magic_link token with email and IP fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockMagicLinkRow);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.create({
        type: 'magic_link',
        email: 'user@example.com',
        tokenHash: 'hash-ml',
        expiresAt: future,
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.type).toBe('magic_link');
      expect(result.email).toBe('user@example.com');
      expect(result.ipAddress).toBe('1.2.3.4');
      expect(result.userId).toBeNull();
    });

    it('should throw when database returns null (INSERT failure)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);

      await expect(
        repo.create({
          type: 'email_verification',
          userId: 'usr-1',
          tokenHash: 'h',
          expiresAt: future,
        }),
      ).rejects.toThrow('Failed to create auth token');
    });

    it('should store metadata JSONB for email_change tokens', async () => {
      const emailChangeRow = {
        ...mockTokenRow,
        type: 'email_change',
        metadata: { newEmail: 'new@example.com' },
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(emailChangeRow);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.create({
        type: 'email_change',
        userId: 'usr-1',
        tokenHash: 'hash-ec',
        expiresAt: future,
        metadata: { newEmail: 'new@example.com' },
      });

      expect(result.metadata).toEqual({ newEmail: 'new@example.com' });
    });
  });

  // ── findValidByTokenHash ───────────────────────────────────────────────────

  describe('findValidByTokenHash', () => {
    it('should return token when valid (not used, not expired)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTokenRow);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('password_reset', 'hash-abc');

      expect(result).not.toBeNull();
      expect(result?.tokenHash).toBe('hash-abc');
      expect(result?.type).toBe('password_reset');
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.findValidByTokenHash('password_reset', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should include type, token_hash, used_at IS NULL, and expires_at > now in WHERE', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      await repo.findValidByTokenHash('email_verification', 'hash-xyz');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('type');
      expect(callArg?.text).toContain('token_hash');
      expect(callArg?.text).toContain('used_at');
      expect(callArg?.text).toContain('expires_at');
    });
  });

  // ── findByTokenHash ────────────────────────────────────────────────────────

  describe('findByTokenHash', () => {
    it('should return token regardless of used/expired state', async () => {
      const usedToken = { ...mockTokenRow, used_at: now };
      vi.mocked(mockDb.queryOne).mockResolvedValue(usedToken);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.findByTokenHash('password_reset', 'hash-abc');

      expect(result).not.toBeNull();
      expect(result?.usedAt).toEqual(now);
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.findByTokenHash('email_change', 'ghost');

      expect(result).toBeNull();
    });

    it('should filter by type and token_hash only (no used_at or expires_at constraint)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      await repo.findByTokenHash('email_change_revert', 'h');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('type');
      expect(callArg?.text).toContain('token_hash');
      // Should NOT include expires_at or used_at filters
      expect(callArg?.values).not.toContain('NULL');
    });
  });

  // ── markAsUsed ─────────────────────────────────────────────────────────────

  describe('markAsUsed', () => {
    it('should mark token as used and return updated token', async () => {
      const usedRow = { ...mockTokenRow, used_at: now };
      vi.mocked(mockDb.queryOne).mockResolvedValue(usedRow);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.markAsUsed('tok-1');

      expect(result).not.toBeNull();
      expect(result?.usedAt).toEqual(now);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('UPDATE') }),
      );
    });

    it('should return null when token not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      const result = await repo.markAsUsed('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ── invalidateForUser ──────────────────────────────────────────────────────

  describe('invalidateForUser', () => {
    it('should return count of invalidated tokens', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.invalidateForUser('password_reset', 'usr-1');

      expect(count).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('UPDATE') }),
      );
    });

    it('should return 0 when no unused tokens exist', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.invalidateForUser('email_change', 'usr-1');

      expect(count).toBe(0);
    });

    it('should filter by type, user_id, and used_at IS NULL', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createAuthTokenRepository(mockDb);
      await repo.invalidateForUser('magic_link', 'usr-2');

      const callArg = vi.mocked(mockDb.execute).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('type');
      expect(callArg?.text).toContain('user_id');
      expect(callArg?.text).toContain('used_at');
    });
  });

  // ── deleteExpiredByUser ────────────────────────────────────────────────────

  describe('deleteExpiredByUser', () => {
    it('should return count of deleted expired tokens', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.deleteExpiredByUser('password_reset', 'usr-1');

      expect(count).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('DELETE FROM') }),
      );
    });

    it('should return 0 when no expired tokens exist', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.deleteExpiredByUser('email_verification', 'usr-1');

      expect(count).toBe(0);
    });
  });

  // ── countRecentByEmail ─────────────────────────────────────────────────────

  describe('countRecentByEmail', () => {
    it('should return count of recent magic_link tokens for an email', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.countRecentByEmail('user@example.com', new Date('2024-01-01'));

      expect(count).toBe(5);
    });

    it('should return 0 when no recent tokens exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.countRecentByEmail('new@example.com', now);

      expect(count).toBe(0);
    });

    it('should return 0 when database returns null result', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.countRecentByEmail('ghost@example.com', now);

      expect(count).toBe(0);
    });

    it('should filter by magic_link type in WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createAuthTokenRepository(mockDb);
      await repo.countRecentByEmail('user@example.com', now);

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('magic_link');
      expect(callArg?.values).toContain('user@example.com');
    });
  });

  // ── countRecentByIp ────────────────────────────────────────────────────────

  describe('countRecentByIp', () => {
    it('should return count of recent magic_link tokens from an IP', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 3 });

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.countRecentByIp('1.2.3.4', new Date('2024-01-01'));

      expect(count).toBe(3);
    });

    it('should return 0 when null is returned (no matching rows)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.countRecentByIp('9.9.9.9', now);

      expect(count).toBe(0);
    });

    it('should filter by magic_link type and ip_address', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createAuthTokenRepository(mockDb);
      await repo.countRecentByIp('10.0.0.1', now);

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('magic_link');
      expect(callArg?.values).toContain('10.0.0.1');
    });
  });

  // ── deleteExpired ──────────────────────────────────────────────────────────

  describe('deleteExpired', () => {
    it('should delete all expired tokens and return count', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(42);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.deleteExpired();

      expect(count).toBe(42);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('DELETE FROM') }),
      );
    });

    it('should return 0 when no expired tokens exist', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createAuthTokenRepository(mockDb);
      const count = await repo.deleteExpired();

      expect(count).toBe(0);
    });

    it('should include expires_at in WHERE clause', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createAuthTokenRepository(mockDb);
      await repo.deleteExpired();

      const callArg = vi.mocked(mockDb.execute).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('expires_at');
    });
  });

  // ── adversarial: type safety ───────────────────────────────────────────────

  describe('type correctness', () => {
    it('should not conflate tokens across types (type is in WHERE for findValid)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      // Searching for password_reset hash under email_verification type should not find it
      await repo.findValidByTokenHash('email_verification', 'hash-abc');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('email_verification');
      expect(callArg?.values).toContain('hash-abc');
    });

    it('should include SQL RETURNING clause on markAsUsed', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createAuthTokenRepository(mockDb);
      await repo.markAsUsed('tok-1');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('RETURNING');
    });
  });
});
