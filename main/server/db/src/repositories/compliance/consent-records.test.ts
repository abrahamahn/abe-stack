// main/server/db/src/repositories/compliance/consent-records.test.ts
/**
 * Tests for Consent Records Repository
 *
 * Adversarial TDD: validates both legal_document and consent_preference
 * paths, including failure states and discriminator correctness.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createConsentRecordRepository } from './consent-records';

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

const mockAgreementRow = {
  id: 'cr-1',
  user_id: 'usr-1',
  record_type: 'legal_document',
  document_id: 'doc-1',
  consent_type: null,
  granted: null,
  ip_address: '10.0.0.1',
  user_agent: 'Mozilla/5.0',
  metadata: {},
  created_at: now,
};

const mockConsentRow = {
  id: 'cr-2',
  user_id: 'usr-1',
  record_type: 'consent_preference',
  document_id: null,
  consent_type: 'marketing',
  granted: true,
  ip_address: null,
  user_agent: null,
  metadata: {},
  created_at: now,
};

// ============================================================================
// Tests
// ============================================================================

describe('createConsentRecordRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ── recordAgreement ────────────────────────────────────────────────────────

  describe('recordAgreement', () => {
    it('should insert with record_type = legal_document and return typed record', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAgreementRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.recordAgreement({
        userId: 'usr-1',
        documentId: 'doc-1',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.recordType).toBe('legal_document');
      expect(result.documentId).toBe('doc-1');
      expect(result.consentType).toBeNull();
      expect(result.granted).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('INSERT INTO') }),
      );
    });

    it('should throw when database returns null (INSERT failure)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);

      await expect(repo.recordAgreement({ userId: 'usr-1', documentId: 'doc-1' })).rejects.toThrow(
        'Failed to record user agreement',
      );
    });

    it('should persist ipAddress and userAgent context', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAgreementRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.recordAgreement({
        userId: 'usr-1',
        documentId: 'doc-1',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.ipAddress).toBe('10.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should work without optional ipAddress / userAgent', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockAgreementRow,
        ip_address: null,
        user_agent: null,
      });

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.recordAgreement({ userId: 'usr-1', documentId: 'doc-1' });

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });
  });

  // ── findAgreementsByUserId ─────────────────────────────────────────────────

  describe('findAgreementsByUserId', () => {
    it('should return array of legal_document records for the user', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockAgreementRow]);

      const repo = createConsentRecordRepository(mockDb);
      const results = await repo.findAgreementsByUserId('usr-1');

      expect(results).toHaveLength(1);
      expect(results[0]?.recordType).toBe('legal_document');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('SELECT') }),
      );
    });

    it('should return empty array when no agreements exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      const results = await repo.findAgreementsByUserId('usr-new');

      expect(results).toEqual([]);
    });

    it('should filter by record_type = legal_document', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findAgreementsByUserId('usr-1');

      const callArg = vi.mocked(mockDb.query).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('legal_document');
    });
  });

  // ── findAgreementByUserAndDocument ─────────────────────────────────────────

  describe('findAgreementByUserAndDocument', () => {
    it('should return matching record when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockAgreementRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.findAgreementByUserAndDocument('usr-1', 'doc-1');

      expect(result).not.toBeNull();
      expect(result?.documentId).toBe('doc-1');
    });

    it('should return null when user has not agreed to the document', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.findAgreementByUserAndDocument('usr-1', 'doc-99');

      expect(result).toBeNull();
    });

    it('should filter by user_id, record_type, and document_id', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findAgreementByUserAndDocument('usr-1', 'doc-1');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('usr-1');
      expect(callArg?.values).toContain('legal_document');
      expect(callArg?.values).toContain('doc-1');
    });
  });

  // ── recordConsent ──────────────────────────────────────────────────────────

  describe('recordConsent', () => {
    it('should insert with record_type = consent_preference and return typed record', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockConsentRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.recordConsent({
        userId: 'usr-1',
        consentType: 'marketing',
        granted: true,
      });

      expect(result.recordType).toBe('consent_preference');
      expect(result.consentType).toBe('marketing');
      expect(result.granted).toBe(true);
      expect(result.documentId).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.stringContaining('INSERT INTO') }),
      );
    });

    it('should record a revocation (granted = false)', async () => {
      const revocationRow = { ...mockConsentRow, granted: false };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revocationRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.recordConsent({
        userId: 'usr-1',
        consentType: 'analytics',
        granted: false,
      });

      expect(result.granted).toBe(false);
    });

    it('should throw when database returns null (INSERT failure)', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);

      await expect(
        repo.recordConsent({ userId: 'usr-1', consentType: 'marketing', granted: true }),
      ).rejects.toThrow('Failed to record consent preference');
    });
  });

  // ── findConsentsByUserId ───────────────────────────────────────────────────

  describe('findConsentsByUserId', () => {
    it('should return all consent_preference records for the user', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockConsentRow]);

      const repo = createConsentRecordRepository(mockDb);
      const results = await repo.findConsentsByUserId('usr-1');

      expect(results).toHaveLength(1);
      expect(results[0]?.recordType).toBe('consent_preference');
    });

    it('should return empty array when user has no consent records', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      const results = await repo.findConsentsByUserId('usr-ghost');

      expect(results).toEqual([]);
    });

    it('should filter by record_type = consent_preference', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findConsentsByUserId('usr-1');

      const callArg = vi.mocked(mockDb.query).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('consent_preference');
    });
  });

  // ── findLatestConsentByUserAndType ─────────────────────────────────────────

  describe('findLatestConsentByUserAndType', () => {
    it('should return the latest consent record for a given type', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockConsentRow);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.findLatestConsentByUserAndType('usr-1', 'marketing');

      expect(result).not.toBeNull();
      expect(result?.consentType).toBe('marketing');
      expect(result?.granted).toBe(true);
    });

    it('should return null when no consent exists for that type', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);
      const result = await repo.findLatestConsentByUserAndType('usr-1', 'unknown-type');

      expect(result).toBeNull();
    });

    it('should filter by user_id, record_type, and consent_type', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findLatestConsentByUserAndType('usr-1', 'analytics');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('usr-1');
      expect(callArg?.values).toContain('consent_preference');
      expect(callArg?.values).toContain('analytics');
    });

    it('should use LIMIT 1 for efficiency', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findLatestConsentByUserAndType('usr-1', 'marketing');

      const callArg = vi.mocked(mockDb.queryOne).mock.calls[0]?.[0];
      expect(callArg?.text).toContain('LIMIT 1');
    });
  });

  // ── adversarial: discriminator isolation ───────────────────────────────────

  describe('record type isolation', () => {
    it('findAgreementsByUserId should not return consent_preference rows', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findAgreementsByUserId('usr-1');

      const callArg = vi.mocked(mockDb.query).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('legal_document');
      expect(callArg?.values).not.toContain('consent_preference');
    });

    it('findConsentsByUserId should not return legal_document rows', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createConsentRecordRepository(mockDb);
      await repo.findConsentsByUserId('usr-1');

      const callArg = vi.mocked(mockDb.query).mock.calls[0]?.[0];
      expect(callArg?.values).toContain('consent_preference');
      expect(callArg?.values).not.toContain('legal_document');
    });
  });
});
