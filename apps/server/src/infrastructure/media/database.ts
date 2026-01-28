// apps/server/src/infrastructure/media/database.ts
/**
 * Media Processing Database Operations
 *
 * Provides database operations for media file management.
 * Uses a simple interface to avoid tight coupling with specific ORM implementations.
 */

export interface MediaProcessingRecord {
  id: string;
  filename: string;
  ownerId: string;
  storageKey?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  averageProcessingTime: number;
  storageUsed: number;
}

/**
 * Database adapter interface for media operations
 * This allows different database implementations to be used
 */
export interface MediaDatabaseAdapter {
  bulkInsertMediaRecords(records: MediaProcessingRecord[]): Promise<void>;
  updateProcessingResult(
    fileId: string,
    result: {
      storageKey?: string;
      contentType?: string;
      size?: number;
      processingError?: string;
    },
  ): Promise<void>;
  getPendingFiles(limit?: number): Promise<MediaProcessingRecord[]>;
  getUserMediaFiles(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      contentType?: string;
    },
  ): Promise<{ files: MediaProcessingRecord[]; total: number }>;
  getProcessingStats(userId?: string): Promise<ProcessingStats>;
  cleanupOldRecords(olderThanDays?: number): Promise<{ deletedCount: number }>;
  softDeleteFile(fileId: string, userId: string): Promise<boolean>;
  getFileById(fileId: string, userId?: string): Promise<MediaProcessingRecord | null>;
  bulkUpdateMetadata(
    updates: Array<{
      fileId: string;
      storageKey?: string;
      contentType?: string;
      size?: number;
    }>,
  ): Promise<void>;
}

/**
 * In-memory implementation for testing and development
 */
export class InMemoryMediaDatabase implements MediaDatabaseAdapter {
  private records = new Map<string, MediaProcessingRecord>();

  bulkInsertMediaRecords(records: MediaProcessingRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, { ...record });
    }
    return Promise.resolve();
  }

  updateProcessingResult(
    fileId: string,
    result: {
      storageKey?: string;
      contentType?: string;
      size?: number;
    },
  ): Promise<void> {
    const record = this.records.get(fileId);
    if (record !== undefined) {
      this.records.set(fileId, {
        ...record,
        ...result,
        updatedAt: new Date(),
      });
    }
    return Promise.resolve();
  }

  getPendingFiles(limit: number = 50): Promise<MediaProcessingRecord[]> {
    const pending: MediaProcessingRecord[] = [];
    for (const record of this.records.values()) {
      if (record.storageKey === undefined || record.storageKey === null || record.storageKey === '') {
        pending.push(record);
        if (pending.length >= limit) break;
      }
    }
    return Promise.resolve(pending);
  }

  getUserMediaFiles(
    userId: string,
    options: { limit?: number; offset?: number; contentType?: string } = {},
  ): Promise<{ files: MediaProcessingRecord[]; total: number }> {
    const { limit = 20, offset = 0, contentType } = options;

    let files: MediaProcessingRecord[] = [];
    for (const record of this.records.values()) {
      if (record.ownerId === userId) {
        if (contentType === undefined || contentType === '' || (record.contentType?.startsWith(contentType) ?? false)) {
          files.push(record);
        }
      }
    }

    const total = files.length;
    files = files.slice(offset, offset + limit);

    return Promise.resolve({ files, total });
  }

  getProcessingStats(_userId?: string): Promise<ProcessingStats> {
    let totalFiles = 0;
    let processedFiles = 0;
    let storageUsed = 0;

    for (const record of this.records.values()) {
      totalFiles++;
      if (record.storageKey !== undefined && record.storageKey !== null && record.storageKey !== '') {
        processedFiles++;
      }
      if (record.size !== undefined && record.size !== null && record.size > 0) {
        storageUsed += record.size;
      }
    }

    return Promise.resolve({
      totalFiles,
      processedFiles,
      failedFiles: totalFiles - processedFiles,
      averageProcessingTime: 0,
      storageUsed,
    });
  }

  cleanupOldRecords(_olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    // In-memory implementation doesn't persist, so no cleanup needed
    return Promise.resolve({ deletedCount: 0 });
  }

  softDeleteFile(fileId: string, userId: string): Promise<boolean> {
    const record = this.records.get(fileId);
    if (record?.ownerId === userId) {
      this.records.delete(fileId);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  getFileById(fileId: string, userId?: string): Promise<MediaProcessingRecord | null> {
    const record = this.records.get(fileId);
    if (record === undefined) return Promise.resolve(null);
    if (userId !== undefined && userId !== '' && record.ownerId !== userId) return Promise.resolve(null);
    return Promise.resolve(record);
  }

  bulkUpdateMetadata(
    updates: Array<{
      fileId: string;
      storageKey?: string;
      contentType?: string;
      size?: number;
    }>,
  ): Promise<void> {
    for (const update of updates) {
      const record = this.records.get(update.fileId);
      if (record !== undefined) {
        const updatedRecord: MediaProcessingRecord = {
          ...record,
          updatedAt: new Date(),
        };
        if (update.storageKey !== undefined) {
          updatedRecord.storageKey = update.storageKey;
        }
        if (update.contentType !== undefined) {
          updatedRecord.contentType = update.contentType;
        }
        if (update.size !== undefined) {
          updatedRecord.size = update.size;
        }
        this.records.set(update.fileId, updatedRecord);
      }
    }
    return Promise.resolve();
  }

  /**
   * Get connection stats (mock implementation)
   */
  getConnectionStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
    };
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records.clear();
  }
}
