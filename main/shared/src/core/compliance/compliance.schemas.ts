// main/shared/src/core/compliance/compliance.schemas.ts

/**
 * @file Compliance Schemas
 * @description Schemas for legal documents, user agreements, and consent logs.
 * @module Core/Compliance
 */

import {
  coerceDate,
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseOptional,
  parseRecord,
  parseString,
} from '../../primitives/schema';
import {
  consentLogIdSchema,
  legalDocumentIdSchema,
  userAgreementIdSchema,
  userIdSchema,
} from '../../primitives/schema/ids';

import type { Schema } from '../../primitives/api';
import type {
  ConsentLogId,
  LegalDocumentId,
  UserAgreementId,
  UserId,
} from '../../primitives/schema/ids';

// ============================================================================
// Constants
// ============================================================================

/** Standard legal document types */
export const DOCUMENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'dpa',
] as const;

/** Document type union type */
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Data export request types */
export const DATA_EXPORT_TYPES = ['export', 'deletion'] as const;

/** Data export type union */
export type DataExportType = (typeof DATA_EXPORT_TYPES)[number];

/** Data export request lifecycle statuses */
export const DATA_EXPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled',
] as const;

/** Data export status union */
export type DataExportStatus = (typeof DATA_EXPORT_STATUSES)[number];

/** Standard GDPR consent types */
export const CONSENT_TYPES = [
  'marketing_email',
  'analytics',
  'third_party_sharing',
  'profiling',
] as const;

/** Consent type union type */
export type ConsentType = (typeof CONSENT_TYPES)[number];

// ============================================================================
// Types
// ============================================================================

/** Full legal document entity */
export interface LegalDocument {
  id: LegalDocumentId;
  type: string;
  title: string;
  content: string;
  version: number;
  effectiveAt: Date;
  createdAt: Date;
}

/** Input for creating a new legal document */
export interface CreateLegalDocument {
  type: string;
  title: string;
  content: string;
  version?: number | undefined;
  effectiveAt: Date;
}

/** Input for updating a legal document */
export interface UpdateLegalDocument {
  title?: string | undefined;
  content?: string | undefined;
  effectiveAt?: Date | undefined;
}

/** Full user agreement entity */
export interface UserAgreement {
  id: UserAgreementId;
  userId: UserId;
  documentId: LegalDocumentId;
  agreedAt: Date;
  ipAddress: string | null;
}

/** Input for creating a user agreement */
export interface CreateUserAgreement {
  userId: UserId;
  documentId: LegalDocumentId;
  ipAddress?: string | null | undefined;
}

/** Full consent log entry */
export interface ConsentLog {
  id: ConsentLogId;
  userId: UserId;
  consentType: string;
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Input for creating a consent log entry */
export interface CreateConsentLog {
  userId: UserId;
  consentType: string;
  granted: boolean;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Input for updating current user consent preferences */
export interface UpdateConsentPreferencesRequest {
  analytics?: boolean | undefined;
  marketing_email?: boolean | undefined;
  third_party_sharing?: boolean | undefined;
  profiling?: boolean | undefined;
}

/** Full data export request entity */
export interface DataExportRequest {
  id: string;
  userId: UserId;
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

/** Input for creating a new data export request */
export interface CreateDataExportRequest {
  userId: UserId;
  type: DataExportType;
  format?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// ============================================================================
// Legal Document Schemas
// ============================================================================

/**
 * Full legal document schema (matches DB SELECT result).
 */
export const legalDocumentSchema: Schema<LegalDocument> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: legalDocumentIdSchema.parse(obj['id']),
    type: parseString(obj['type'], 'type', { min: 1 }),
    title: parseString(obj['title'], 'title', { min: 1 }),
    content: parseString(obj['content'], 'content', { min: 1 }),
    version: parseNumber(obj['version'], 'version', { int: true, min: 1 }),
    effectiveAt: coerceDate(obj['effectiveAt'], 'effectiveAt'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new legal document.
 */
export const createLegalDocumentSchema: Schema<CreateLegalDocument> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      type: parseString(obj['type'], 'type', { min: 1 }),
      title: parseString(obj['title'], 'title', { min: 1 }),
      content: parseString(obj['content'], 'content', { min: 1 }),
      version: parseOptional(obj['version'], (v) =>
        parseNumber(v, 'version', { int: true, min: 1 }),
      ),
      effectiveAt: coerceDate(obj['effectiveAt'], 'effectiveAt'),
    };
  },
);

/**
 * Schema for updating an existing legal document.
 */
export const updateLegalDocumentSchema: Schema<UpdateLegalDocument> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      title: parseOptional(obj['title'], (v) => parseString(v, 'title', { min: 1 })),
      content: parseOptional(obj['content'], (v) => parseString(v, 'content', { min: 1 })),
      effectiveAt: parseOptional(obj['effectiveAt'], (v) => coerceDate(v, 'effectiveAt')),
    };
  },
);

// ============================================================================
// User Agreement Schemas
// ============================================================================

/**
 * Full user agreement schema (matches DB SELECT result).
 */
export const userAgreementSchema: Schema<UserAgreement> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: userAgreementIdSchema.parse(obj['id']),
    userId: userIdSchema.parse(obj['userId']),
    documentId: legalDocumentIdSchema.parse(obj['documentId']),
    agreedAt: coerceDate(obj['agreedAt'], 'agreedAt'),
    ipAddress: parseNullable(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
  };
});

/**
 * Schema for creating a new user agreement.
 */
export const createUserAgreementSchema: Schema<CreateUserAgreement> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      userId: userIdSchema.parse(obj['userId']),
      documentId: legalDocumentIdSchema.parse(obj['documentId']),
      ipAddress: parseNullableOptional(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    };
  },
);

// ============================================================================
// Consent Log Schemas
// ============================================================================

/**
 * Full consent log schema (matches DB SELECT result).
 */
export const consentLogSchema: Schema<ConsentLog> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: consentLogIdSchema.parse(obj['id']),
    userId: userIdSchema.parse(obj['userId']),
    consentType: parseString(obj['consentType'], 'consentType', { min: 1 }),
    granted: parseBoolean(obj['granted'], 'granted'),
    ipAddress: parseNullable(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    userAgent: parseNullable(obj['userAgent'], (v) => parseString(v, 'userAgent')),
    metadata: parseRecord(obj['metadata'], 'metadata'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new consent log entry.
 */
export const createConsentLogSchema: Schema<CreateConsentLog> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    userId: userIdSchema.parse(obj['userId']),
    consentType: parseString(obj['consentType'], 'consentType', { min: 1 }),
    granted: parseBoolean(obj['granted'], 'granted'),
    ipAddress: parseNullableOptional(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    userAgent: parseNullableOptional(obj['userAgent'], (v) => parseString(v, 'userAgent')),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
  };
});

/**
 * Schema for updating consent preferences.
 */
export const updateConsentPreferencesRequestSchema: Schema<UpdateConsentPreferencesRequest> =
  createSchema((data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const analytics = parseOptional(obj['analytics'], (v) => parseBoolean(v, 'analytics'));
    const marketingEmail = parseOptional(obj['marketing_email'], (v) =>
      parseBoolean(v, 'marketing_email'),
    );
    const thirdPartySharing = parseOptional(obj['third_party_sharing'], (v) =>
      parseBoolean(v, 'third_party_sharing'),
    );
    const profiling = parseOptional(obj['profiling'], (v) => parseBoolean(v, 'profiling'));

    if (
      analytics === undefined &&
      marketingEmail === undefined &&
      thirdPartySharing === undefined &&
      profiling === undefined
    ) {
      throw new Error('At least one consent preference must be specified');
    }

    return {
      analytics,
      marketing_email: marketingEmail,
      third_party_sharing: thirdPartySharing,
      profiling,
    };
  });

// ============================================================================
// Data Export Request Schemas
// ============================================================================

/**
 * Validates a data export type string.
 *
 * @param value - Value to validate
 * @param label - Field label for error messages
 * @returns Validated DataExportType
 * @throws {Error} If value is not a valid data export type
 */
function parseDataExportType(value: unknown, label: string): DataExportType {
  const s = parseString(value, label);
  if (!DATA_EXPORT_TYPES.includes(s as DataExportType)) {
    throw new Error(`${label} must be one of: ${DATA_EXPORT_TYPES.join(', ')}`);
  }
  return s as DataExportType;
}

/**
 * Validates a data export status string.
 *
 * @param value - Value to validate
 * @param label - Field label for error messages
 * @returns Validated DataExportStatus
 * @throws {Error} If value is not a valid data export status
 */
function parseDataExportStatus(value: unknown, label: string): DataExportStatus {
  const s = parseString(value, label);
  if (!DATA_EXPORT_STATUSES.includes(s as DataExportStatus)) {
    throw new Error(`${label} must be one of: ${DATA_EXPORT_STATUSES.join(', ')}`);
  }
  return s as DataExportStatus;
}

/**
 * Full data export request schema (matches DB SELECT result).
 */
export const dataExportRequestSchema: Schema<DataExportRequest> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: parseString(obj['id'], 'id', { uuid: true }),
    userId: userIdSchema.parse(obj['userId']),
    type: parseDataExportType(obj['type'], 'type'),
    status: parseDataExportStatus(obj['status'], 'status'),
    format: parseString(obj['format'], 'format', { min: 1 }),
    downloadUrl: parseNullable(obj['downloadUrl'], (v) => parseString(v, 'downloadUrl')),
    expiresAt: parseNullable(obj['expiresAt'], (v) => coerceDate(v, 'expiresAt')),
    completedAt: parseNullable(obj['completedAt'], (v) => coerceDate(v, 'completedAt')),
    errorMessage: parseNullable(obj['errorMessage'], (v) => parseString(v, 'errorMessage')),
    metadata: parseRecord(obj['metadata'], 'metadata'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new data export request.
 */
export const createDataExportRequestSchema: Schema<CreateDataExportRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      userId: userIdSchema.parse(obj['userId']),
      type: parseDataExportType(obj['type'], 'type'),
      format: parseOptional(obj['format'], (v) => parseString(v, 'format', { min: 1 })),
      metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
    };
  },
);

// ============================================================================
// Response Schemas (for API contracts)
// ============================================================================

/** Current consent preferences per category */
export interface ConsentPreferencesResponse {
  analytics: boolean;
  marketing_email: boolean;
  third_party_sharing: boolean;
  profiling: boolean;
}

/** Response after requesting a data export */
export interface DataExportRequestedResponse {
  message: string;
  requestId: string;
  estimatedCompletionAt: string;
}

/** Generic compliance action response */
export interface ComplianceActionResponse {
  message: string;
}

export const consentPreferencesResponseSchema: Schema<ConsentPreferencesResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      analytics: parseBoolean(obj['analytics'], 'analytics'),
      marketing_email: parseBoolean(obj['marketing_email'], 'marketing_email'),
      third_party_sharing: parseBoolean(obj['third_party_sharing'], 'third_party_sharing'),
      profiling: parseBoolean(obj['profiling'], 'profiling'),
    };
  },
);

export const dataExportRequestedResponseSchema: Schema<DataExportRequestedResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      message: parseString(obj['message'], 'message'),
      requestId: parseString(obj['requestId'], 'requestId'),
      estimatedCompletionAt: parseString(obj['estimatedCompletionAt'], 'estimatedCompletionAt'),
    };
  },
);

export const complianceActionResponseSchema: Schema<ComplianceActionResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      message: parseString(obj['message'], 'message'),
    };
  },
);
