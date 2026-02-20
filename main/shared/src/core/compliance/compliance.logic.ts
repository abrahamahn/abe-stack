// main/shared/src/core/compliance/compliance.logic.ts

/**
 * @file Compliance Logic
 * @description Pure functions for legal document acceptance and consent evaluation.
 * @module Core/Compliance
 */

import type { ConsentRecord, LegalDocument } from './compliance.schemas';

// ============================================================================
// Document Acceptance
// ============================================================================

/**
 * Determines whether a user needs to re-accept a legal document.
 * Returns `true` when the latest document version is newer than
 * the version the user agreed to.
 *
 * @param agreement - The user's existing agreement record
 * @param latestDoc - The latest version of the legal document
 * @param agreedDoc - The document version the user originally agreed to
 * @returns `true` if the user needs to accept the newer version
 * @complexity O(1)
 */
export function needsReacceptance(
  agreement: Pick<ConsentRecord, 'documentId'>,
  latestDoc: Pick<LegalDocument, 'id' | 'version'>,
  agreedDoc: Pick<LegalDocument, 'id' | 'version'>,
): boolean {
  // If the agreement points to the latest doc, no re-acceptance needed
  if (agreement.documentId === latestDoc.id) {
    return false;
  }
  // If the latest version is higher than the agreed version, re-acceptance needed
  return latestDoc.version > agreedDoc.version;
}

// ============================================================================
// Consent Evaluation
// ============================================================================

/**
 * Checks whether a consent record represents a granted preference.
 *
 * @param record - The consent record
 * @returns `true` if consent was explicitly granted
 * @complexity O(1)
 */
export function isConsentGranted(record: Pick<ConsentRecord, 'granted'>): boolean {
  return record.granted === true;
}

/**
 * Determines the effective consent state from a chronologically-ordered
 * list of consent records. The last entry wins.
 *
 * @param records - Consent records sorted by `createdAt` ascending
 * @returns `true` if effectively consented, `false` if revoked, `null` if no entries
 * @complexity O(n) where n = number of records
 */
export function getEffectiveConsent(
  records: ReadonlyArray<Pick<ConsentRecord, 'granted'>>,
): boolean | null {
  if (records.length === 0) {
    return null;
  }
  // Last entry in chronological order determines current state
  const lastEntry = records[records.length - 1];
  if (lastEntry === undefined) {
    return null;
  }
  return lastEntry.granted;
}
