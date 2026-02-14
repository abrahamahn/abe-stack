// main/server/media/src/database.ts
/**
 * Media Processing Database Operations
 *
 * Provides database adapter interface and in-memory implementation
 * for media file management. Uses a simple interface to avoid tight
 * coupling with specific ORM implementations.
 *
 * @module database
 */

/**
 * A media file record stored in the database
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

/**
 * Aggregated processing statistics
 */
export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  averageProcessingTime: number;
  storageUsed: number;
}

/**
 * Database adapter interface for media operations.
 * Implement this interface to connect to any database backend (Drizzle, Prisma, etc.)
 *
 * @example
 * ```typescript
 * class DrizzleMediaDatabase implements MediaDatabaseAdapter {
 *   async bulkInsertMediaRecords(records: MediaProcessingRecord[]): Promise<void> {
 *     await db.insert(mediaTable).values(records);
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface MediaDatabaseAdapter {
  /**
   * Insert multiple media records in a single batch
   *
   * @param records - Array of media records to insert
   */
  bulkInsertMediaRecords(records: MediaProcessingRecord[]): Promise<void>;

  /**
   * Update processing result for a specific file
   *
   * @param fileId - The file ID to update
   * @param result - The processing result fields to update
   */
  updateProcessingResult(
    fileId: string,
    result: {
      storageKey?: string;
      contentType?: string;
      size?: number;
      processingError?: string;
    },
  ): Promise<void>;

  /**
   * Get files that are pending processing (no storage key assigned)
   *
   * @param limit - Maximum number of records to return
   * @returns Array of pending media records
   */
  getPendingFiles(limit?: number): Promise<MediaProcessingRecord[]>;

  /**
   * Get media files belonging to a user with pagination and optional filter
   *
   * @param userId - The user ID to filter by
   * @param options - Pagination and filter options
   * @returns Paginated result with files array and total count
   */
  getUserMediaFiles(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      contentType?: string;
    },
  ): Promise<{ files: MediaProcessingRecord[]; total: number }>;

  /**
   * Get aggregated processing statistics, optionally scoped to a user
   *
   * @param userId - Optional user ID to scope statistics
   * @returns Processing statistics
   */
  getProcessingStats(userId?: string): Promise<ProcessingStats>;

  /**
   * Delete records older than a specified number of days
   *
   * @param olderThanDays - Number of days threshold
   * @returns Object with count of deleted records
   */
  cleanupOldRecords(olderThanDays?: number): Promise<{ deletedCount: number }>;

  /**
   * Soft delete a file if it belongs to the specified user
   *
   * @param fileId - The file ID to delete
   * @param userId - The owner user ID for authorization
   * @returns True if file was deleted, false if not found or unauthorized
   */
  softDeleteFile(fileId: string, userId: string): Promise<boolean>;

  /**
   * Get a single file by ID, optionally scoped to a user
   *
   * @param fileId - The file ID to retrieve
   * @param userId - Optional user ID for authorization check
   * @returns The media record, or null if not found
   */
  getFileById(fileId: string, userId?: string): Promise<MediaProcessingRecord | null>;

  /**
   * Bulk update metadata fields for multiple files
   *
   * @param updates - Array of update objects with fileId and fields to update
   */
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
 * In-memory implementation of MediaDatabaseAdapter for testing and development.
 * Stores records in a Map with O(1) lookup by ID.
 *
 * @example
 * ```typescript
 * const db = new InMemoryMediaDatabase();
 * await db.bulkInsertMediaRecords([{ id: '1', filename: 'test.jpg', ... }]);
 * const record = await db.getFileById('1');
 * ```
 */
export class InMemoryMediaDatabase implements MediaDatabaseAdapter {
  private readonly records = new Map<string, MediaProcessingRecord>();

  /**
   * Insert multiple media records into the in-memory store
   *
   * @param records - Array of records to insert
   * @complexity O(n) where n is records.length
   */
  bulkInsertMediaRecords(records: MediaProcessingRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, { ...record });
    }
    return Promise.resolve();
  }

  /**
   * Update processing result for a file
   *
   * @param fileId - The file ID to update
   * @param result - Fields to update
   * @complexity O(1) map lookup
   */
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

  /**
   * Get files pending processing (no storage key)
   *
   * @param limit - Maximum records to return (default: 50)
   * @returns Array of pending records
   * @complexity O(n) where n is total records
   */
  getPendingFiles(limit: number = 50): Promise<MediaProcessingRecord[]> {
    const pending: MediaProcessingRecord[] = [];
    for (const record of this.records.values()) {
      if (
        record.storageKey === undefined ||
        record.storageKey === null ||
        record.storageKey === ''
      ) {
        pending.push(record);
        if (pending.length >= limit) break;
      }
    }
    return Promise.resolve(pending);
  }

  /**
   * Get media files for a user with pagination and content type filter
   *
   * @param userId - User ID to filter by
   * @param options - Pagination and filter options
   * @returns Paginated result
   * @complexity O(n) where n is total records
   */
  getUserMediaFiles(
    userId: string,
    options: { limit?: number; offset?: number; contentType?: string } = {},
  ): Promise<{ files: MediaProcessingRecord[]; total: number }> {
    const { limit = 20, offset = 0, contentType } = options;

    let files: MediaProcessingRecord[] = [];
    for (const record of this.records.values()) {
      if (record.ownerId === userId) {
        if (
          contentType === undefined ||
          contentType === '' ||
          (record.contentType?.startsWith(contentType) ?? false)
        ) {
          files.push(record);
        }
      }
    }

    const total = files.length;
    files = files.slice(offset, offset + limit);

    return Promise.resolve({ files, total });
  }

  /**
   * Get processing statistics
   *
   * @param _userId - Reserved for future per-user stats
   * @returns Aggregated stats
   * @complexity O(n) where n is total records
   */
  getProcessingStats(_userId?: string): Promise<ProcessingStats> {
    let totalFiles = 0;
    let processedFiles = 0;
    let storageUsed = 0;

    for (const record of this.records.values()) {
      totalFiles++;
      if (
        record.storageKey !== undefined &&
        record.storageKey !== null &&
        record.storageKey !== ''
      ) {
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

  /**
   * Clean up old records (no-op for in-memory store)
   *
   * @param _olderThanDays - Days threshold (unused in-memory)
   * @returns Always returns 0 deleted
   */
  cleanupOldRecords(_olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    return Promise.resolve({ deletedCount: 0 });
  }

  /**
   * Soft delete a file by ID if owned by the specified user
   *
   * @param fileId - File ID to delete
   * @param userId - Owner user ID for authorization
   * @returns True if deleted, false otherwise
   * @complexity O(1) map lookup
   */
  softDeleteFile(fileId: string, userId: string): Promise<boolean> {
    const record = this.records.get(fileId);
    if (record?.ownerId === userId) {
      this.records.delete(fileId);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  /**
   * Get a single file by ID, optionally checking ownership
   *
   * @param fileId - File ID to look up
   * @param userId - Optional owner check
   * @returns The record, or null if not found or unauthorized
   * @complexity O(1) map lookup
   */
  getFileById(fileId: string, userId?: string): Promise<MediaProcessingRecord | null> {
    const record = this.records.get(fileId);
    if (record === undefined) return Promise.resolve(null);
    if (userId !== undefined && userId !== '' && record.ownerId !== userId)
      return Promise.resolve(null);
    return Promise.resolve(record);
  }

  /**
   * Bulk update metadata for multiple files
   *
   * @param updates - Array of updates
   * @complexity O(m) where m is updates.length
   */
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
   * Get connection stats (mock implementation for interface compatibility)
   *
   * @returns Mock connection stats
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
