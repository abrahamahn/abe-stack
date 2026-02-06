// packages/shared/src/domain/compliance/compliance.schemas.ts

/**
 * @file Compliance Domain Schemas
 * @description Schemas for legal documents, user agreements, and consent logs.
 * @module Domain/Compliance
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
} from '../../contracts/schema';
import {
  consentLogIdSchema,
  legalDocumentIdSchema,
  userAgreementIdSchema,
  userIdSchema,
} from '../../types/ids';

import type { Schema } from '../../contracts/types';
import type { ConsentLogId, LegalDocumentId, UserAgreementId, UserId } from '../../types/ids';

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
