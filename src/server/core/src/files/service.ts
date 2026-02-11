// src/server/core/src/files/service.ts
/**
 * Files Service
 *
 * Pure business logic for file storage operations.
 * No HTTP awareness -- returns domain objects or throws errors.
 * All functions accept repositories and storage as explicit parameters
 * for testability and decoupled architecture.
 */

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  validateFileType,
} from '@abe-stack/shared';

import { DEFAULT_ALLOWED_MIME_TYPES, DEFAULT_MAX_FILE_SIZE } from './types';

import type { FileMetadata, FileStorageProvider, FileUploadOptions } from './types';
import type { FileRecord, FileRepository, NewFileRecord } from '@abe-stack/db';

// ============================================================================
// Constants
// ============================================================================

/** Storage key prefix for uploaded files */
const FILE_PATH_PREFIX = 'files';

// ============================================================================
// File Upload
// ============================================================================

/**
 * Upload a file to storage and create a database record.
 *
 * Validates MIME type and file size before uploading.
 * Generates a unique storage key based on user ID and timestamp.
 *
 * @param storage - Storage provider for file upload
 * @param repos - File repository for DB record creation
 * @param userId - ID of the uploading user
 * @param file - File data with buffer, MIME type, original name, and size
 * @param options - Upload validation options (allowed types, max size)
 * @param tenantId - Optional tenant scope for the file
 * @returns Created file metadata with download URL
 * @throws BadRequestError if file type is invalid or file is too large
 * @complexity O(1) - single upload + database insert
 */
export async function uploadFile(
  storage: FileStorageProvider,
  repos: { files: FileRepository },
  userId: string,
  file: {
    buffer: Buffer | Uint8Array;
    mimetype: string;
    originalName: string;
    size: number;
  },
  options: Partial<FileUploadOptions> = {},
  tenantId?: string,
): Promise<FileMetadata> {
  const allowedTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE;

  // Validate MIME type
  if (!validateFileType(file.mimetype, [...allowedTypes])) {
    throw new BadRequestError(
      `Invalid file type '${file.mimetype}'. Allowed types: ${allowedTypes.join(', ')}`,
    );
  }

  // Validate file size
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    throw new BadRequestError(`File too large. Maximum size: ${String(maxMB)}MB`);
  }

  // Generate unique storage key
  const extension = file.mimetype.split('/')[1] ?? 'bin';
  const timestamp = Date.now();
  const key = `${FILE_PATH_PREFIX}/${userId}/${String(timestamp)}.${extension}`;

  // Upload to storage
  const storedKey = await storage.upload(key, file.buffer, file.mimetype);

  // Generate download URL
  const downloadUrl = await storage.getSignedUrl(storedKey);

  // Create database record
  const newRecord: NewFileRecord = {
    userId,
    tenantId: tenantId ?? null,
    filename: `${String(timestamp)}.${extension}`,
    originalName: file.originalName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageProvider: 'local',
    storagePath: storedKey,
    purpose: 'document',
  };

  const record = await repos.files.create(newRecord);

  return formatFileMetadata(record, downloadUrl);
}

// ============================================================================
// File Metadata Retrieval
// ============================================================================

/**
 * Get file metadata and download URL.
 *
 * Returns the file record with a fresh signed download URL.
 * Only the file owner can access their files (unless admin).
 *
 * @param storage - Storage provider for URL generation
 * @param repos - File repository for DB lookup
 * @param fileId - File record UUID
 * @param userId - ID of the requesting user
 * @param userRole - Role of the requesting user ('user' | 'admin')
 * @returns File metadata with download URL
 * @throws NotFoundError if file not found
 * @throws ForbiddenError if user is not the owner and not admin
 * @complexity O(1) - single database lookup + URL generation
 */
export async function getFileMetadata(
  storage: FileStorageProvider,
  repos: { files: FileRepository },
  fileId: string,
  userId: string,
  userRole = 'user',
): Promise<FileMetadata> {
  const record = await repos.files.findById(fileId);

  if (record === null) {
    throw new NotFoundError('File not found');
  }

  // Authorization: owner or admin
  if (record.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('You do not have permission to access this file');
  }

  const downloadUrl = await storage.getSignedUrl(record.storagePath);
  return formatFileMetadata(record, downloadUrl);
}

// ============================================================================
// File Deletion
// ============================================================================

/**
 * Delete a file from storage and database.
 *
 * Removes the file from the storage provider and deletes the DB record.
 * Only the file owner or an admin can delete a file.
 *
 * @param storage - Storage provider for file deletion
 * @param repos - File repository for DB record deletion
 * @param fileId - File record UUID
 * @param userId - ID of the requesting user
 * @param userRole - Role of the requesting user ('user' | 'admin')
 * @throws NotFoundError if file not found
 * @throws ForbiddenError if user is not the owner and not admin
 * @complexity O(1) - single lookup + storage delete + DB delete
 */
export async function deleteFile(
  storage: FileStorageProvider,
  repos: { files: FileRepository },
  fileId: string,
  userId: string,
  userRole = 'user',
): Promise<void> {
  const record = await repos.files.findById(fileId);

  if (record === null) {
    throw new NotFoundError('File not found');
  }

  // Authorization: owner or admin
  if (record.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('You do not have permission to delete this file');
  }

  // Delete from storage first
  await storage.delete(record.storagePath);

  // Delete DB record
  await repos.files.delete(fileId);
}

// ============================================================================
// Download URL
// ============================================================================

/**
 * Get a presigned download URL for a file.
 *
 * For S3-backed storage, returns a presigned URL.
 * For local storage, returns a direct path.
 *
 * @param storage - Storage provider for URL generation
 * @param repos - File repository for DB lookup
 * @param fileId - File record UUID
 * @param userId - ID of the requesting user
 * @param userRole - Role of the requesting user ('user' | 'admin')
 * @returns Presigned download URL
 * @throws NotFoundError if file not found
 * @throws ForbiddenError if user is not the owner and not admin
 * @complexity O(1) - single DB lookup + URL generation
 */
export async function getDownloadUrl(
  storage: FileStorageProvider,
  repos: { files: FileRepository },
  fileId: string,
  userId: string,
  userRole = 'user',
): Promise<string> {
  const record = await repos.files.findById(fileId);

  if (record === null) {
    throw new NotFoundError('File not found');
  }

  // Authorization: owner or admin
  if (record.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('You do not have permission to access this file');
  }

  return storage.getSignedUrl(record.storagePath);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a database FileRecord to a serializable FileMetadata object.
 *
 * @param record - Database file record
 * @param downloadUrl - Pre-generated download URL
 * @returns Serializable file metadata
 * @complexity O(1)
 */
function formatFileMetadata(record: FileRecord, downloadUrl: string): FileMetadata {
  return {
    id: record.id,
    userId: record.userId,
    tenantId: record.tenantId,
    filename: record.filename,
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    purpose: record.purpose,
    downloadUrl,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
