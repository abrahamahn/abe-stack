// main/server/db/src/schema/files.ts
/**
 * Files Schema Types
 *
 * Explicit TypeScript interfaces for the files table.
 * Manages file uploads with multi-provider storage support.
 * Maps to migration 0600_files.sql.
 *
 * @remarks Uses `FileRecord` (not `File`) to avoid collision with the DOM `File` global.
 */

import {
  FILE_PURPOSES,
  STORAGE_PROVIDERS,
  type FilePurpose,
} from '@bslt/shared';
import { type StorageProvider } from '@bslt/shared/system';

// Re-export shared constants for consumers that import from schema
export { FILE_PURPOSES, STORAGE_PROVIDERS };
export type { FilePurpose, StorageProvider };

// ============================================================================
// Table Names
// ============================================================================

export const FILES_TABLE = 'files';

// ============================================================================
// File Types
// ============================================================================

/**
 * File record from database (SELECT result).
 * Named `FileRecord` to avoid collision with DOM `File`.
 *
 * @see 0600_files.sql — size_bytes is BIGINT, purpose has CHECK constraint
 */
export interface FileRecord {
  id: string;
  tenantId: string | null;
  userId: string;
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
 * Fields for inserting a new file record (INSERT).
 * id, createdAt, updatedAt are auto-generated.
 *
 * @param userId - The owning user (CASCADE on delete for GDPR)
 * @param tenantId - Optional tenant scope (SET NULL on delete)
 * @param storageProvider - Where the file is physically stored
 * @param storagePath - Key/path within the storage provider
 */
export interface NewFileRecord {
  id?: string;
  tenantId?: string | null;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  storagePath: string;
  url?: string | null;
  purpose?: FilePurpose;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing file record (UPDATE).
 * Excludes immutable fields: id, userId, createdAt.
 */
export interface UpdateFileRecord {
  tenantId?: string | null;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageProvider?: StorageProvider;
  storagePath?: string;
  url?: string | null;
  purpose?: FilePurpose;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

/**
 * Column mappings for files table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const FILE_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  userId: 'user_id',
  filename: 'filename',
  originalName: 'original_name',
  mimeType: 'mime_type',
  sizeBytes: 'size_bytes',
  storageProvider: 'storage_provider',
  storagePath: 'storage_path',
  url: 'url',
  purpose: 'purpose',
  metadata: 'metadata',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;
