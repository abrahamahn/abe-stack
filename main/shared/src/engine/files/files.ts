// main/shared/src/engine/files/files.ts

/**
 * Files Domain
 *
 * Schemas, types, and utilities for file records and storage operations.
 */

import { ALLOWED_IMAGE_MIME_TYPES } from '../../primitives/constants/media';
import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseRecord,
  parseString,
} from '../../primitives/schema';
import { fileIdSchema, tenantIdSchema, userIdSchema } from '../../primitives/schema/ids';
import { LIMITS } from '../constants/limits';
import { generateSecureId } from '../crypto';

import type { Schema } from '../../primitives/api';
import type { FileId, TenantId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Types
// ============================================================================

/** Supported storage providers for file uploads */
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

/** Purpose classification for uploaded files */
export type FilePurpose = (typeof FILE_PURPOSES)[number];

/**
 * Full file record (matches DB SELECT result).
 *
 * @param id - Unique file identifier (UUID)
 * @param tenantId - Optional tenant scope (SET NULL on tenant delete)
 * @param userId - Owning user (CASCADE on delete for GDPR)
 * @param filename - Generated unique filename on disk
 * @param originalName - User-provided original filename
 * @param mimeType - MIME type (e.g. "image/png")
 * @param sizeBytes - File size (BIGINT in DB)
 * @param storageProvider - Where the file is stored (local/s3/gcs)
 * @param storagePath - Key/path within the storage provider
 * @param url - Optional public URL
 * @param purpose - File purpose classification
 * @param metadata - Arbitrary JSONB metadata
 * @param createdAt - Upload timestamp
 * @param updatedAt - Last modification timestamp
 */
export interface FileRecord {
  id: FileId;
  tenantId: TenantId | null;
  userId: UserId;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  storagePath: string;
  url: string | null;
  purpose: FilePurpose;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for creating a new file record. */
export interface CreateFileRecord {
  tenantId?: TenantId | null | undefined;
  userId: UserId;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  storagePath: string;
  url?: string | null | undefined;
  purpose?: FilePurpose | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Input for updating an existing file record. */
export interface UpdateFileRecord {
  tenantId?: TenantId | null | undefined;
  filename?: string | undefined;
  originalName?: string | undefined;
  mimeType?: string | undefined;
  sizeBytes?: number | undefined;
  storageProvider?: StorageProvider | undefined;
  storagePath?: string | undefined;
  url?: string | null | undefined;
  purpose?: FilePurpose | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Request body for multipart file uploads after server parser normalization. */
export interface FileUploadRequest {
  buffer: Uint8Array;
  mimetype: string;
  filename?: string | undefined;
  originalName?: string | undefined;
  size?: number | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/** Supported storage providers for file uploads */
export const STORAGE_PROVIDERS = ['local', 's3', 'gcs'] as const;

/** Purpose classification for uploaded files */
export const FILE_PURPOSES = ['avatar', 'document', 'export', 'attachment', 'other'] as const;

/** Allowed image MIME types for avatar uploads. */
export const ALLOWED_IMAGE_TYPES = ALLOWED_IMAGE_MIME_TYPES;

/** Maximum image file size in bytes (5MB). */
export const MAX_IMAGE_SIZE = LIMITS.MAX_IMAGE_SIZE_BYTES;

/** Maximum logo file size in bytes (2MB). */
export const MAX_LOGO_SIZE = LIMITS.MAX_LOGO_SIZE_BYTES;

// ============================================================================
// Schemas
// ============================================================================

/** Schema for validating storage providers */
export const storageProviderSchema = createEnumSchema(STORAGE_PROVIDERS, 'storageProvider');

/** Schema for validating file purposes */
export const filePurposeSchema = createEnumSchema(FILE_PURPOSES, 'purpose');

/** Full file record schema (matches DB SELECT result). */
export const fileRecordSchema: Schema<FileRecord> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: fileIdSchema.parse(obj['id']),
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    userId: userIdSchema.parse(obj['userId']),
    filename: parseString(obj['filename'], 'filename'),
    originalName: parseString(obj['originalName'], 'originalName'),
    mimeType: parseString(obj['mimeType'], 'mimeType'),
    sizeBytes: parseNumber(obj['sizeBytes'], 'sizeBytes', { min: 0 }),
    storageProvider: storageProviderSchema.parse(obj['storageProvider']),
    storagePath: parseString(obj['storagePath'], 'storagePath'),
    url: parseNullable(obj['url'], (v) => parseString(v, 'url')),
    purpose: filePurposeSchema.parse(obj['purpose']),
    metadata: parseRecord(obj['metadata'], 'metadata'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
    updatedAt: coerceDate(obj['updatedAt'], 'updatedAt'),
  };
});

/** Schema for creating a new file record. */
export const createFileRecordSchema: Schema<CreateFileRecord> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    userId: userIdSchema.parse(obj['userId']),
    filename: parseString(obj['filename'], 'filename'),
    originalName: parseString(obj['originalName'], 'originalName'),
    mimeType: parseString(obj['mimeType'], 'mimeType'),
    sizeBytes: parseNumber(obj['sizeBytes'], 'sizeBytes', { min: 0 }),
    storageProvider: storageProviderSchema.parse(obj['storageProvider']),
    storagePath: parseString(obj['storagePath'], 'storagePath'),
    url: parseNullableOptional(obj['url'], (v) => parseString(v, 'url')),
    purpose: parseOptional(obj['purpose'], (v) => filePurposeSchema.parse(v)),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
  };
});

/** Schema for updating an existing file record. */
export const updateFileRecordSchema: Schema<UpdateFileRecord> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    filename: parseOptional(obj['filename'], (v) => parseString(v, 'filename')),
    originalName: parseOptional(obj['originalName'], (v) => parseString(v, 'originalName')),
    mimeType: parseOptional(obj['mimeType'], (v) => parseString(v, 'mimeType')),
    sizeBytes: parseOptional(obj['sizeBytes'], (v) => parseNumber(v, 'sizeBytes', { min: 0 })),
    storageProvider: parseOptional(obj['storageProvider'], (v) => storageProviderSchema.parse(v)),
    storagePath: parseOptional(obj['storagePath'], (v) => parseString(v, 'storagePath')),
    url: parseNullableOptional(obj['url'], (v) => parseString(v, 'url')),
    purpose: parseOptional(obj['purpose'], (v) => filePurposeSchema.parse(v)),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
  };
});

/**
 * Multipart upload request schema.
 * Validates normalized payload from multipart parser middleware.
 */
export const fileUploadRequestSchema: Schema<FileUploadRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const buffer = obj['buffer'];
  if (!(buffer instanceof Uint8Array)) {
    throw new Error('buffer must be a Uint8Array');
  }

  return {
    buffer,
    mimetype: parseString(obj['mimetype'], 'mimetype', { min: 1 }),
    filename: parseOptional(obj['filename'], (v) => parseString(v, 'filename', { min: 1 })),
    originalName: parseOptional(obj['originalName'], (v) =>
      parseString(v, 'originalName', { min: 1 }),
    ),
    size: parseOptional(obj['size'], (v) => parseNumber(v, 'size', { int: true, min: 0 })),
  };
});

// ============================================================================
// Functions
// ============================================================================

/**
 * Normalize a file path for storage.
 *
 * @param path - Raw file path
 * @returns Normalized path
 */
export function normalizeStoragePath(path: string): string {
  if (path === '') return '';

  // Convert Windows backslashes to forward slashes first
  const segments = path.replace(/\\/g, '/').split('/');
  const normalizedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') {
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  return normalizedSegments.join('/');
}

/**
 * Join multiple path segments into a normalized path.
 *
 * @param segments - Path segments to join
 * @returns Joined and normalized path
 */
export function joinStoragePath(...segments: string[]): string {
  return normalizeStoragePath(segments.join('/'));
}

/**
 * Generate a unique filename by appending a timestamp or random string.
 *
 * @param filename - Original filename
 * @param appendTimestamp - Whether to append timestamp (default: true)
 * @returns Unique filename
 */
export function generateUniqueFilename(filename: string, appendTimestamp: boolean = true): string {
  if (filename === '') return '';

  const extMatch = filename.match(/\.[^.]*$/);
  const extension = extMatch !== null ? extMatch[0] : '';
  const nameWithoutExt = extMatch !== null ? filename.slice(0, -extension.length) : filename;

  const uniquePart = appendTimestamp ? Date.now().toString() : generateSecureId(8);

  return `${nameWithoutExt}_${uniquePart}${extension}`;
}

/**
 * Match a MIME type against a wildcard pattern iteratively (no regex).
 * Supports `*` as a segment wildcard, e.g. `image/*` matches `image/png`.
 *
 * @param mime - The MIME type to check (lowercase)
 * @param pattern - The wildcard pattern (lowercase, e.g. `image/*`)
 * @returns true if the MIME type matches the pattern
 * @complexity O(n) where n = max(mime.length, pattern.length)
 */
function matchMimeWildcard(mime: string, pattern: string): boolean {
  let mi = 0;
  let pi = 0;

  while (mi < mime.length && pi < pattern.length) {
    if (pattern[pi] === '*') {
      // '*' matches the rest of the current segment (up to '/' or end)
      pi++;
      // Consume remaining mime chars until '/' or end
      while (mi < mime.length && mime[mi] !== '/') {
        mi++;
      }
    } else if (pattern[pi] === mime[mi]) {
      pi++;
      mi++;
    } else {
      return false;
    }
  }

  // Both must be fully consumed (allow trailing '*' in pattern)
  while (pi < pattern.length && pattern[pi] === '*') {
    pi++;
  }

  return mi === mime.length && pi === pattern.length;
}

/**
 * Validate a file type based on extension or MIME type.
 *
 * @param fileNameOrType - Filename or MIME type to validate
 * @param allowedTypes - Array of allowed extensions or MIME types
 * @returns True if valid, false otherwise
 */
export function validateFileType(fileNameOrType: string, allowedTypes: string[]): boolean {
  if (fileNameOrType === '' || allowedTypes.length === 0) {
    return false;
  }

  const lowerFileNameOrType = fileNameOrType.toLowerCase();

  // Check if it's a MIME type (contains slash)
  if (lowerFileNameOrType.includes('/')) {
    return allowedTypes.some((type) => {
      const lowerType = type.toLowerCase();
      if (!lowerType.includes('*')) {
        return lowerType === lowerFileNameOrType;
      }
      // Wildcard MIME matching (e.g., "image/*") — iterative, no regex
      return matchMimeWildcard(lowerFileNameOrType, lowerType);
    });
  }

  // Otherwise treat as filename and check extension
  const extMatch = lowerFileNameOrType.match(/\.[^.]*$/);
  const extension = extMatch !== null ? extMatch[0].substring(1) : ''; // Remove the dot

  return allowedTypes.some((type) => {
    const lowerType = type.toLowerCase();
    // Check if type is an extension (starts with dot) or just the extension name
    if (lowerType.startsWith('.')) {
      return lowerType.substring(1) === extension;
    } else {
      return lowerType === extension;
    }
  });
}
