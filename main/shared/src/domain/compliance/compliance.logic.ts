// main/shared/src/domain/compliance/compliance.logic.ts

/**
 * @file Compliance Domain Logic
 * @description Pure functions for legal document acceptance and consent evaluation.
 * @module Domain/Compliance
 */

import type { ConsentLog, LegalDocument, UserAgreement } from './compliance.schemas';

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
  agreement: Pick<UserAgreement, 'documentId'>,
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
 * Checks whether a consent log entry represents a grant.
 *
 * @param log - The consent log entry
 * @returns `true` if consent was granted
 * @complexity O(1)
 */
export function isConsentGranted(log: Pick<ConsentLog, 'granted'>): boolean {
  return log.granted;
}

/**
 * Determines the effective consent state from a chronologically-ordered
 * list of consent log entries. The last entry wins.
 *
 * @param logs - Consent log entries sorted by `createdAt` ascending
 * @returns `true` if effectively consented, `false` if revoked, `null` if no entries
 * @complexity O(n) where n = number of log entries
 */
export function getEffectiveConsent(
  logs: ReadonlyArray<Pick<ConsentLog, 'granted'>>,
): boolean | null {
  if (logs.length === 0) {
    return null;
  }
  // Last entry in chronological order determines current state
  const lastEntry = logs[logs.length - 1];
  if (lastEntry === undefined) {
    return null;
  }
  return lastEntry.granted;
}
