// main/server/core/src/consent/types.ts
/**
 * Consent Module Types
 *
 * Narrow dependency interfaces for the consent package.
 * These interfaces decouple the consent logic from concrete server
 * implementations, keeping the package framework-agnostic.
 */

import type { AuditEventRepository, ConsentRecordRepository } from '../../../db/src';
import type { BaseContext, Logger, RequestContext } from '@bslt/shared';

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for consent handlers.
 *
 * Extends `BaseContext` with consent-specific repositories.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 */
export interface ConsentAppContext extends BaseContext {
  readonly repos: {
    readonly consentRecords: ConsentRecordRepository;
    readonly auditEvents?: AuditEventRepository;
  };
  readonly log: Logger;
}

/**
 * Request type used by consent handlers.
 */
export type ConsentRequest = RequestContext;

// ============================================================================
// Consent Preferences
// ============================================================================

/**
 * User's current consent preferences.
 * Derived from the latest consent log entries per consent type.
 */
export interface ConsentPreferences {
  readonly [key: string]: boolean | null;
  readonly analytics: boolean | null;
  readonly marketing_email: boolean | null;
  readonly third_party_sharing: boolean | null;
  readonly profiling: boolean | null;
}

/**
 * Input for updating consent preferences.
 * Only specified fields are updated; omitted fields are unchanged.
 */
export interface UpdateConsentInput {
  readonly analytics?: boolean;
  readonly marketing_email?: boolean;
  readonly third_party_sharing?: boolean;
  readonly profiling?: boolean;
}
