// main/server/core/src/consent/service.ts
/**
 * Consent Service
 *
 * Pure business logic for consent management operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import { CONSENT_TYPES } from '@bslt/shared';

import type { ConsentPreferences, UpdateConsentInput } from './types';
import type { ConsentRecord as DbConsentRecord, ConsentRecordRepository } from '../../../db/src';

// ============================================================================
// Consent Operations
// ============================================================================

/**
 * Get the current consent preferences for a user.
 *
 * Queries the latest consent log entry for each consent type to
 * determine the effective consent state.
 *
 * @param consentLogs - Consent log repository
 * @param userId - User identifier
 * @returns Current consent preferences with null for unset types
 * @complexity O(k) where k is the number of consent types
 */
export async function getUserConsent(
  consentRecords: ConsentRecordRepository,
  userId: string,
): Promise<ConsentPreferences> {
  const preferences: Record<string, boolean | null> = {};

  for (const consentType of CONSENT_TYPES) {
    const latest = await consentRecords.findLatestConsentByUserAndType(userId, consentType);
    preferences[consentType] = latest !== null ? latest.granted : null;
  }

  return preferences as ConsentPreferences;
}

/**
 * Update consent preferences for a user.
 *
 * Creates new consent log entries for each changed preference.
 * Consent is append-only -- each update creates audit trail entries
 * with timestamps for compliance.
 *
 * @param consentLogs - Consent log repository
 * @param userId - User identifier
 * @param preferences - Consent preferences to update
 * @param ipAddress - Client IP address for audit trail
 * @param userAgent - Client user agent for audit trail
 * @returns Array of created consent log entries
 * @complexity O(k) where k is the number of changed preferences
 */
export async function updateUserConsent(
  consentRecords: ConsentRecordRepository,
  userId: string,
  preferences: UpdateConsentInput,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<DbConsentRecord[]> {
  const entries: DbConsentRecord[] = [];

  const updates: Array<{ type: string; granted: boolean }> = [];

  if (preferences.analytics !== undefined) {
    updates.push({ type: 'analytics', granted: preferences.analytics });
  }
  if (preferences.marketing_email !== undefined) {
    updates.push({ type: 'marketing_email', granted: preferences.marketing_email });
  }
  if (preferences.third_party_sharing !== undefined) {
    updates.push({ type: 'third_party_sharing', granted: preferences.third_party_sharing });
  }
  if (preferences.profiling !== undefined) {
    updates.push({ type: 'profiling', granted: preferences.profiling });
  }

  for (const update of updates) {
    const entry = await consentRecords.recordConsent({
      userId,
      consentType: update.type,
      granted: update.granted,
      ipAddress,
      userAgent,
      metadata: { updatedAt: new Date().toISOString() },
    });
    entries.push(entry);
  }

  return entries;
}
