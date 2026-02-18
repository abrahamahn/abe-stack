// main/server/db/src/repositories/compliance/user-agreements.test.ts
/**
 * Tests for User Agreements Repository
 *
 * Validates user agreement operations including agreement recording,
 * user lookup, document associations, and append-only audit trail.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createUserAgreementRepository } from './user-agreements';

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
  withSession: vi.fn() as RawDb['withSession'],
});

// ============================================================================
// Test Data
// ============================================================================

const mockUserAgreement = {
  id: 'agreement-123',
  user_id: 'usr-123',
  document_id: 'doc-123',
  ip_address: '192.168.1.1',
  agreed_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createUserAgreementRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new user agreement', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserAgreement);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
        ipAddress: '192.168.1.1',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.documentId).toBe('doc-123');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserAgreementRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          documentId: 'doc-123',
          ipAddress: '192.168.1.1',
        }),
      ).rejects.toThrow('Failed to create user agreement');
    });

    it('should handle optional IP address', async () => {
      const agreementWithoutIp = {
        ...mockUserAgreement,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(agreementWithoutIp);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
      });

      expect(result.ipAddress).toBeNull();
    });

    it('should handle agreement without IP address', async () => {
      const agreementWithoutIpOrAgent = {
        ...mockUserAgreement,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(agreementWithoutIpOrAgent);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
      });

      expect(result.ipAddress).toBeNull();
    });

    it('should record timestamp automatically', async () => {
      const agreementWithTimestamp = {
        ...mockUserAgreement,
        agreed_at: new Date('2024-01-15T10:30:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(agreementWithTimestamp);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
      });

      expect(result.agreedAt).toEqual(new Date('2024-01-15T10:30:00Z'));
    });

    it('should be append-only (no update method)', () => {
      const repo = createUserAgreementRepository(mockDb);

      expect(repo).not.toHaveProperty('update');
      expect(repo).not.toHaveProperty('delete');
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Agreement = {
        ...mockUserAgreement,
        ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(ipv6Agreement);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      });

      expect(result.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('findByUserId', () => {
    it('should return array of agreements for user, most recent first', async () => {
      const agreements = [
        { ...mockUserAgreement, id: 'agreement-456', agreed_at: new Date('2024-02-01') },
        { ...mockUserAgreement, id: 'agreement-123', agreed_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(agreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.agreedAt.getTime() ?? 0).toBeGreaterThan(result[1]?.agreedAt.getTime() ?? 0);
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[1]?.userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no agreements', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should handle multiple agreements to different documents', async () => {
      const multipleAgreements = [
        { ...mockUserAgreement, id: 'agreement-1', document_id: 'doc-tos' },
        { ...mockUserAgreement, id: 'agreement-2', document_id: 'doc-privacy' },
        { ...mockUserAgreement, id: 'agreement-3', document_id: 'doc-cookies' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multipleAgreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.map((a) => a.documentId)).toEqual(['doc-tos', 'doc-privacy', 'doc-cookies']);
    });

    it('should include agreement metadata', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUserAgreement]);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result[0]?.ipAddress).toBe('192.168.1.1');
    });

    it('should order by agreed_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUserAgreement]);

      const repo = createUserAgreementRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });
  });

  describe('findByUserAndDocument', () => {
    it('should return agreement when user has agreed to document', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserAgreement);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserAndDocument('usr-123', 'doc-123');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.documentId).toBe('doc-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return null when user has not agreed to document', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserAndDocument('usr-123', 'doc-not-agreed');

      expect(result).toBeNull();
    });

    it('should match exact user and document IDs', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserAgreement);

      const repo = createUserAgreementRepository(mockDb);
      const userId = 'usr-specific';
      const documentId = 'doc-specific';
      await repo.findByUserAndDocument(userId, documentId);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([userId, documentId]),
        }),
      );
    });

    it('should handle different users for same document', async () => {
      const user1Agreement = mockUserAgreement;
      const user2Agreement = { ...mockUserAgreement, id: 'agreement-456', user_id: 'usr-456' };

      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(user1Agreement);
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(user2Agreement);

      const repo = createUserAgreementRepository(mockDb);
      const result1 = await repo.findByUserAndDocument('usr-123', 'doc-123');
      const result2 = await repo.findByUserAndDocument('usr-456', 'doc-123');

      expect(result1?.userId).toBe('usr-123');
      expect(result2?.userId).toBe('usr-456');
      expect(result1?.documentId).toBe('doc-123');
      expect(result2?.documentId).toBe('doc-123');
    });

    it('should include complete agreement details', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserAgreement);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserAndDocument('usr-123', 'doc-123');

      expect(result?.id).toBe('agreement-123');
      expect(result?.ipAddress).toBe('192.168.1.1');
      expect(result?.agreedAt).toEqual(new Date('2024-01-01'));
    });
  });

  describe('findByDocumentId', () => {
    it('should return array of all users who agreed to document', async () => {
      const agreements = [
        { ...mockUserAgreement, id: 'agreement-1', user_id: 'usr-1' },
        { ...mockUserAgreement, id: 'agreement-2', user_id: 'usr-2' },
        { ...mockUserAgreement, id: 'agreement-3', user_id: 'usr-3' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(agreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByDocumentId('doc-123');

      expect(result).toHaveLength(3);
      expect(result.every((a) => a.documentId === 'doc-123')).toBe(true);
      expect(result.map((a) => a.userId)).toEqual(['usr-1', 'usr-2', 'usr-3']);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('document_id'),
        }),
      );
    });

    it('should return empty array when no users have agreed', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByDocumentId('doc-no-agreements');

      expect(result).toEqual([]);
    });

    it('should order by agreed_at descending', async () => {
      const agreements = [
        { ...mockUserAgreement, id: 'agreement-3', agreed_at: new Date('2024-03-01') },
        { ...mockUserAgreement, id: 'agreement-2', agreed_at: new Date('2024-02-01') },
        { ...mockUserAgreement, id: 'agreement-1', agreed_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(agreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByDocumentId('doc-123');

      expect(result[0]?.agreedAt.getTime() ?? 0).toBeGreaterThan(result[1]?.agreedAt.getTime() ?? 0);
      expect(result[1]?.agreedAt.getTime() ?? 0).toBeGreaterThan(result[2]?.agreedAt.getTime() ?? 0);
    });

    it('should handle single user agreement', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockUserAgreement]);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByDocumentId('doc-123');

      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe('usr-123');
    });

    it('should handle many agreements efficiently', async () => {
      const manyAgreements = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUserAgreement,
        id: `agreement-${String(i)}`,
        user_id: `usr-${String(i)}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(manyAgreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByDocumentId('doc-popular');

      expect(result).toHaveLength(1000);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle null IP address', async () => {
      const minimalAgreement = {
        ...mockUserAgreement,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalAgreement);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        documentId: 'doc-123',
      });

      expect(result.ipAddress).toBeNull();
    });

    it('should handle agreements from different time zones', async () => {
      const timestamps = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T12:00:00-05:00'),
        new Date('2024-01-01T23:59:59+08:00'),
      ];

      for (const timestamp of timestamps) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockUserAgreement,
          agreed_at: timestamp,
        });

        const repo = createUserAgreementRepository(mockDb);
        const result = await repo.findByUserAndDocument('usr-123', 'doc-123');

        expect(result?.agreedAt).toEqual(timestamp);
      }
    });

    it('should handle various IP address formats', async () => {
      const ipAddresses = [
        '127.0.0.1',
        '192.168.1.1',
        '10.0.0.1',
        '2001:0db8:85a3::8a2e:0370:7334',
        '::1',
      ];

      for (const ipAddress of ipAddresses) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockUserAgreement,
          ip_address: ipAddress,
        });

        const repo = createUserAgreementRepository(mockDb);
        const result = await repo.create({
          userId: 'usr-123',
          documentId: 'doc-123',
          ipAddress,
        });

        expect(result.ipAddress).toBe(ipAddress);
      }
    });

    it('should handle concurrent agreements to different documents', async () => {
      const agreement1 = { ...mockUserAgreement, document_id: 'doc-tos' };
      const agreement2 = { ...mockUserAgreement, document_id: 'doc-privacy' };

      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(agreement1);
      vi.mocked(mockDb.queryOne).mockResolvedValueOnce(agreement2);

      const repo = createUserAgreementRepository(mockDb);
      const [result1, result2] = await Promise.all([
        repo.create({
          userId: 'usr-123',
          documentId: 'doc-tos',
        }),
        repo.create({
          userId: 'usr-123',
          documentId: 'doc-privacy',
        }),
      ]);

      expect(result1.documentId).toBe('doc-tos');
      expect(result2.documentId).toBe('doc-privacy');
    });

    it('should handle agreements with same timestamp', async () => {
      const sameTimestamp = new Date('2024-01-01T12:00:00Z');
      const agreements = [
        { ...mockUserAgreement, id: 'agreement-1', agreed_at: sameTimestamp },
        { ...mockUserAgreement, id: 'agreement-2', agreed_at: sameTimestamp },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(agreements);

      const repo = createUserAgreementRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.agreedAt).toEqual(result[1]?.agreedAt);
    });

    it('should verify append-only nature by checking no modification methods', () => {
      const repo = createUserAgreementRepository(mockDb);

      expect(repo).toHaveProperty('create');
      expect(repo).toHaveProperty('findByUserId');
      expect(repo).toHaveProperty('findByUserAndDocument');
      expect(repo).toHaveProperty('findByDocumentId');
      expect(repo).not.toHaveProperty('update');
      expect(repo).not.toHaveProperty('delete');
      expect(repo).not.toHaveProperty('remove');
    });
  });
});
