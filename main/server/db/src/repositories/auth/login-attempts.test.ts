// main/server/db/src/repositories/auth/login-attempts.test.ts
/**
 * Tests for Login Attempts Repository
 *
 * Validates login attempt tracking operations including creation,
 * email-based lookups, and IP-based counting for rate limiting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createLoginAttemptRepository } from './login-attempts';

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

const mockLoginAttempt = {
  id: 'la-123',
  email: 'test@example.com',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  success: false,
  failure_reason: 'invalid_password',
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createLoginAttemptRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new login attempt successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLoginAttempt);

      const repo = createLoginAttemptRepository(mockDb);
      const result = await repo.create({
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: false,
        failureReason: 'invalid_password',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('invalid_password');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLoginAttemptRepository(mockDb);

      await expect(
        repo.create({
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: false,
          failureReason: 'invalid_password',
        }),
      ).rejects.toThrow('Failed to create login attempt');
    });
  });

  describe('findRecentByEmail', () => {
    it('should return recent login attempts for an email', async () => {
      const mockAttempts = [
        mockLoginAttempt,
        {
          ...mockLoginAttempt,
          id: 'la-456',
          created_at: new Date('2024-01-01T10:05:00Z'),
        },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mockAttempts);

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.findRecentByEmail('test@example.com', since);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test@example.com');
      expect(result[0].ipAddress).toBe('192.168.1.1');
      expect(result[0].failureReason).toBe('invalid_password');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no recent attempts found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.findRecentByEmail('test@example.com', since);

      expect(result).toEqual([]);
    });

    it('should filter by email and created_at', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      await repo.findRecentByEmail('test@example.com', since);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/email.*created_at/s),
        }),
      );
    });
  });

  describe('countRecentByIp', () => {
    it('should return count of recent attempts from IP', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 5 });

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByIp('192.168.1.1', since);

      expect(result).toBe(5);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('COUNT'),
        }),
      );
    });

    it('should return zero when no recent attempts from IP', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByIp('192.168.1.1', since);

      expect(result).toBe(0);
    });

    it('should return zero when queryOne returns null', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      const result = await repo.countRecentByIp('192.168.1.1', since);

      expect(result).toBe(0);
    });

    it('should filter by ip_address and created_at', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: 0 });

      const repo = createLoginAttemptRepository(mockDb);
      const since = new Date('2024-01-01T00:00:00Z');
      await repo.countRecentByIp('192.168.1.1', since);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ip_address.*created_at/s),
        }),
      );
    });
  });
});
