// main/server/core/src/legal/service.ts
/**
 * Legal Service
 *
 * Pure business logic for legal document and user agreement operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import type {
  LegalDocument as DbLegalDocument,
  UserAgreement as DbUserAgreement,
  LegalDocumentRepository,
  NewLegalDocument,
  UserAgreementRepository,
} from '../../../db/src';

// ============================================================================
// Legal Document Operations
// ============================================================================

/**
 * Get all current (latest version of each type) legal documents.
 *
 * @param legalDocs - Legal document repository
 * @returns Array of the latest version of each document type
 * @complexity O(n) where n is the number of document types
 */
export async function getCurrentLegalDocuments(
  legalDocs: LegalDocumentRepository,
): Promise<DbLegalDocument[]> {
  return legalDocs.findAllLatest();
}

/**
 * Get all agreements for a user.
 *
 * @param userAgreements - User agreement repository
 * @param userId - User identifier
 * @returns Array of agreements, most recent first
 * @complexity O(n) where n is the number of agreements
 */
export async function getUserAgreements(
  userAgreements: UserAgreementRepository,
  userId: string,
): Promise<DbUserAgreement[]> {
  return userAgreements.findByUserId(userId);
}

/**
 * Publish a new version of a legal document.
 *
 * Determines the next version number automatically by checking
 * existing versions of the same document type.
 *
 * @param legalDocs - Legal document repository
 * @param type - Document type (e.g., 'terms_of_service', 'privacy_policy')
 * @param title - Document title
 * @param content - Document content (markdown or HTML)
 * @param effectiveAt - When the document becomes effective
 * @returns The created legal document
 * @throws Error if insert fails
 * @complexity O(1) - version lookup + insert
 */
export async function publishLegalDocument(
  legalDocs: LegalDocumentRepository,
  type: string,
  title: string,
  content: string,
  effectiveAt: Date,
): Promise<DbLegalDocument> {
  // Determine next version number
  const latest = await legalDocs.findLatestByType(type);
  const nextVersion = latest !== null ? latest.version + 1 : 1;

  const data: NewLegalDocument = {
    type,
    title,
    content,
    version: nextVersion,
    effectiveAt,
  };

  return legalDocs.create(data);
}
