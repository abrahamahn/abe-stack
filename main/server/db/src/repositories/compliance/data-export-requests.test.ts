// main/server/db/src/repositories/compliance/data-export-requests.test.ts
/**
 * Tests for Data Export Requests Repository
 *
 * Validates data export request operations including creation, lookups by ID,
 * listing by user, updates, and status transitions for GDPR compliance workflows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createDataExportRequestRepository } from './data-export-requests';

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

const mockRequest = {
  id: 'der-123',
  user_id: 'usr-123',
  type: 'export',
  status: 'pending',
  format: 'json',
  download_url: null,
  expires_at: null,
  completed_at: null,
  error_message: null,
  metadata: '{}',
  created_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createDataExportRequestRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new data export request successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'export',
        status: 'pending',
        format: 'json',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.type).toBe('export');
      expect(result.status).toBe('pending');
      expect(result.format).toBe('json');
      expect(result.metadata).toEqual({});
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createDataExportRequestRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          type: 'export',
          status: 'pending',
          format: 'json',
        }),
      ).rejects.toThrow('Failed to create data export request');
    });

    it('should stringify metadata when creating request', async () => {
      const mockWithMetadata = {
        ...mockRequest,
        metadata: '{"key":"value"}',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWithMetadata);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        type: 'export',
        status: 'pending',
        format: 'json',
        metadata: { key: 'value' },
      });

      expect(result.metadata).toEqual({ key: 'value' });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return request when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findById('der-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('der-123');
      expect(result?.userId).toBe('usr-123');
      expect(result?.type).toBe('export');
      expect(result?.status).toBe('pending');
      expect(result?.format).toBe('json');
      expect(result?.metadata).toEqual({});
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when request not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should filter by id in query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.findById('der-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
        }),
      );
    });

    it('should parse JSON metadata string to object', async () => {
      const mockWithMetadata = {
        ...mockRequest,
        metadata: '{"exportOptions":{"includeFiles":true}}',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWithMetadata);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findById('der-123');

      expect(result?.metadata).toEqual({ exportOptions: { includeFiles: true } });
    });
  });

  describe('findByUserId', () => {
    it('should return all requests for a user', async () => {
      const mockRequests = [
        mockRequest,
        {
          ...mockRequest,
          id: 'der-456',
          created_at: new Date('2024-01-15'),
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockRequests);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('der-123');
      expect(result[1].id).toBe('der-456');
      expect(result[0].userId).toBe('usr-123');
      expect(result[1].userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no requests found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findByUserId('usr-no-requests');

      expect(result).toEqual([]);
    });

    it('should filter by user_id in query', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*user_id/s),
        }),
      );
    });

    it('should order results by created_at DESC', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*DESC/s),
        }),
      );
    });

    it('should transform all requests with metadata parsing', async () => {
      const mockRequests = [
        { ...mockRequest, metadata: '{"a":1}' },
        { ...mockRequest, id: 'der-456', metadata: '{"b":2}' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockRequests);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result[0].metadata).toEqual({ a: 1 });
      expect(result[1].metadata).toEqual({ b: 2 });
    });
  });

  describe('update', () => {
    it('should update request successfully', async () => {
      const mockUpdated = {
        ...mockRequest,
        status: 'completed',
        download_url: 'https://example.com/export.json',
        completed_at: new Date('2024-01-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUpdated);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.update('der-123', {
        status: 'completed',
        downloadUrl: 'https://example.com/export.json',
        completedAt: new Date('2024-01-15'),
      });

      expect(result).toBeDefined();
      expect(result?.status).toBe('completed');
      expect(result?.downloadUrl).toBe('https://example.com/export.json');
      expect(result?.completedAt).toEqual(new Date('2024-01-15'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when request not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.update('nonexistent-id', {
        status: 'completed',
      });

      expect(result).toBeNull();
    });

    it('should filter by id in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.update('der-123', { status: 'completed' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
        }),
      );
    });

    it('should return updated request with RETURNING clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.update('der-123', { status: 'completed' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('RETURNING'),
        }),
      );
    });

    it('should stringify metadata when updating', async () => {
      const mockWithMetadata = {
        ...mockRequest,
        metadata: '{"updated":true}',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockWithMetadata);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.update('der-123', {
        metadata: { updated: true },
      });

      expect(result?.metadata).toEqual({ updated: true });
    });
  });

  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const mockUpdated = {
        ...mockRequest,
        status: 'processing',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUpdated);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.updateStatus('der-123', 'processing');

      expect(result).toBeDefined();
      expect(result?.status).toBe('processing');
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when request not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createDataExportRequestRepository(mockDb);
      const result = await repo.updateStatus('nonexistent-id', 'completed');

      expect(result).toBeNull();
    });

    it('should set status field in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockRequest,
        status: 'failed',
      });

      const repo = createDataExportRequestRepository(mockDb);
      await repo.updateStatus('der-123', 'failed');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status'),
        }),
      );
    });

    it('should filter by id in status update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockRequest);

      const repo = createDataExportRequestRepository(mockDb);
      await repo.updateStatus('der-123', 'completed');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
        }),
      );
    });
  });
});
