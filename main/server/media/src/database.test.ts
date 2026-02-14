// main/server/media/src/database.test.ts
/**
 * Tests for InMemoryMediaDatabase
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { InMemoryMediaDatabase } from './database';

import type { MediaProcessingRecord } from './database';

function createRecord(overrides: Partial<MediaProcessingRecord> = {}): MediaProcessingRecord {
  return {
    id: 'file-1',
    filename: 'test.jpg',
    ownerId: 'user-1',
    storageKey: null,
    contentType: null,
    size: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('InMemoryMediaDatabase', () => {
  let db: InMemoryMediaDatabase;

  beforeEach(() => {
    db = new InMemoryMediaDatabase();
  });

  describe('bulkInsertMediaRecords', () => {
    it('should insert multiple records', async () => {
      const records = [
        createRecord({ id: 'file-1' }),
        createRecord({ id: 'file-2', filename: 'test2.jpg' }),
      ];

      await db.bulkInsertMediaRecords(records);

      const file1 = await db.getFileById('file-1');
      const file2 = await db.getFileById('file-2');

      expect(file1).not.toBeNull();
      expect(file2).not.toBeNull();
      expect(file1?.filename).toBe('test.jpg');
      expect(file2?.filename).toBe('test2.jpg');
    });
  });

  describe('updateProcessingResult', () => {
    it('should update an existing record', async () => {
      await db.bulkInsertMediaRecords([createRecord()]);

      await db.updateProcessingResult('file-1', {
        storageKey: 'uploads/file-1.jpg',
        contentType: 'image/jpeg',
        size: 12345,
      });

      const record = await db.getFileById('file-1');

      expect(record?.storageKey).toBe('uploads/file-1.jpg');
      expect(record?.contentType).toBe('image/jpeg');
      expect(record?.size).toBe(12345);
    });

    it('should not throw for non-existent record', async () => {
      await expect(
        db.updateProcessingResult('nonexistent', { storageKey: 'test' }),
      ).resolves.not.toThrow();
    });
  });

  describe('getPendingFiles', () => {
    it('should return files without storage key', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', storageKey: null }),
        createRecord({ id: 'file-2', storageKey: 'uploads/file-2.jpg' }),
        createRecord({ id: 'file-3', storageKey: null }),
      ]);

      const pending = await db.getPendingFiles();

      expect(pending.length).toBe(2);
      expect(pending.map((r) => r.id)).toContain('file-1');
      expect(pending.map((r) => r.id)).toContain('file-3');
    });

    it('should respect limit', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', storageKey: null }),
        createRecord({ id: 'file-2', storageKey: null }),
        createRecord({ id: 'file-3', storageKey: null }),
      ]);

      const pending = await db.getPendingFiles(2);

      expect(pending.length).toBe(2);
    });
  });

  describe('getUserMediaFiles', () => {
    it('should return files for a user', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', ownerId: 'user-1' }),
        createRecord({ id: 'file-2', ownerId: 'user-2' }),
        createRecord({ id: 'file-3', ownerId: 'user-1' }),
      ]);

      const result = await db.getUserMediaFiles('user-1');

      expect(result.total).toBe(2);
      expect(result.files.length).toBe(2);
    });

    it('should support pagination', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', ownerId: 'user-1' }),
        createRecord({ id: 'file-2', ownerId: 'user-1' }),
        createRecord({ id: 'file-3', ownerId: 'user-1' }),
      ]);

      const result = await db.getUserMediaFiles('user-1', { limit: 1, offset: 1 });

      expect(result.total).toBe(3);
      expect(result.files.length).toBe(1);
    });

    it('should filter by content type', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', ownerId: 'user-1', contentType: 'image/jpeg' }),
        createRecord({ id: 'file-2', ownerId: 'user-1', contentType: 'video/mp4' }),
      ]);

      const result = await db.getUserMediaFiles('user-1', { contentType: 'image' });

      expect(result.total).toBe(1);
      expect(result.files[0]?.contentType).toBe('image/jpeg');
    });
  });

  describe('getProcessingStats', () => {
    it('should return aggregated stats', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1', storageKey: 'key-1', size: 1000 }),
        createRecord({ id: 'file-2', storageKey: null, size: 2000 }),
        createRecord({ id: 'file-3', storageKey: 'key-3', size: 3000 }),
      ]);

      const stats = await db.getProcessingStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.processedFiles).toBe(2);
      expect(stats.failedFiles).toBe(1);
      expect(stats.storageUsed).toBe(6000);
    });
  });

  describe('softDeleteFile', () => {
    it('should delete file owned by user', async () => {
      await db.bulkInsertMediaRecords([createRecord({ id: 'file-1', ownerId: 'user-1' })]);

      const deleted = await db.softDeleteFile('file-1', 'user-1');

      expect(deleted).toBe(true);
      expect(await db.getFileById('file-1')).toBeNull();
    });

    it('should not delete file owned by different user', async () => {
      await db.bulkInsertMediaRecords([createRecord({ id: 'file-1', ownerId: 'user-1' })]);

      const deleted = await db.softDeleteFile('file-1', 'user-2');

      expect(deleted).toBe(false);
      expect(await db.getFileById('file-1')).not.toBeNull();
    });

    it('should return false for non-existent file', async () => {
      const deleted = await db.softDeleteFile('nonexistent', 'user-1');

      expect(deleted).toBe(false);
    });
  });

  describe('getFileById', () => {
    it('should return file by ID', async () => {
      await db.bulkInsertMediaRecords([createRecord({ id: 'file-1' })]);

      const record = await db.getFileById('file-1');

      expect(record).not.toBeNull();
      expect(record?.id).toBe('file-1');
    });

    it('should return null for non-existent ID', async () => {
      const record = await db.getFileById('nonexistent');

      expect(record).toBeNull();
    });

    it('should check ownership when userId is provided', async () => {
      await db.bulkInsertMediaRecords([createRecord({ id: 'file-1', ownerId: 'user-1' })]);

      expect(await db.getFileById('file-1', 'user-1')).not.toBeNull();
      expect(await db.getFileById('file-1', 'user-2')).toBeNull();
    });
  });

  describe('bulkUpdateMetadata', () => {
    it('should update metadata for multiple files', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1' }),
        createRecord({ id: 'file-2' }),
      ]);

      await db.bulkUpdateMetadata([
        { fileId: 'file-1', storageKey: 'key-1', contentType: 'image/jpeg' },
        { fileId: 'file-2', size: 5000 },
      ]);

      const record1 = await db.getFileById('file-1');
      const record2 = await db.getFileById('file-2');

      expect(record1?.storageKey).toBe('key-1');
      expect(record1?.contentType).toBe('image/jpeg');
      expect(record2?.size).toBe(5000);
    });

    it('should skip non-existent records', async () => {
      await expect(
        db.bulkUpdateMetadata([{ fileId: 'nonexistent', storageKey: 'key' }]),
      ).resolves.not.toThrow();
    });
  });

  describe('cleanupOldRecords', () => {
    it('should return zero deleted count for in-memory implementation', async () => {
      const result = await db.cleanupOldRecords();

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('getConnectionStats', () => {
    it('should return mock connection stats', () => {
      const stats = db.getConnectionStats();

      expect(stats.totalCount).toBe(1);
      expect(stats.idleCount).toBe(1);
      expect(stats.waitingCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all records', async () => {
      await db.bulkInsertMediaRecords([
        createRecord({ id: 'file-1' }),
        createRecord({ id: 'file-2' }),
      ]);

      db.clear();

      expect(await db.getFileById('file-1')).toBeNull();
      expect(await db.getFileById('file-2')).toBeNull();
    });
  });
});
