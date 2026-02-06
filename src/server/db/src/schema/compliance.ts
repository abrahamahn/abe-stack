// backend/db/src/schema/compliance.ts
/**
 * Compliance Schema Types
 *
 * TypeScript interfaces for legal_documents, user_agreements, and
 * consent_logs tables.
 * Maps to migration 0008_compliance.sql.
 */

// ============================================================================
// Table Names
// ============================================================================

export const LEGAL_DOCUMENTS_TABLE = 'legal_documents';
export const USER_AGREEMENTS_TABLE = 'user_agreements';
export const CONSENT_LOGS_TABLE = 'consent_logs';

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
