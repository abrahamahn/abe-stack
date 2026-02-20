// main/server/db/src/schema/compliance.ts
/**
 * Compliance Schema Types
 *
 * TypeScript interfaces for legal_documents, consent_records,
 * and data_export_requests tables.
 * Maps to migration 0500_compliance.sql.
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
} from '@bslt/shared/core';

// Re-export shared constants for consumers that import from schema
export { CONSENT_TYPES, DATA_EXPORT_STATUSES, DATA_EXPORT_TYPES, DOCUMENT_TYPES };
export type { ConsentType, DataExportStatus, DataExportType, DocumentType };

// ============================================================================
// Table Names
// ============================================================================

export const LEGAL_DOCUMENTS_TABLE = 'legal_documents';
export const CONSENT_RECORDS_TABLE = 'consent_records';
export const DATA_EXPORT_REQUESTS_TABLE = 'data_export_requests';

// ============================================================================
// Legal Document Types
// ============================================================================

/**
 * Legal document record (SELECT result).
 * Versioned ToS, Privacy Policy, etc.
 *
 * @see 0500_compliance.sql — UNIQUE(type, version), version >= 1
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

export const LEGAL_DOCUMENT_COLUMNS = {
  id: 'id',
  type: 'type',
  title: 'title',
  content: 'content',
  version: 'version',
  effectiveAt: 'effective_at',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Consent Record Types
// ============================================================================

/**
 * Discriminator for which compliance record this row represents.
 * - `legal_document`: user accepted a legal document (replaces user_agreements)
 * - `consent_preference`: GDPR consent grant/revocation (replaces consent_logs)
 */
export type ConsentRecordType = 'legal_document' | 'consent_preference';

/**
 * Consent record (SELECT result).
 * Unified append-only record for legal document acceptance and GDPR consent.
 *
 * - `documentId` is set for `legal_document` records, NULL for `consent_preference`.
 * - `consentType` is set for `consent_preference` records, NULL for `legal_document`.
 * - `granted` is set for `consent_preference` records, NULL for `legal_document`.
 *
 * @see 0500_compliance.sql
 */
export interface ConsentRecord {
  id: string;
  userId: string;
  recordType: ConsentRecordType;
  documentId: string | null;
  consentType: string | null;
  granted: boolean | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Fields for inserting a new consent record (INSERT).
 */
export interface NewConsentRecord {
  id?: string;
  userId: string;
  recordType: ConsentRecordType;
  documentId?: string | null;
  consentType?: string | null;
  granted?: boolean | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export const CONSENT_RECORD_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  recordType: 'record_type',
  documentId: 'document_id',
  consentType: 'consent_type',
  granted: 'granted',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Data Export Request Types
// ============================================================================

/**
 * Data export request record (SELECT result).
 * Tracks GDPR data export and deletion workflows.
 *
 * @see 0500_compliance.sql
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
