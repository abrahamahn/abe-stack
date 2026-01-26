/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/__tests__/database.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  InMemoryMediaDatabase,
  type MediaProcessingRecord,
  type MediaDatabaseAdapter,
} from '../database';

describe('InMemoryMediaDatabase', () => {
  let db: InMemoryMediaDatabase;

  beforeEach(() => {
    db = new InMemoryMediaDatabase();
  });

  afterEach(() => {
    db.clear();
  });

  describe('bulkInsertMediaRecords', () => {
    it('should insert multiple records', async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'file-1',
          filename: 'test1.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'file-2',
          filename: 'test2.png',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.bulkInsertMediaRecords(records);

      const result = await db.getUserMediaFiles('user-1');
      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should handle empty array', async () => {
      await db.bulkInsertMediaRecords([]);

      const result = await db.getUserMediaFiles('user-1');
      expect(result.files).toHaveLength(0);
    });

    it('should overwrite existing records with same id', async () => {
      const record1: MediaProcessingRecord = {
        id: 'file-1',
        filename: 'original.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const record2: MediaProcessingRecord = {
        id: 'file-1',
        filename: 'updated.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record1]);
      await db.bulkInsertMediaRecords([record2]);

      const file = await db.getFileById('file-1');
      expect(file?.filename).toBe('updated.jpg');
    });
  });

  describe('updateProcessingResult', () => {
    it('should update record with processing result', async () => {
      const record: MediaProcessingRecord = {
        id: 'file-1',
        filename: 'test.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      await db.updateProcessingResult('file-1', {
        storageKey: 'processed/test.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      });

      const file = await db.getFileById('file-1');
      expect(file?.storageKey).toBe('processed/test.jpg');
      expect(file?.contentType).toBe('image/jpeg');
      expect(file?.size).toBe(1024);
    });

    it('should update updatedAt timestamp', async () => {
      const originalDate = new Date('2024-01-01');
      const record: MediaProcessingRecord = {
        id: 'file-1',
        filename: 'test.jpg',
        ownerId: 'user-1',
        createdAt: originalDate,
        updatedAt: originalDate,
      };

      await db.bulkInsertMediaRecords([record]);
      await db.updateProcessingResult('file-1', { size: 2048 });

      const file = await db.getFileById('file-1');
      expect(file?.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should handle non-existent record', async () => {
      // Should not throw
      await db.updateProcessingResult('non-existent', { size: 1024 });

      const file = await db.getFileById('non-existent');
      expect(file).toBeNull();
    });
  });

  describe('getPendingFiles', () => {
    it('should return files without storageKey', async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'pending-1',
          filename: 'pending.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'processed-1',
          filename: 'processed.jpg',
          ownerId: 'user-1',
          storageKey: 'storage/processed.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.bulkInsertMediaRecords(records);

      const pending = await db.getPendingFiles();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe('pending-1');
    });

    it('should respect limit parameter', async () => {
      const records: MediaProcessingRecord[] = [];
      for (let i = 0; i < 10; i++) {
        records.push({
          id: `pending-${i}`,
          filename: `file${i}.jpg`,
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.bulkInsertMediaRecords(records);

      const pending = await db.getPendingFiles(5);
      expect(pending).toHaveLength(5);
    });

    it('should use default limit of 50', async () => {
      const records: MediaProcessingRecord[] = [];
      for (let i = 0; i < 60; i++) {
        records.push({
          id: `pending-${i}`,
          filename: `file${i}.jpg`,
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.bulkInsertMediaRecords(records);

      const pending = await db.getPendingFiles();
      expect(pending).toHaveLength(50);
    });
  });

  describe('getUserMediaFiles', () => {
    beforeEach(async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'user1-file1',
          filename: 'image1.jpg',
          ownerId: 'user-1',
          contentType: 'image/jpeg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user1-file2',
          filename: 'image2.png',
          ownerId: 'user-1',
          contentType: 'image/png',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user1-file3',
          filename: 'audio.mp3',
          ownerId: 'user-1',
          contentType: 'audio/mpeg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2-file1',
          filename: 'other.jpg',
          ownerId: 'user-2',
          contentType: 'image/jpeg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await db.bulkInsertMediaRecords(records);
    });

    it('should return files for specific user', async () => {
      const result = await db.getUserMediaFiles('user-1');

      expect(result.files).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.files.every((f) => f.ownerId === 'user-1')).toBe(true);
    });

    it('should filter by content type', async () => {
      const result = await db.getUserMediaFiles('user-1', { contentType: 'image' });

      expect(result.files).toHaveLength(2);
      expect(result.files.every((f) => f.contentType?.startsWith('image'))).toBe(true);
    });

    it('should apply pagination with limit and offset', async () => {
      const page1 = await db.getUserMediaFiles('user-1', { limit: 2, offset: 0 });
      const page2 = await db.getUserMediaFiles('user-1', { limit: 2, offset: 2 });

      expect(page1.files).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page2.files).toHaveLength(1);
      expect(page2.total).toBe(3);
    });

    it('should return empty result for non-existent user', async () => {
      const result = await db.getUserMediaFiles('non-existent-user');

      expect(result.files).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      const result = await db.getUserMediaFiles('user-1');

      expect(result.files.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getProcessingStats', () => {
    it('should return correct statistics', async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'processed-1',
          filename: 'done.jpg',
          ownerId: 'user-1',
          storageKey: 'storage/done.jpg',
          size: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'processed-2',
          filename: 'done2.jpg',
          ownerId: 'user-1',
          storageKey: 'storage/done2.jpg',
          size: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pending-1',
          filename: 'pending.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.bulkInsertMediaRecords(records);

      const stats = await db.getProcessingStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.processedFiles).toBe(2);
      expect(stats.failedFiles).toBe(1);
      expect(stats.storageUsed).toBe(3000);
      expect(stats.averageProcessingTime).toBe(0); // Not tracked in memory impl
    });

    it('should return zero stats for empty database', async () => {
      const stats = await db.getProcessingStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.processedFiles).toBe(0);
      expect(stats.failedFiles).toBe(0);
      expect(stats.storageUsed).toBe(0);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should return zero deleted count for in-memory implementation', async () => {
      const result = await db.cleanupOldRecords(30);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('softDeleteFile', () => {
    it('should delete file belonging to user', async () => {
      const record: MediaProcessingRecord = {
        id: 'file-to-delete',
        filename: 'delete-me.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      const result = await db.softDeleteFile('file-to-delete', 'user-1');

      expect(result).toBe(true);
      expect(await db.getFileById('file-to-delete')).toBeNull();
    });

    it('should not delete file belonging to different user', async () => {
      const record: MediaProcessingRecord = {
        id: 'protected-file',
        filename: 'protected.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      const result = await db.softDeleteFile('protected-file', 'user-2');

      expect(result).toBe(false);
      expect(await db.getFileById('protected-file')).not.toBeNull();
    });

    it('should return false for non-existent file', async () => {
      const result = await db.softDeleteFile('non-existent', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('getFileById', () => {
    it('should return file by id', async () => {
      const record: MediaProcessingRecord = {
        id: 'target-file',
        filename: 'target.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      const file = await db.getFileById('target-file');

      expect(file).not.toBeNull();
      expect(file?.id).toBe('target-file');
      expect(file?.filename).toBe('target.jpg');
    });

    it('should return null for non-existent file', async () => {
      const file = await db.getFileById('does-not-exist');

      expect(file).toBeNull();
    });

    it('should filter by userId when provided', async () => {
      const record: MediaProcessingRecord = {
        id: 'user-file',
        filename: 'user-specific.jpg',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      const ownFile = await db.getFileById('user-file', 'user-1');
      const otherUserFile = await db.getFileById('user-file', 'user-2');

      expect(ownFile).not.toBeNull();
      expect(otherUserFile).toBeNull();
    });
  });

  describe('bulkUpdateMetadata', () => {
    it('should update multiple records', async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'bulk-1',
          filename: 'bulk1.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bulk-2',
          filename: 'bulk2.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.bulkInsertMediaRecords(records);

      await db.bulkUpdateMetadata([
        { fileId: 'bulk-1', storageKey: 'storage/bulk1.jpg', size: 1000 },
        { fileId: 'bulk-2', contentType: 'image/jpeg', size: 2000 },
      ]);

      const file1 = await db.getFileById('bulk-1');
      const file2 = await db.getFileById('bulk-2');

      expect(file1?.storageKey).toBe('storage/bulk1.jpg');
      expect(file1?.size).toBe(1000);
      expect(file2?.contentType).toBe('image/jpeg');
      expect(file2?.size).toBe(2000);
    });

    it('should preserve existing values when not updated', async () => {
      const record: MediaProcessingRecord = {
        id: 'preserve-file',
        filename: 'preserve.jpg',
        ownerId: 'user-1',
        storageKey: 'original/path.jpg',
        contentType: 'image/jpeg',
        size: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.bulkInsertMediaRecords([record]);

      await db.bulkUpdateMetadata([{ fileId: 'preserve-file', size: 1000 }]);

      const file = await db.getFileById('preserve-file');

      expect(file?.storageKey).toBe('original/path.jpg');
      expect(file?.contentType).toBe('image/jpeg');
      expect(file?.size).toBe(1000);
    });

    it('should skip non-existent files', async () => {
      await db.bulkUpdateMetadata([{ fileId: 'non-existent', size: 1000 }]);

      // Should not throw and file should not exist
      const file = await db.getFileById('non-existent');
      expect(file).toBeNull();
    });
  });

  describe('getConnectionStats', () => {
    it('should return mock connection stats', () => {
      const stats = db.getConnectionStats();

      expect(stats).toEqual({
        totalCount: 1,
        idleCount: 1,
        waitingCount: 0,
      });
    });
  });

  describe('clear', () => {
    it('should remove all records', async () => {
      const records: MediaProcessingRecord[] = [
        {
          id: 'file-1',
          filename: 'test1.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'file-2',
          filename: 'test2.jpg',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.bulkInsertMediaRecords(records);
      expect((await db.getProcessingStats()).totalFiles).toBe(2);

      db.clear();

      expect((await db.getProcessingStats()).totalFiles).toBe(0);
    });
  });
});

describe('MediaDatabaseAdapter interface', () => {
  it('should be implemented correctly by InMemoryMediaDatabase', () => {
    const db: MediaDatabaseAdapter = new InMemoryMediaDatabase();

    // Verify all interface methods exist
    expect(typeof db.bulkInsertMediaRecords).toBe('function');
    expect(typeof db.updateProcessingResult).toBe('function');
    expect(typeof db.getPendingFiles).toBe('function');
    expect(typeof db.getUserMediaFiles).toBe('function');
    expect(typeof db.getProcessingStats).toBe('function');
    expect(typeof db.cleanupOldRecords).toBe('function');
    expect(typeof db.softDeleteFile).toBe('function');
    expect(typeof db.getFileById).toBe('function');
    expect(typeof db.bulkUpdateMetadata).toBe('function');
  });
});
