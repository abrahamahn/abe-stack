// main/server/db/src/schema/auth.ts
/**
 * Auth Schema Types
 *
 * Explicit TypeScript interfaces for authentication-related tables:
 * - auth_tokens (unified: password_reset, email_verification, email_change,
 *                email_change_revert, magic_link)
 * - login_attempts
 * - security_events
 * - totp_backup_codes
 */

import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  type SecurityEventType,
  type SecuritySeverity,
} from '@bslt/shared';

// Re-export shared constants for consumers that import from schema
export { SECURITY_EVENT_TYPES, SECURITY_SEVERITIES };
export type { SecurityEventType, SecuritySeverity };

/** @deprecated Use `SecuritySeverity` from `@bslt/shared` instead */
export type SecurityEventSeverity = SecuritySeverity;

// ============================================================================
// Table Names
// ============================================================================

export const AUTH_TOKENS_TABLE = 'auth_tokens';
export const LOGIN_ATTEMPTS_TABLE = 'login_attempts';
export const SECURITY_EVENTS_TABLE = 'security_events';
export const TOTP_BACKUP_CODES_TABLE = 'totp_backup_codes';
export const SMS_VERIFICATION_CODES_TABLE = 'sms_verification_codes';

// ============================================================================
// Auth Tokens (unified table for all short-lived one-time tokens)
// ============================================================================

/**
 * Discriminator for which token flow this row belongs to.
 * Stored in the `type` column with a CHECK constraint.
 */
export type AuthTokenType =
  | 'password_reset'
  | 'email_verification'
  | 'email_change'
  | 'email_change_revert'
  | 'magic_link';

/**
 * Auth token record (SELECT result).
 *
 * Unified record for: password_reset, email_verification, email_change,
 * email_change_revert, magic_link tokens.
 *
 * - `userId` is NULL for magic_link tokens before a user account exists.
 * - `email` carries the target for magic_link and is NULL for other types.
 * - `metadata` holds per-type sparse fields (e.g. newEmail, oldEmail).
 * - `ipAddress` / `userAgent` populated for magic_link rate-limiting.
 *
 * @see 0000_users.sql
 */
export interface AuthToken {
  id: string;
  type: AuthTokenType;
  userId: string | null;
  email: string | null;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Fields for inserting a new auth token (INSERT).
 */
export interface NewAuthToken {
  id?: string;
  type: AuthTokenType;
  userId?: string | null;
  email?: string | null;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export const AUTH_TOKEN_COLUMNS = {
  id: 'id',
  type: 'type',
  userId: 'user_id',
  email: 'email',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  usedAt: 'used_at',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Login Attempts
// ============================================================================

/**
 * Login attempt record (SELECT result)
 * Used for rate limiting and account lockout detection.
 */
export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
}

/**
 * Data for creating a new login attempt (INSERT)
 */
export interface NewLoginAttempt {
  id?: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
  createdAt?: Date;
}

export const LOGIN_ATTEMPT_COLUMNS = {
  id: 'id',
  email: 'email',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  success: 'success',
  failureReason: 'failure_reason',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Security Events
// ============================================================================

// SecurityEventType and SecuritySeverity imported from @bslt/shared above

/**
 * Security event record (SELECT result)
 * Tracks critical security events for audit trail and monitoring.
 */
export interface SecurityEvent {
  id: string;
  userId: string | null;
  email: string | null;
  eventType: string;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Data for creating a new security event (INSERT)
 */
export interface NewSecurityEvent {
  id?: string;
  userId?: string | null;
  email?: string | null;
  eventType: string;
  severity: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

export const SECURITY_EVENT_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  email: 'email',
  eventType: 'event_type',
  severity: 'severity',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;

// ============================================================================
// TOTP Backup Codes
// ============================================================================

/**
 * TOTP backup code record (SELECT result).
 * Each user has up to 10 single-use backup codes for 2FA recovery.
 * Append-only — codes are consumed by setting `usedAt`, never updated otherwise.
 *
 * @see 0001_auth_extensions.sql
 */
export interface TotpBackupCode {
  id: string;
  userId: string;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new TOTP backup code (INSERT).
 */
export interface NewTotpBackupCode {
  id?: string;
  userId: string;
  codeHash: string;
  usedAt?: Date | null;
  createdAt?: Date;
}

export const TOTP_BACKUP_CODE_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  codeHash: 'code_hash',
  usedAt: 'used_at',
  createdAt: 'created_at',
} as const;

// ============================================================================
// WebAuthn Credentials
// ============================================================================

export const WEBAUTHN_CREDENTIALS_TABLE = 'webauthn_credentials';

/**
 * WebAuthn credential record (SELECT result).
 * Stores FIDO2/WebAuthn public key credentials for passkey authentication.
 *
 * @see 0001_auth_extensions.sql
 */
export interface WebauthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
  deviceType: string | null;
  backedUp: boolean;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/**
 * Fields for inserting a new WebAuthn credential (INSERT).
 */
export interface NewWebauthnCredential {
  id?: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter?: number;
  transports?: string | null;
  deviceType?: string | null;
  backedUp?: boolean;
  name?: string;
  createdAt?: Date;
  lastUsedAt?: Date | null;
}

/**
 * Fields for updating a WebAuthn credential (UPDATE).
 */
export interface UpdateWebauthnCredential {
  counter?: number;
  name?: string;
  lastUsedAt?: Date | null;
}

export const WEBAUTHN_CREDENTIAL_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  credentialId: 'credential_id',
  publicKey: 'public_key',
  counter: 'counter',
  transports: 'transports',
  deviceType: 'device_type',
  backedUp: 'backed_up',
  name: 'name',
  createdAt: 'created_at',
  lastUsedAt: 'last_used_at',
} as const;

// ============================================================================
// SMS Verification Codes
// ============================================================================

/**
 * SMS verification code record (SELECT result).
 * Stores phone verification codes for 2FA.
 *
 * @see 0023_sms_verification.sql
 */
export interface SmsVerificationCode {
  id: string;
  userId: string;
  phone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

/**
 * Fields for inserting a new SMS verification code (INSERT).
 */
export interface NewSmsVerificationCode {
  id?: string;
  userId: string;
  phone: string;
  code: string;
  expiresAt: Date;
  verified?: boolean;
  attempts?: number;
  createdAt?: Date;
}

/**
 * Fields for updating an SMS verification code (UPDATE).
 */
export interface UpdateSmsVerificationCode {
  verified?: boolean;
  attempts?: number;
}

export const SMS_VERIFICATION_CODE_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  phone: 'phone',
  code: 'code',
  expiresAt: 'expires_at',
  verified: 'verified',
  attempts: 'attempts',
  createdAt: 'created_at',
} as const;
