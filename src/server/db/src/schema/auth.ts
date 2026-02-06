// backend/db/src/schema/auth.ts
/**
 * Auth Schema Types
 *
 * Explicit TypeScript interfaces for authentication-related tables:
 * - refresh_token_families
 * - login_attempts
 * - password_reset_tokens
 * - email_verification_tokens
 * - security_events
 */

// ============================================================================
// Table Names
// ============================================================================

export const REFRESH_TOKEN_FAMILIES_TABLE = 'refresh_token_families';
export const LOGIN_ATTEMPTS_TABLE = 'login_attempts';
export const PASSWORD_RESET_TOKENS_TABLE = 'password_reset_tokens';
export const EMAIL_VERIFICATION_TOKENS_TABLE = 'email_verification_tokens';
export const SECURITY_EVENTS_TABLE = 'security_events';

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
 * Security event types
 */
export type SecurityEventType =
  | 'token_reuse'
  | 'account_locked'
  | 'account_unlocked'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verification_sent'
  | 'email_verified'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'suspicious_activity';

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
  metadata: string | null;
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
  metadata?: string | null;
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
