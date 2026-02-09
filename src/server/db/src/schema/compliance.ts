// src/server/db/src/schema/compliance.ts
/**
 * Compliance Schema Types
 *
 * TypeScript interfaces for legal_documents, user_agreements,
 * consent_logs, and data_export_requests tables.
 * Maps to migrations 0008_compliance.sql and 0011_data_exports.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const LEGAL_DOCUMENTS_TABLE = 'legal_documents';
export const USER_AGREEMENTS_TABLE = 'user_agreements';
export const CONSENT_LOGS_TABLE = 'consent_logs';
export const DATA_EXPORT_REQUESTS_TABLE = 'data_export_requests';

// ============================================================================
// Enums
// ============================================================================

/**
 * Standard legal document types (must match domain DOCUMENT_TYPES in compliance.schemas.ts).
 * DB column is TEXT, but application-level validation constrains to these values.
 */
export type DocumentType = 'terms_of_service' | 'privacy_policy' | 'cookie_policy' | 'dpa';

/** All valid document types */
export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'dpa',
] as const;

/**
 * Standard GDPR consent types (must match domain CONSENT_TYPES in compliance.schemas.ts).
 * DB column is TEXT, but application-level validation constrains to these values.
 */
export type ConsentType = 'marketing_email' | 'analytics' | 'third_party_sharing' | 'profiling';

/** All valid consent types */
export const CONSENT_TYPES: readonly ConsentType[] = [
  'marketing_email',
  'analytics',
  'third_party_sharing',
  'profiling',
] as const;

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

// ============================================================================
// Data Export Enums
// ============================================================================

/** Type of data export request */
export type DataExportType = 'export' | 'deletion';

/** All valid data export types */
export const DATA_EXPORT_TYPES = ['export', 'deletion'] as const;

/** Lifecycle states for a data export request */
export type DataExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';

/** All valid data export statuses */
export const DATA_EXPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled',
] as const;

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
