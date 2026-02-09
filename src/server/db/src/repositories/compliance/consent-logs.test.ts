// src/server/db/src/repositories/compliance/consent-logs.test.ts
/**
 * Tests for Consent Logs Repository
 *
 * Validates consent log operations including consent recording,
 * user consent history, type-based filtering, and GDPR audit trail.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createConsentLogRepository } from './consent-logs';

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

const mockConsentLog = {
  id: 'consent-123',
  user_id: 'usr-123',
  consent_type: 'marketing',
  granted: true,
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createConsentLogRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new consent log', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockConsentLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.consentType).toBe('marketing');
      expect(result.granted).toBe(true);
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentLogRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          consentType: 'marketing',
          granted: true,
        }),
      ).rejects.toThrow('Failed to create consent log');
    });

    it('should handle consent grant (true)', async () => {
      const grantLog = { ...mockConsentLog, granted: true };
      vi.mocked(mockDb.queryOne).mockResolvedValue(grantLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
      });

      expect(result.granted).toBe(true);
    });

    it('should handle consent revocation (false)', async () => {
      const revokeLog = { ...mockConsentLog, granted: false };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokeLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: false,
      });

      expect(result.granted).toBe(false);
    });

    it('should handle optional IP address', async () => {
      const logWithoutIp = { ...mockConsentLog, ip_address: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(logWithoutIp);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
      });

      expect(result.ipAddress).toBeNull();
    });

    it('should handle optional user agent', async () => {
      const logWithoutUserAgent = { ...mockConsentLog, user_agent: null };
      vi.mocked(mockDb.queryOne).mockResolvedValue(logWithoutUserAgent);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
        ipAddress: '192.168.1.1',
      });

      expect(result.userAgent).toBeNull();
    });

    it('should record timestamp automatically', async () => {
      const logWithTimestamp = {
        ...mockConsentLog,
        created_at: new Date('2024-01-15T10:30:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(logWithTimestamp);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
      });

      expect(result.createdAt).toEqual(new Date('2024-01-15T10:30:00Z'));
    });

    it('should be append-only (no update method)', () => {
      const repo = createConsentLogRepository(mockDb);

      expect(repo).not.toHaveProperty('update');
      expect(repo).not.toHaveProperty('delete');
    });

    it('should handle various consent types', async () => {
      const types = ['marketing', 'analytics', 'cookies', 'personalization', 'third_party'];

      for (const type of types) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockConsentLog,
          consent_type: type,
        });

        const repo = createConsentLogRepository(mockDb);
        const result = await repo.create({
          userId: 'usr-123',
          consentType: type,
          granted: true,
        });

        expect(result.consentType).toBe(type);
      }
    });
  });

  describe('findByUserId', () => {
    it('should return array of consent logs for user, most recent first', async () => {
      const logs = [
        { ...mockConsentLog, id: 'consent-456', created_at: new Date('2024-02-01') },
        { ...mockConsentLog, id: 'consent-123', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(logs);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
      expect(result[0].userId).toBe('usr-123');
      expect(result[1].userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no consent logs', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should include all consent types', async () => {
      const multiTypeLog = [
        { ...mockConsentLog, id: 'consent-1', consent_type: 'marketing' },
        { ...mockConsentLog, id: 'consent-2', consent_type: 'analytics' },
        { ...mockConsentLog, id: 'consent-3', consent_type: 'cookies' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multiTypeLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.map((log) => log.consentType)).toEqual(['marketing', 'analytics', 'cookies']);
    });

    it('should include both grants and revocations', async () => {
      const mixedLogs = [
        { ...mockConsentLog, id: 'consent-1', granted: true },
        { ...mockConsentLog, id: 'consent-2', granted: false },
        { ...mockConsentLog, id: 'consent-3', granted: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mixedLogs);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result.map((log) => log.granted)).toEqual([true, false, true]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockConsentLog]);

      const repo = createConsentLogRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });
  });

  describe('findByUserAndType', () => {
    it('should return consent logs for user and specific type', async () => {
      const logs = [
        { ...mockConsentLog, id: 'consent-3', created_at: new Date('2024-03-01'), granted: false },
        { ...mockConsentLog, id: 'consent-2', created_at: new Date('2024-02-01'), granted: true },
        { ...mockConsentLog, id: 'consent-1', created_at: new Date('2024-01-01'), granted: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(logs);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'marketing');

      expect(result).toHaveLength(3);
      expect(result.every((log) => log.consentType === 'marketing')).toBe(true);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime());
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when no logs for user and type', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should show consent history over time', async () => {
      const history = [
        { ...mockConsentLog, id: 'consent-4', created_at: new Date('2024-04-01'), granted: false },
        { ...mockConsentLog, id: 'consent-3', created_at: new Date('2024-03-01'), granted: true },
        { ...mockConsentLog, id: 'consent-2', created_at: new Date('2024-02-01'), granted: false },
        { ...mockConsentLog, id: 'consent-1', created_at: new Date('2024-01-01'), granted: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(history);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'marketing');

      expect(result).toHaveLength(4);
      expect(result.map((log) => log.granted)).toEqual([false, true, false, true]);
    });

    it('should match exact user and consent type', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockConsentLog]);

      const repo = createConsentLogRepository(mockDb);
      const userId = 'usr-specific';
      const consentType = 'analytics';
      await repo.findByUserAndType(userId, consentType);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([userId, consentType]),
        }),
      );
    });

    it('should handle different users for same consent type', async () => {
      const user1Logs = [mockConsentLog];
      const user2Logs = [{ ...mockConsentLog, id: 'consent-456', user_id: 'usr-456' }];

      vi.mocked(mockDb.query).mockResolvedValueOnce(user1Logs);
      vi.mocked(mockDb.query).mockResolvedValueOnce(user2Logs);

      const repo = createConsentLogRepository(mockDb);
      const result1 = await repo.findByUserAndType('usr-123', 'marketing');
      const result2 = await repo.findByUserAndType('usr-456', 'marketing');

      expect(result1[0].userId).toBe('usr-123');
      expect(result2[0].userId).toBe('usr-456');
    });
  });

  describe('findLatestByUserAndType', () => {
    it('should return most recent consent log for user and type', async () => {
      const latestLog = {
        ...mockConsentLog,
        id: 'consent-latest',
        created_at: new Date('2024-03-01'),
        granted: false,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(latestLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findLatestByUserAndType('usr-123', 'marketing');

      expect(result).toBeDefined();
      expect(result?.id).toBe('consent-latest');
      expect(result?.granted).toBe(false);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT 1'),
        }),
      );
    });

    it('should return null when no logs for user and type', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findLatestByUserAndType('usr-123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return current consent state', async () => {
      const currentConsent = {
        ...mockConsentLog,
        granted: true,
        created_at: new Date('2024-03-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(currentConsent);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findLatestByUserAndType('usr-123', 'marketing');

      expect(result?.granted).toBe(true);
    });

    it('should apply ORDER BY before LIMIT', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockConsentLog);

      const repo = createConsentLogRepository(mockDb);
      await repo.findLatestByUserAndType('usr-123', 'marketing');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*LIMIT/s),
        }),
      );
    });

    it('should handle toggled consent (latest state wins)', async () => {
      const revokedConsent = {
        ...mockConsentLog,
        granted: false,
        created_at: new Date('2024-03-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokedConsent);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findLatestByUserAndType('usr-123', 'marketing');

      expect(result?.granted).toBe(false);
    });

    it('should include complete log details', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockConsentLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findLatestByUserAndType('usr-123', 'marketing');

      expect(result?.id).toBe('consent-123');
      expect(result?.ipAddress).toBe('192.168.1.1');
      expect(result?.userAgent).toBe('Mozilla/5.0');
      expect(result?.createdAt).toEqual(new Date('2024-01-01'));
    });
  });

  describe('edge cases', () => {
    it('should handle null IP address and user agent', async () => {
      const minimalLog = {
        ...mockConsentLog,
        ip_address: null,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalLog);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
      });

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    it('should handle rapid consent toggles', async () => {
      const rapidToggles = [
        {
          ...mockConsentLog,
          id: 'consent-5',
          created_at: new Date('2024-01-01T12:00:05Z'),
          granted: false,
        },
        {
          ...mockConsentLog,
          id: 'consent-4',
          created_at: new Date('2024-01-01T12:00:04Z'),
          granted: true,
        },
        {
          ...mockConsentLog,
          id: 'consent-3',
          created_at: new Date('2024-01-01T12:00:03Z'),
          granted: false,
        },
        {
          ...mockConsentLog,
          id: 'consent-2',
          created_at: new Date('2024-01-01T12:00:02Z'),
          granted: true,
        },
        {
          ...mockConsentLog,
          id: 'consent-1',
          created_at: new Date('2024-01-01T12:00:01Z'),
          granted: false,
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(rapidToggles);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'marketing');

      expect(result).toHaveLength(5);
      expect(result[0].granted).toBe(false);
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Log = {
        ...mockConsentLog,
        ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(ipv6Log);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      });

      expect(result.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle long user agent strings', async () => {
      const longUserAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      const logWithLongUA = {
        ...mockConsentLog,
        user_agent: longUserAgent,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(logWithLongUA);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        consentType: 'marketing',
        granted: true,
        userAgent: longUserAgent,
      });

      expect(result.userAgent).toBe(longUserAgent);
    });

    it('should handle timestamps from different time zones', async () => {
      const timestamps = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T12:00:00-05:00'),
        new Date('2024-01-01T23:59:59+08:00'),
      ];

      for (const timestamp of timestamps) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockConsentLog,
          created_at: timestamp,
        });

        const repo = createConsentLogRepository(mockDb);
        const result = await repo.findLatestByUserAndType('usr-123', 'marketing');

        expect(result?.createdAt).toEqual(timestamp);
      }
    });

    it('should handle logs with identical timestamps', async () => {
      const sameTimestamp = new Date('2024-01-01T12:00:00Z');
      const logs = [
        { ...mockConsentLog, id: 'consent-1', created_at: sameTimestamp, granted: true },
        { ...mockConsentLog, id: 'consent-2', created_at: sameTimestamp, granted: false },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(logs);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'marketing');

      expect(result).toHaveLength(2);
      expect(result[0].createdAt).toEqual(result[1].createdAt);
    });

    it('should handle all GDPR-relevant consent types', async () => {
      const gdprTypes = [
        'marketing',
        'analytics',
        'cookies',
        'personalization',
        'third_party',
        'profiling',
        'automated_decision_making',
      ];

      for (const type of gdprTypes) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockConsentLog,
          consent_type: type,
        });

        const repo = createConsentLogRepository(mockDb);
        const result = await repo.findLatestByUserAndType('usr-123', type);

        expect(result?.consentType).toBe(type);
      }
    });

    it('should verify append-only nature by checking no modification methods', () => {
      const repo = createConsentLogRepository(mockDb);

      expect(repo).toHaveProperty('create');
      expect(repo).toHaveProperty('findByUserId');
      expect(repo).toHaveProperty('findByUserAndType');
      expect(repo).toHaveProperty('findLatestByUserAndType');
      expect(repo).not.toHaveProperty('update');
      expect(repo).not.toHaveProperty('delete');
      expect(repo).not.toHaveProperty('remove');
    });

    it('should handle consent audit trail completeness', async () => {
      const completeAuditTrail = [
        { ...mockConsentLog, id: 'consent-3', created_at: new Date('2024-03-01'), granted: false },
        { ...mockConsentLog, id: 'consent-2', created_at: new Date('2024-02-01'), granted: true },
        { ...mockConsentLog, id: 'consent-1', created_at: new Date('2024-01-01'), granted: true },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(completeAuditTrail);

      const repo = createConsentLogRepository(mockDb);
      const result = await repo.findByUserAndType('usr-123', 'marketing');

      expect(result).toHaveLength(3);
      result.forEach((log) => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('consentType');
        expect(log).toHaveProperty('granted');
        expect(log).toHaveProperty('createdAt');
      });
    });
  });
});
