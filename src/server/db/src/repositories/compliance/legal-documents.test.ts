// backend/db/src/repositories/compliance/legal-documents.test.ts
/**
 * Tests for Legal Documents Repository
 *
 * Validates legal document operations including document creation,
 * version tracking, type-based lookups, and latest version queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createLegalDocumentRepository } from './legal-documents';

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

const mockLegalDocument = {
  id: 'doc-123',
  type: 'terms_of_service',
  version: 1,
  title: 'Terms of Service',
  content: 'These are the terms...',
  effective_date: new Date('2024-01-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createLegalDocumentRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new legal document', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLegalDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 1,
        title: 'Terms of Service',
        content: 'These are the terms...',
        effectiveDate: new Date('2024-01-01'),
      });

      expect(result.type).toBe('terms_of_service');
      expect(result.version).toBe(1);
      expect(result.title).toBe('Terms of Service');
      expect(result.content).toBe('These are the terms...');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLegalDocumentRepository(mockDb);

      await expect(
        repo.create({
          type: 'terms_of_service',
          version: 1,
          title: 'Terms of Service',
          content: 'These are the terms...',
          effectiveDate: new Date('2024-01-01'),
        }),
      ).rejects.toThrow('Failed to create legal document');
    });

    it('should handle version increments', async () => {
      const versionTwoDocument = {
        ...mockLegalDocument,
        id: 'doc-456',
        version: 2,
        content: 'Updated terms...',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(versionTwoDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 2,
        title: 'Terms of Service',
        content: 'Updated terms...',
        effectiveDate: new Date('2024-02-01'),
      });

      expect(result.version).toBe(2);
      expect(result.content).toBe('Updated terms...');
    });

    it('should handle different document types', async () => {
      const privacyDocument = {
        ...mockLegalDocument,
        id: 'doc-789',
        type: 'privacy_policy',
        title: 'Privacy Policy',
        content: 'Privacy terms...',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(privacyDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy',
        content: 'Privacy terms...',
        effectiveDate: new Date('2024-01-01'),
      });

      expect(result.type).toBe('privacy_policy');
      expect(result.title).toBe('Privacy Policy');
    });

    it('should handle long content', async () => {
      const longContent = 'A'.repeat(10000);
      const documentWithLongContent = {
        ...mockLegalDocument,
        content: longContent,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(documentWithLongContent);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 1,
        title: 'Terms of Service',
        content: longContent,
        effectiveDate: new Date('2024-01-01'),
      });

      expect(result.content).toBe(longContent);
    });
  });

  describe('findById', () => {
    it('should return document when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLegalDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findById('doc-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('doc-123');
      expect(result?.type).toBe('terms_of_service');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findById('doc-nonexistent');

      expect(result).toBeNull();
    });

    it('should handle exact ID matching', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLegalDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const docId = 'doc-specific-123';
      await repo.findById(docId);

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([docId]),
        }),
      );
    });

    it('should return complete document with all fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLegalDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findById('doc-123');

      expect(result?.version).toBe(1);
      expect(result?.title).toBe('Terms of Service');
      expect(result?.content).toBe('These are the terms...');
      expect(result?.effectiveDate).toEqual(new Date('2024-01-01'));
    });
  });

  describe('findByType', () => {
    it('should return array of documents for type, newest version first', async () => {
      const documents = [
        { ...mockLegalDocument, id: 'doc-456', version: 3 },
        { ...mockLegalDocument, id: 'doc-123', version: 2 },
        mockLegalDocument,
      ];
      vi.mocked(mockDb.query).mockResolvedValue(documents);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findByType('terms_of_service');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ORDER BY'),
        }),
      );
    });

    it('should return empty array when no documents of type exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findByType('nonexistent_type');

      expect(result).toEqual([]);
    });

    it('should filter by exact type match', async () => {
      const termsDocuments = [
        mockLegalDocument,
        { ...mockLegalDocument, id: 'doc-456', version: 2 },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(termsDocuments);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findByType('terms_of_service');

      expect(result.every((doc) => doc.type === 'terms_of_service')).toBe(true);
    });

    it('should handle single version documents', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockLegalDocument]);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findByType('terms_of_service');

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(1);
    });

    it('should handle multiple versions with gaps', async () => {
      const documentsWithGaps = [
        { ...mockLegalDocument, id: 'doc-789', version: 5 },
        { ...mockLegalDocument, id: 'doc-456', version: 3 },
        mockLegalDocument,
      ];
      vi.mocked(mockDb.query).mockResolvedValue(documentsWithGaps);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findByType('terms_of_service');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(5);
      expect(result[2].version).toBe(1);
    });
  });

  describe('findLatestByType', () => {
    it('should return latest version of document type', async () => {
      const latestDocument = {
        ...mockLegalDocument,
        id: 'doc-456',
        version: 3,
        content: 'Latest version...',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(latestDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findLatestByType('terms_of_service');

      expect(result).toBeDefined();
      expect(result?.version).toBe(3);
      expect(result?.content).toBe('Latest version...');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT 1'),
        }),
      );
    });

    it('should return null when no documents of type exist', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findLatestByType('nonexistent_type');

      expect(result).toBeNull();
    });

    it('should apply ORDER BY before LIMIT', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockLegalDocument);

      const repo = createLegalDocumentRepository(mockDb);
      await repo.findLatestByType('terms_of_service');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*LIMIT/s),
        }),
      );
    });

    it('should handle different document types independently', async () => {
      const privacyDocument = {
        ...mockLegalDocument,
        id: 'doc-privacy-1',
        type: 'privacy_policy',
        version: 2,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(privacyDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findLatestByType('privacy_policy');

      expect(result?.type).toBe('privacy_policy');
      expect(result?.version).toBe(2);
    });
  });

  describe('findAllLatest', () => {
    it('should return latest version of each document type', async () => {
      const latestDocuments = [
        { ...mockLegalDocument, type: 'terms_of_service', version: 3 },
        { ...mockLegalDocument, id: 'doc-456', type: 'privacy_policy', version: 2 },
        { ...mockLegalDocument, id: 'doc-789', type: 'cookie_policy', version: 1 },
      ];
      vi.mocked(mockDb.raw).mockResolvedValue(latestDocuments);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findAllLatest();

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('terms_of_service');
      expect(result[0].version).toBe(3);
      expect(result[1].type).toBe('privacy_policy');
      expect(result[1].version).toBe(2);
      expect(mockDb.raw).toHaveBeenCalledWith(expect.stringContaining('DISTINCT ON'));
    });

    it('should return empty array when no documents exist', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([]);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findAllLatest();

      expect(result).toEqual([]);
    });

    it('should use raw query for DISTINCT ON', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([mockLegalDocument]);

      const repo = createLegalDocumentRepository(mockDb);
      await repo.findAllLatest();

      expect(mockDb.raw).toHaveBeenCalledTimes(1);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle single document type', async () => {
      vi.mocked(mockDb.raw).mockResolvedValue([mockLegalDocument]);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findAllLatest();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('terms_of_service');
    });

    it('should return only one version per type', async () => {
      const latestPerType = [
        { ...mockLegalDocument, type: 'terms_of_service', version: 5 },
        { ...mockLegalDocument, id: 'doc-456', type: 'privacy_policy', version: 3 },
      ];
      vi.mocked(mockDb.raw).mockResolvedValue(latestPerType);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.findAllLatest();

      const types = result.map((doc) => doc.type);
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });
  });

  describe('update', () => {
    it('should update document and return updated version', async () => {
      const updatedDocument = {
        ...mockLegalDocument,
        title: 'Updated Terms of Service',
        content: 'Updated content...',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-123', {
        title: 'Updated Terms of Service',
        content: 'Updated content...',
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Terms of Service');
      expect(result?.content).toBe('Updated content...');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when document not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-nonexistent', {
        title: 'Updated Title',
      });

      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        ...mockLegalDocument,
        title: 'Updated Title Only',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(partialUpdate);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-123', {
        title: 'Updated Title Only',
      });

      expect(result?.title).toBe('Updated Title Only');
      expect(result?.content).toBe('These are the terms...');
    });

    it('should update effective date', async () => {
      const newEffectiveDate = new Date('2024-06-01');
      const updatedDocument = {
        ...mockLegalDocument,
        effective_date: newEffectiveDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-123', {
        effectiveDate: newEffectiveDate,
      });

      expect(result?.effectiveDate).toEqual(newEffectiveDate);
    });

    it('should return all fields after update', async () => {
      const updatedDocument = {
        ...mockLegalDocument,
        title: 'Updated',
        updated_at: new Date('2024-02-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-123', { title: 'Updated' });

      expect(result?.id).toBe('doc-123');
      expect(result?.type).toBe('terms_of_service');
      expect(result?.version).toBe(1);
      expect(result?.updatedAt).toEqual(new Date('2024-02-01'));
    });

    it('should handle content updates', async () => {
      const newContent = 'Completely new content with different terms...';
      const updatedDocument = {
        ...mockLegalDocument,
        content: newContent,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.update('doc-123', { content: newContent });

      expect(result?.content).toBe(newContent);
    });
  });

  describe('edge cases', () => {
    it('should handle version number boundaries', async () => {
      const highVersionDocument = {
        ...mockLegalDocument,
        version: 999,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(highVersionDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 999,
        title: 'Terms of Service',
        content: 'Content...',
        effectiveDate: new Date('2024-01-01'),
      });

      expect(result.version).toBe(999);
    });

    it('should handle special characters in content', async () => {
      const contentWithSpecialChars = 'Terms with <html>, "quotes", & symbols';
      const documentWithSpecialContent = {
        ...mockLegalDocument,
        content: contentWithSpecialChars,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(documentWithSpecialContent);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 1,
        title: 'Terms of Service',
        content: contentWithSpecialChars,
        effectiveDate: new Date('2024-01-01'),
      });

      expect(result.content).toBe(contentWithSpecialChars);
    });

    it('should handle various document types', async () => {
      const types = [
        'terms_of_service',
        'privacy_policy',
        'cookie_policy',
        'acceptable_use',
        'data_processing_agreement',
      ];

      for (const type of types) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockLegalDocument,
          type,
        });

        const repo = createLegalDocumentRepository(mockDb);
        const result = await repo.findLatestByType(type);

        expect(result?.type).toBe(type);
      }
    });

    it('should handle future effective dates', async () => {
      const futureDate = new Date('2025-01-01');
      const futureDocument = {
        ...mockLegalDocument,
        effective_date: futureDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(futureDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 2,
        title: 'Terms of Service',
        content: 'Future terms...',
        effectiveDate: futureDate,
      });

      expect(result.effectiveDate).toEqual(futureDate);
    });

    it('should handle past effective dates', async () => {
      const pastDate = new Date('2020-01-01');
      const pastDocument = {
        ...mockLegalDocument,
        effective_date: pastDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(pastDocument);

      const repo = createLegalDocumentRepository(mockDb);
      const result = await repo.create({
        type: 'terms_of_service',
        version: 1,
        title: 'Terms of Service',
        content: 'Historical terms...',
        effectiveDate: pastDate,
      });

      expect(result.effectiveDate).toEqual(pastDate);
    });
  });
});
