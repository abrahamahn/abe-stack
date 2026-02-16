// main/shared/src/domain/files/files.schemas.ts

/**
 * @file Files Domain Schemas
 * @description Schemas for file record validation and type inference.
 * @module Domain/Files
 */

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
} from '../../core/schema.utils';
import { fileIdSchema, tenantIdSchema, userIdSchema } from '../../types/ids';

import type { Schema } from '../../primitives/api';
import type { FileId, TenantId, UserId } from '../../types/ids';

// ============================================================================
// Enums
// ============================================================================

/** Supported storage providers for file uploads */
export const STORAGE_PROVIDERS = ['local', 's3', 'gcs'] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

/** Purpose classification for uploaded files */
export const FILE_PURPOSES = ['avatar', 'document', 'export', 'attachment', 'other'] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

/** Schema for validating storage providers */
export const storageProviderSchema = createEnumSchema(STORAGE_PROVIDERS, 'storageProvider');

/** Schema for validating file purposes */
export const filePurposeSchema = createEnumSchema(FILE_PURPOSES, 'purpose');

// ============================================================================
// Types
// ============================================================================

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

/**
 * Input for creating a new file record.
 */
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

/**
 * Input for updating an existing file record.
 */
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

/**
 * Request body for multipart file uploads after server parser normalization.
 */
export interface FileUploadRequest {
  buffer: Uint8Array;
  mimetype: string;
  filename?: string | undefined;
  originalName?: string | undefined;
  size?: number | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Full file record schema (matches DB SELECT result).
 */
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

/**
 * Schema for creating a new file record.
 */
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

/**
 * Schema for updating an existing file record.
 */
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
