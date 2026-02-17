// main/shared/src/core/constants/compliance.ts

/**
 * @file Compliance Constants
 * @description Privacy, retention, deletion, consent, and legal document constants.
 * @module Core/Constants/Compliance
 */

// ============================================================================
// Deletion & Retention
// ============================================================================

export const DELETION_STATES = [
  'active',
  'soft_deleted',
  'pending_hard_delete',
  'hard_deleted',
] as const;

export const RETENTION_PERIODS = {
  PII_GRACE_DAYS: 30,
  HARD_DELETE_DAYS: 30,
  AUDIT_DAYS: 90,
  LOGIN_ATTEMPTS_DAYS: 90,
  SESSIONS_DAYS: 30,
  HARD_BAN_GRACE_DAYS: 7,
} as const;

export const DEFAULT_GRACE_PERIOD_DAYS = 30;
export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

// ============================================================================
// Consent & Data Export
// ============================================================================

export const CONSENT_TYPES = [
  'marketing_email',
  'analytics',
  'third_party_sharing',
  'profiling',
] as const;

export const DATA_EXPORT_TYPES = ['export', 'deletion'] as const;

export const DATA_EXPORT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'canceled',
] as const;

// ============================================================================
// Legal Documents
// ============================================================================

export const DOCUMENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'dpa',
] as const;
