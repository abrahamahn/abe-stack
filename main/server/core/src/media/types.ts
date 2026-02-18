// main/server/core/src/media/types.ts
/**
 * Media Module Types
 *
 * Narrow dependency interfaces for the media HTTP endpoints.
 * Decouples handlers from concrete implementations, keeping
 * the module framework-agnostic.
 */

import type {
  AuthenticatedUser,
  BaseContext,
  Logger,
  ContractRequestContext as RequestContext,
  RequestInfo,
} from '@bslt/shared';
import type { FileRepository } from '../../../db/src';

// ============================================================================
// Processing Status
// ============================================================================

/** Processing job status for a media file */
export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed';

// ============================================================================
// Service Result Types
// ============================================================================

/**
 * Result returned after successfully uploading a media file.
 *
 * @param fileId - Unique identifier for the uploaded file
 * @param storageKey - Storage path where the file was persisted
 * @param filename - Sanitized filename
 * @param mimeType - Detected MIME type
 * @param sizeBytes - File size in bytes
 * @param processingJobId - ID of the queued processing job (if applicable)
 */
export interface MediaUploadResult {
  readonly fileId: string;
  readonly storageKey: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly processingJobId: string | null;
}

/**
 * Metadata and URLs for a media file.
 *
 * @param id - File record identifier
 * @param filename - Original filename
 * @param mimeType - MIME type
 * @param sizeBytes - File size in bytes
 * @param url - Signed URL for accessing the original file
 * @param purpose - File purpose classification
 * @param processingStatus - Current processing status
 * @param createdAt - ISO timestamp of creation
 */
export interface MediaMetadataResponse {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly url: string | null;
  readonly purpose: string;
  readonly processingStatus: ProcessingStatus;
  readonly createdAt: string;
}

/**
 * Processing status response for a media file.
 *
 * @param fileId - File identifier
 * @param status - Current processing status
 * @param error - Error message if processing failed
 */
export interface ProcessingStatusResponse {
  readonly fileId: string;
  readonly status: ProcessingStatus;
  readonly error: string | null;
}

// ============================================================================
// Storage Interface
// ============================================================================

/**
 * Narrow storage interface used by media service.
 * Satisfied by the shared StorageClient contract.
 */
export interface MediaStorageProvider {
  upload(key: string, data: Uint8Array | string, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

// ============================================================================
// Queue Interface
// ============================================================================

/**
 * Narrow interface for queuing media processing jobs.
 * Satisfied by ServerMediaQueue.addJob or a stub implementation.
 */
export interface MediaProcessingQueuePort {
  addJob(data: {
    fileId: string;
    filePath: string;
    filename: string;
    userId: string;
  }): Promise<string>;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Repositories required for media operations.
 */
export interface MediaRepositories {
  readonly files: FileRepository;
}

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for media handlers.
 * Extends BaseContext with media-specific dependencies.
 */
export interface MediaAppContext extends BaseContext {
  readonly repos: MediaRepositories;
  readonly log: Logger;
  readonly storage: MediaStorageProvider;
  readonly mediaQueue?: MediaProcessingQueuePort;
}

/**
 * Request interface for media handlers.
 * Mirrors the BillingRequest pattern for consistency.
 */
export interface MediaRequest extends RequestContext {
  readonly user?: AuthenticatedUser;
  readonly requestInfo: RequestInfo;
  readonly cookies: Record<string, string | undefined>;
  readonly headers: {
    readonly authorization?: string;
    readonly 'user-agent'?: string;
    readonly [key: string]: string | string[] | undefined;
  };
  readonly ip?: string | undefined;
}

// ============================================================================
// Route Types
// ============================================================================

/**
 * Route handler result returned by media handlers.
 */
export interface MediaRouteResult<T = unknown> {
  readonly status: number;
  readonly body: T;
}

/** HTTP methods supported by media routes */
export type MediaHttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * Base route definition for media routes.
 */
export interface MediaBaseRouteDefinition {
  readonly method: MediaHttpMethod;
  readonly handler: (
    ctx: MediaAppContext,
    body: unknown,
    request: MediaRequest,
  ) => Promise<MediaRouteResult>;
  readonly auth?: 'user' | 'admin';
}

/**
 * Route map type for media routes.
 */
export type MediaRouteMap = Record<string, MediaBaseRouteDefinition>;

// ============================================================================
// Upload File Input
// ============================================================================

/**
 * Input data for a media file upload.
 * Represents parsed multipart form data.
 */
export interface MediaUploadInput {
  readonly buffer: Uint8Array;
  readonly filename: string;
  readonly mimetype: string;
  readonly size: number;
}
