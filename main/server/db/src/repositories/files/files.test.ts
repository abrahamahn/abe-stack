// main/server/db/src/repositories/files/files.test.ts
/**
 * Tests for Files Repository
 *
 * Validates file record CRUD operations including creation,
 * lookups by user/tenant, updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createFileRepository } from './files';

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

const mockFileRow = {
  id: 'file-001',
  tenant_id: 'tenant-001',
  user_id: 'user-001',
  filename: 'abc123.png',
  original_name: 'photo.png',
  mime_type: 'image/png',
  size_bytes: 204800,
  storage_provider: 'local',
  storage_path: '/uploads/abc123.png',
  url: null,
  purpose: 'avatar',
  metadata: {},
  created_at: new Date('2024-06-01'),
  updated_at: new Date('2024-06-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createFileRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a file record when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFileRow);

      const repo = createFileRepository(mockDb);
      const result = await repo.findById('file-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('file-001');
      expect(result?.userId).toBe('user-001');
      expect(result?.filename).toBe('abc123.png');
      expect(result?.originalName).toBe('photo.png');
      expect(result?.mimeType).toBe('image/png');
      expect(result?.sizeBytes).toBe(204800);
      expect(result?.storageProvider).toBe('local');
      expect(result?.purpose).toBe('avatar');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when file not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFileRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return files for a user', async () => {
      const mockFiles = [
        mockFileRow,
        { ...mockFileRow, id: 'file-002', filename: 'doc.pdf', purpose: 'document' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockFiles);

      const repo = createFileRepository(mockDb);
      const result = await repo.findByUserId('user-001');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('file-001');
      expect(result[1].id).toBe('file-002');
    });

    it('should return empty array when no files found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFileRepository(mockDb);
      const result = await repo.findByUserId('user-001');

      expect(result).toEqual([]);
    });

    it('should filter by user_id in SQL', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFileRepository(mockDb);
      await repo.findByUserId('user-001');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should use default limit of 100', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFileRepository(mockDb);
      await repo.findByUserId('user-001');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });
  });

  describe('findByTenantId', () => {
    it('should return files for a tenant', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockFileRow]);

      const repo = createFileRepository(mockDb);
      const result = await repo.findByTenantId('tenant-001');

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-001');
    });

    it('should filter by tenant_id in SQL', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createFileRepository(mockDb);
      await repo.findByTenantId('tenant-001');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a file record successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockFileRow);

      const repo = createFileRepository(mockDb);
      const result = await repo.create({
        userId: 'user-001',
        filename: 'abc123.png',
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 204800,
        storageProvider: 'local',
        storagePath: '/uploads/abc123.png',
      });

      expect(result.id).toBe('file-001');
      expect(result.userId).toBe('user-001');
      expect(result.storageProvider).toBe('local');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFileRepository(mockDb);

      await expect(
        repo.create({
          userId: 'user-001',
          filename: 'abc123.png',
          originalName: 'photo.png',
          mimeType: 'image/png',
          sizeBytes: 204800,
          storageProvider: 'local',
          storagePath: '/uploads/abc123.png',
        }),
      ).rejects.toThrow('Failed to create file record');
    });
  });

  describe('update', () => {
    it('should update a file record successfully', async () => {
      const updatedRow = { ...mockFileRow, filename: 'renamed.png' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createFileRepository(mockDb);
      const result = await repo.update('file-001', { filename: 'renamed.png' });

      expect(result).not.toBeNull();
      expect(result?.filename).toBe('renamed.png');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when file not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createFileRepository(mockDb);
      const result = await repo.update('nonexistent', { filename: 'renamed.png' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when file is deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createFileRepository(mockDb);
      const result = await repo.delete('file-001');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when file not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createFileRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    it('should return count of deleted files', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createFileRepository(mockDb);
      const result = await repo.deleteByUserId('user-001');

      expect(result).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return 0 when no files found for user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createFileRepository(mockDb);
      const result = await repo.deleteByUserId('user-001');

      expect(result).toBe(0);
    });
  });
});
