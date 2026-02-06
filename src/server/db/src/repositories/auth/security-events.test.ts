// backend/db/src/repositories/auth/security-events.test.ts
/**
 * Tests for Security Events Repository
 *
 * Validates security event operations including creation,
 * user-specific lookups, and recent event queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createSecurityEventRepository } from './security-events';

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

const mockEvent = {
  id: 'se-123',
  user_id: 'usr-123',
  email: 'test@example.com',
  event_type: 'login_success',
  severity: 'low',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  metadata: null,
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createSecurityEventRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new security event successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockEvent);

      const repo = createSecurityEventRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        email: 'test@example.com',
        eventType: 'login_success',
        severity: 'low',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: null,
      });

      expect(result.userId).toBe('usr-123');
      expect(result.email).toBe('test@example.com');
      expect(result.eventType).toBe('login_success');
      expect(result.severity).toBe('low');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.metadata).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createSecurityEventRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          email: 'test@example.com',
          eventType: 'login_success',
          severity: 'low',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: null,
        }),
      ).rejects.toThrow('Failed to create security event');
    });
  });

  describe('findByUserId', () => {
    it('should return security events for a user', async () => {
      const mockEvents = [
        mockEvent,
        {
          ...mockEvent,
          id: 'se-456',
          event_type: 'password_changed',
          severity: 'medium',
          created_at: new Date('2024-01-15'),
        },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mockEvents);

      const repo = createSecurityEventRepository(mockDb);
      const result = await repo.findByUserId('usr-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[0].eventType).toBe('login_success');
      expect(result[1].eventType).toBe('password_changed');
      expect(result[1].severity).toBe('medium');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no events found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toEqual([]);
    });

    it('should filter by user_id', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should use default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });
  });

  describe('findRecent', () => {
    it('should return recent security events', async () => {
      const mockEvents = [
        mockEvent,
        {
          ...mockEvent,
          id: 'se-456',
          user_id: 'usr-456',
          email: 'other@example.com',
          event_type: 'login_failed',
          severity: 'medium',
          ip_address: '192.168.1.2',
          user_agent: 'Chrome/120.0',
          created_at: new Date('2024-01-01T10:05:00Z'),
        },
      ];

      vi.mocked(mockDb.query).mockResolvedValue(mockEvents);

      const repo = createSecurityEventRepository(mockDb);
      const result = await repo.findRecent(10);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('usr-123');
      expect(result[0].eventType).toBe('login_success');
      expect(result[1].userId).toBe('usr-456');
      expect(result[1].eventType).toBe('login_failed');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no recent events found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      const result = await repo.findRecent();

      expect(result).toEqual([]);
    });

    it('should use default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createSecurityEventRepository(mockDb);
      await repo.findRecent();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });
  });
});
