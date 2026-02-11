// src/server/core/src/files/types.ts
/**
 * Files Module Types
 *
 * Narrow dependency interfaces for the files package.
 * Decouples file logic from concrete server implementations,
 * keeping the package framework-agnostic.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type { FileRepository } from '@abe-stack/db';
import type { BaseContext, HasStorage, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Storage Interface
// ============================================================================

/**
 * Storage provider contract for file operations.
 * Matches the shared StorageClient/StorageService interface.
 */
export interface FileStorageProvider {
  /** Upload binary data to storage */
  upload(key: string, data: Uint8Array | string, contentType: string): Promise<string>;
  /** Delete a file from storage */
  delete(key: string): Promise<void>;
  /** Generate a signed URL for temporary access */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

// ============================================================================
// Upload Options
// ============================================================================

/**
 * Options for file upload validation and storage.
 */
export interface FileUploadOptions {
  /** Allowed MIME types (e.g., ['image/jpeg', 'image/png', 'application/pdf']) */
  readonly allowedMimeTypes: readonly string[];
  /** Maximum file size in bytes (default: 10MB) */
  readonly maxSizeBytes: number;
}

// ============================================================================
// File Metadata
// ============================================================================

/**
 * File metadata returned from service operations.
 * Serializable for API responses (dates as ISO strings).
 */
export interface FileMetadata {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string | null;
  readonly filename: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly purpose: string;
  readonly downloadUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// Handler Context
// ============================================================================

/**
 * Application context for file handlers.
 *
 * Extends `BaseContext` with file-specific repository and storage access.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 */
export interface FileAppContext extends BaseContext, HasStorage {
  readonly repos: {
    readonly files: FileRepository;
  };
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Request interface for file handlers.
 * Re-exports `RequestContext` from shared contracts for consistency.
 */
export type FileRequest = RequestContext;

// ============================================================================
// Default Configuration
// ============================================================================

/** Default maximum file size: 10MB */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Default allowed MIME types for general file uploads */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
] as const;
