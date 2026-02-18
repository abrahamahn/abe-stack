// main/server/core/src/media/service.ts
/**
 * Media Service
 *
 * Pure business logic for media operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept dependencies as explicit parameters for testability.
 */

import {
  ALLOWED_MEDIA_MIME_TYPES,
  DEFAULT_MAX_MEDIA_FILE_SIZE,
  generateFileId,
  MIME_TO_EXT,
  sanitizeFilename,
} from '@bslt/media';
import { BadRequestError, NotFoundError } from '@bslt/shared';

import type {
  MediaMetadataResponse,
  MediaProcessingQueuePort,
  MediaRepositories,
  MediaStorageProvider,
  MediaUploadInput,
  MediaUploadResult,
  ProcessingStatus,
  ProcessingStatusResponse,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/** Storage key prefix for media files */
const MEDIA_PATH_PREFIX = 'media';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Derive extension from MIME type.
 *
 * @param mimeType - MIME type string
 * @returns File extension without dot
 * @complexity O(1)
 */
function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'bin';
}

/**
 * Determine the processing status from a file record.
 * Files with a storagePath set are considered complete.
 * Files without a storagePath are pending.
 *
 * @param file - File record from the repository
 * @returns Processing status
 * @complexity O(1)
 */
function deriveProcessingStatus(file: {
  storagePath: string;
  metadata: Record<string, unknown>;
}): ProcessingStatus {
  const metaStatus = file.metadata['processingStatus'];
  if (typeof metaStatus === 'string') {
    const validStatuses: ProcessingStatus[] = ['pending', 'processing', 'complete', 'failed'];
    if (validStatuses.includes(metaStatus as ProcessingStatus)) {
      return metaStatus as ProcessingStatus;
    }
  }
  // Default: if storagePath exists, consider complete; otherwise pending
  return file.storagePath !== '' ? 'complete' : 'pending';
}

// ============================================================================
// Upload Media
// ============================================================================

/**
 * Upload a media file: validate, store original, queue processing.
 *
 * @param storage - Storage provider for file persistence
 * @param repos - Media repositories
 * @param queue - Optional processing queue
 * @param userId - Authenticated user ID
 * @param file - Uploaded file data
 * @returns Upload result with file ID and storage key
 * @throws BadRequestError if file type or size is invalid
 * @complexity O(1) - validation, upload, DB insert
 */
export async function uploadMedia(
  storage: MediaStorageProvider,
  repos: MediaRepositories,
  queue: MediaProcessingQueuePort | undefined,
  userId: string,
  file: MediaUploadInput,
): Promise<MediaUploadResult> {
  // Validate file size
  if (file.size > DEFAULT_MAX_MEDIA_FILE_SIZE) {
    throw new BadRequestError(
      `File too large. Maximum size: ${String(DEFAULT_MAX_MEDIA_FILE_SIZE / 1024 / 1024)}MB`,
    );
  }

  if (file.size === 0) {
    throw new BadRequestError('File is empty');
  }

  // Validate MIME type
  if (!(ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    throw new BadRequestError(
      `File type not allowed: ${file.mimetype}. Allowed types: ${ALLOWED_MEDIA_MIME_TYPES.join(', ')}`,
    );
  }

  // Generate unique file ID and storage key
  const fileId = generateFileId();
  const sanitizedName = sanitizeFilename(file.filename);
  const ext = getExtensionFromMimeType(file.mimetype);
  const storageKey = `${MEDIA_PATH_PREFIX}/${userId}/${fileId}.${ext}`;

  // Upload to storage
  await storage.upload(storageKey, file.buffer, file.mimetype);

  // Determine initial processing status
  const initialStatus: ProcessingStatus = queue !== undefined ? 'pending' : 'complete';

  // Create file record in database
  await repos.files.create({
    id: fileId,
    userId,
    filename: sanitizedName,
    originalName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageProvider: 'local',
    storagePath: storageKey,
    purpose: 'attachment',
    metadata: { processingStatus: initialStatus },
  });

  // Queue processing job if queue is available
  let processingJobId: string | null = null;
  if (queue !== undefined) {
    processingJobId = await queue.addJob({
      fileId,
      filePath: storageKey,
      filename: sanitizedName,
      userId,
    });
  }

  return {
    fileId,
    storageKey,
    filename: sanitizedName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    processingJobId,
  };
}

// ============================================================================
// Get Media Metadata
// ============================================================================

/**
 * Get metadata and access URL for a media file.
 *
 * @param storage - Storage provider for signed URL generation
 * @param repos - Media repositories
 * @param mediaId - File record identifier
 * @param userId - Authenticated user ID for authorization
 * @returns Media metadata with signed URL
 * @throws NotFoundError if file not found or not owned by user
 * @complexity O(1) - DB lookup + signed URL generation
 */
export async function getMediaMetadata(
  storage: MediaStorageProvider,
  repos: MediaRepositories,
  mediaId: string,
  userId: string,
): Promise<MediaMetadataResponse> {
  const file = await repos.files.findById(mediaId);

  if (file?.userId !== userId) {
    throw new NotFoundError('Media file not found');
  }

  // Generate signed URL for the file
  let url: string | null = null;
  if (file.storagePath !== '') {
    url = await storage.getSignedUrl(file.storagePath);
  }

  const processingStatus = deriveProcessingStatus(file);

  return {
    id: file.id,
    filename: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    url,
    purpose: file.purpose,
    processingStatus,
    createdAt: file.createdAt.toISOString(),
  };
}

// ============================================================================
// Delete Media
// ============================================================================

/**
 * Delete a media file and its stored artifacts.
 *
 * @param storage - Storage provider for file deletion
 * @param repos - Media repositories
 * @param mediaId - File record identifier
 * @param userId - Authenticated user ID for authorization
 * @throws NotFoundError if file not found or not owned by user
 * @complexity O(1) - DB lookup, storage delete, DB delete
 */
export async function deleteMedia(
  storage: MediaStorageProvider,
  repos: MediaRepositories,
  mediaId: string,
  userId: string,
): Promise<void> {
  const file = await repos.files.findById(mediaId);

  if (file?.userId !== userId) {
    throw new NotFoundError('Media file not found');
  }

  // Delete from storage
  if (file.storagePath !== '') {
    await storage.delete(file.storagePath);
  }

  // Delete database record
  await repos.files.delete(mediaId);
}

// ============================================================================
// Get Processing Status
// ============================================================================

/**
 * Check the processing status of a media file.
 *
 * @param repos - Media repositories
 * @param mediaId - File record identifier
 * @param userId - Authenticated user ID for authorization
 * @returns Processing status response
 * @throws NotFoundError if file not found or not owned by user
 * @complexity O(1) - single DB lookup
 */
export async function getProcessingStatus(
  repos: MediaRepositories,
  mediaId: string,
  userId: string,
): Promise<ProcessingStatusResponse> {
  const file = await repos.files.findById(mediaId);

  if (file?.userId !== userId) {
    throw new NotFoundError('Media file not found');
  }

  const status = deriveProcessingStatus(file);
  const errorMsg = file.metadata['processingError'];

  return {
    fileId: file.id,
    status,
    error: typeof errorMsg === 'string' ? errorMsg : null,
  };
}
