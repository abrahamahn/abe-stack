// src/server/db/src/repositories/email/email-log.test.ts
/**
 * Tests for Email Log Repository
 *
 * Validates email log operations including creation,
 * user/recipient lookups, and recent entry queries.
 * Append-only — no update or delete tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEmailLogRepository } from './email-log';

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

const mockLogRow = {
  id: 'log-001',
  user_id: 'user-001',
  template_key: 'auth.welcome',
  recipient: 'test@example.com',
  subject: 'Welcome',
  status: 'sent',
  provider: 'smtp',
  provider_message_id: 'msg-abc',
  sent_at: new Date('2024-06-01T10:00:00Z'),
  delivered_at: null,
  bounced_at: null,
  error_message: null,
  metadata: {},
  created_at: new Date('2024-06-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createEmailLogRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a log entry when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLogRow);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findById('log-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('log-001');
      expect(result?.recipient).toBe('test@example.com');
      expect(result?.status).toBe('sent');
      expect(result?.provider).toBe('smtp');
      expect(result?.templateKey).toBe('auth.welcome');
      expect(result?.providerMessageId).toBe('msg-abc');
    });

    it('should return null when entry not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return log entries for a user', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockLogRow]);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findByUserId('user-001');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-001');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when no entries found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findByUserId('user-001');

      expect(result).toEqual([]);
    });
  });

  describe('findByRecipient', () => {
    it('should return log entries by recipient email', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockLogRow]);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findByRecipient('test@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].recipient).toBe('test@example.com');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('recipient'),
        }),
      );
    });
  });

  describe('findRecent', () => {
    it('should return recent log entries', async () => {
      const mockLogs = [
        mockLogRow,
        { ...mockLogRow, id: 'log-002', recipient: 'other@example.com' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockLogs);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findRecent(10);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no entries exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createEmailLogRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a log entry successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLogRow);

      const repo = createEmailLogRepository(mockDb);
      const result = await repo.create({
        recipient: 'test@example.com',
        subject: 'Welcome',
        provider: 'smtp',
      });

      expect(result.id).toBe('log-001');
      expect(result.recipient).toBe('test@example.com');
      expect(result.provider).toBe('smtp');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailLogRepository(mockDb);

      await expect(
        repo.create({
          recipient: 'test@example.com',
          subject: 'Welcome',
          provider: 'smtp',
        }),
      ).rejects.toThrow('Failed to create email log entry');
    });
  });
});
