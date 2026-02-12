// src/server/db/src/schema/auth.ts
/**
 * Auth Schema Types
 *
 * Explicit TypeScript interfaces for authentication-related tables:
 * - refresh_token_families
 * - login_attempts
 * - password_reset_tokens
 * - email_verification_tokens
 * - security_events
 * - totp_backup_codes
 * - email_change_tokens
 */

// ============================================================================
// Table Names
// ============================================================================

export const REFRESH_TOKEN_FAMILIES_TABLE = 'refresh_token_families';
export const LOGIN_ATTEMPTS_TABLE = 'login_attempts';
export const PASSWORD_RESET_TOKENS_TABLE = 'password_reset_tokens';
export const EMAIL_VERIFICATION_TOKENS_TABLE = 'email_verification_tokens';
export const SECURITY_EVENTS_TABLE = 'security_events';
export const TOTP_BACKUP_CODES_TABLE = 'totp_backup_codes';
export const EMAIL_CHANGE_TOKENS_TABLE = 'email_change_tokens';
export const EMAIL_CHANGE_REVERT_TOKENS_TABLE = 'email_change_revert_tokens';

// ============================================================================
// Refresh Token Families
// ============================================================================

/**
 * Refresh token family record (SELECT result)
 * Used for reuse detection - when a token is reused after rotation,
 * the entire family is revoked.
 */
export interface RefreshTokenFamily {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
}

/**
 * Data for creating a new refresh token family (INSERT)
 */
export interface NewRefreshTokenFamily {
  id?: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  revokedAt?: Date | null;
  revokeReason?: string | null;
}

export const REFRESH_TOKEN_FAMILY_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  createdAt: 'created_at',
  revokedAt: 'revoked_at',
  revokeReason: 'revoke_reason',
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
// Password Reset Tokens
// ============================================================================

/**
 * Password reset token record (SELECT result)
 */
export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Data for creating a new password reset token (INSERT)
 */
export interface NewPasswordResetToken {
  id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
}

export const PASSWORD_RESET_TOKEN_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  usedAt: 'used_at',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Email Verification Tokens
// ============================================================================

/**
 * Email verification token record (SELECT result)
 */
export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Data for creating a new email verification token (INSERT)
 */
export interface NewEmailVerificationToken {
  id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
}

export const EMAIL_VERIFICATION_TOKEN_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  usedAt: 'used_at',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Security Events
// ============================================================================

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event types.
 *
 * The DB column is TEXT (no CHECK constraint), so any string is accepted.
 * This union defines all known event types for type-safety.
 *
 * Legacy types (pre-0009): token_reuse, suspicious_activity, login_success,
 * login_failure, logout, password_reset_requested, password_reset_completed,
 * email_verification_sent, email_verified.
 *
 * Current types (post-0009): token_reuse_detected, suspicious_login, plus
 * magic_link_*, oauth_*, and email_changed events.
 *
 * @see src/server/core/src/auth/security/events.ts — Event emitters
 * @see src/shared/src/contracts/security.ts — API contract
 */
export type SecurityEventType =
  // Token events
  | 'token_reuse'
  | 'token_reuse_detected'
  | 'token_family_revoked'
  // Account lifecycle
  | 'account_locked'
  | 'account_unlocked'
  // Password events
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  // Email events
  | 'email_verification_sent'
  | 'email_verified'
  | 'email_changed'
  // Login/session events
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'suspicious_activity'
  | 'suspicious_login'
  // Magic link events
  | 'magic_link_requested'
  | 'magic_link_verified'
  | 'magic_link_failed'
  // OAuth events
  | 'oauth_login_success'
  | 'oauth_login_failure'
  | 'oauth_account_created'
  | 'oauth_link_success'
  | 'oauth_link_failure'
  | 'oauth_unlink_success'
  | 'oauth_unlink_failure';

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
 * @see 0009_auth_extensions.sql
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
// Email Change Tokens
// ============================================================================

/**
 * Email change token record (SELECT result).
 * Used for the email change flow with verification.
 * Append-only — tokens are consumed by setting `usedAt`, never updated otherwise.
 *
 * @see 0009_auth_extensions.sql
 */
export interface EmailChangeToken {
  id: string;
  userId: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new email change token (INSERT).
 */
export interface NewEmailChangeToken {
  id?: string;
  userId: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
}

export const EMAIL_CHANGE_TOKEN_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  newEmail: 'new_email',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
  usedAt: 'used_at',
  createdAt: 'created_at',
} as const;

// ============================================================================
// Email Change Revert Tokens
// ============================================================================

/**
 * Email change revert token record (SELECT result).
 * Used for "This wasn't me" reversion flow.
 */
export interface EmailChangeRevertToken {
  id: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new email change revert token (INSERT).
 */
export interface NewEmailChangeRevertToken {
  id?: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt?: Date;
}

export const EMAIL_CHANGE_REVERT_TOKEN_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  oldEmail: 'old_email',
  newEmail: 'new_email',
  tokenHash: 'token_hash',
  expiresAt: 'expires_at',
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
 * @see 0027_webauthn_credentials.sql
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
