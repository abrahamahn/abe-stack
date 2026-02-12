// src/server/db/src/schema/compliance.ts
/**
 * Compliance Schema Types
 *
 * TypeScript interfaces for legal_documents, user_agreements,
 * consent_logs, and data_export_requests tables.
 * Maps to migrations 0008_compliance.sql and 0011_data_exports.sql.
 */

import {
  CONSENT_TYPES,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  DOCUMENT_TYPES,
  type ConsentType,
  type DataExportStatus,
  type DataExportType,
  type DocumentType,
} from '@abe-stack/shared';

// Re-export shared constants for consumers that import from schema
export { CONSENT_TYPES, DATA_EXPORT_STATUSES, DATA_EXPORT_TYPES, DOCUMENT_TYPES };
export type { ConsentType, DataExportStatus, DataExportType, DocumentType };

// ============================================================================
// Table Names
// ============================================================================

export const LEGAL_DOCUMENTS_TABLE = 'legal_documents';
export const USER_AGREEMENTS_TABLE = 'user_agreements';
export const CONSENT_LOGS_TABLE = 'consent_logs';
export const DATA_EXPORT_REQUESTS_TABLE = 'data_export_requests';

// ============================================================================
// Legal Document Types
// ============================================================================

/**
 * Legal document record (SELECT result).
 * Versioned ToS, Privacy Policy, etc.
 *
 * @see 0008_compliance.sql — UNIQUE(type, version), version >= 1
 */
export interface LegalDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  effectiveAt: Date;
  createdAt: Date;
}

/**
 * Fields for inserting a new legal document.
 */
export interface NewLegalDocument {
  id?: string;
  type: string;
  title: string;
  content: string;
  version?: number;
  effectiveAt: Date;
  createdAt?: Date;
}

/**
 * Fields for updating an existing legal document.
 * Type and version form the unique constraint and should not change.
 */
export interface UpdateLegalDocument {
  title?: string;
  content?: string;
  effectiveAt?: Date;
}

// ============================================================================
// User Agreement Types
// ============================================================================

/**
 * User agreement record (SELECT result).
 * Tracks which user accepted which legal document version.
 * Append-only — no UpdateUserAgreement type.
 *
 * @see 0008_compliance.sql
 */
export interface UserAgreement {
  id: string;
  userId: string;
  documentId: string;
  agreedAt: Date;
  ipAddress: string | null;
}

/**
 * Fields for inserting a new user agreement.
 */
export interface NewUserAgreement {
  id?: string;
  userId: string;
  documentId: string;
  agreedAt?: Date;
  ipAddress?: string | null;
}

// ============================================================================
// Consent Log Types
// ============================================================================

/**
 * GDPR consent audit trail record (SELECT result).
 * Append-only — records every consent grant or revocation.
 * No UpdateConsentLog type.
 *
 * @see 0008_compliance.sql
 */
export interface ConsentLog {
  id: string;
  userId: string;
  consentType: string;
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Fields for inserting a new consent log entry.
 */
export interface NewConsentLog {
  id?: string;
  userId: string;
  consentType: string;
  granted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

export const LEGAL_DOCUMENT_COLUMNS = {
  id: 'id',
  type: 'type',
  title: 'title',
  content: 'content',
  version: 'version',
  effectiveAt: 'effective_at',
  createdAt: 'created_at',
} as const;

export const USER_AGREEMENT_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  documentId: 'document_id',
  agreedAt: 'agreed_at',
  ipAddress: 'ip_address',
} as const;

export const CONSENT_LOG_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  consentType: 'consent_type',
  granted: 'granted',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;

// DataExportType, DataExportStatus imported from @abe-stack/shared above

// ============================================================================
// Data Export Request Types
// ============================================================================

/**
 * Data export request record (SELECT result).
 * Tracks GDPR data export and deletion workflows.
 *
 * @see 0011_data_exports.sql
 */
export interface DataExportRequest {
  id: string;
  userId: string;
  type: DataExportType;
  status: DataExportStatus;
  format: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Fields for inserting a new data export request (INSERT).
 */
export interface NewDataExportRequest {
  id?: string;
  userId: string;
  type: DataExportType;
  status?: DataExportStatus;
  format?: string;
  downloadUrl?: string | null;
  expiresAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

/**
 * Fields for updating an existing data export request (UPDATE).
 * Excludes immutable fields: id, userId, type, createdAt.
 */
export interface UpdateDataExportRequest {
  status?: DataExportStatus;
  format?: string;
  downloadUrl?: string | null;
  expiresAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export const DATA_EXPORT_REQUEST_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  type: 'type',
  status: 'status',
  format: 'format',
  downloadUrl: 'download_url',
  expiresAt: 'expires_at',
  completedAt: 'completed_at',
  errorMessage: 'error_message',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;
