/**
 * Security Events
 *
 * Functions for logging security-critical events to the database
 * and sending security alert emails.
 *
 * @module security/events
 */
import type { AuthEmailService, AuthEmailTemplates } from '../types';
import type { DbClient } from '@abe-stack/db';
/**
 * Security event types tracked by the auth module.
 */
export type SecurityEventType = 'token_reuse_detected' | 'token_family_revoked' | 'account_locked' | 'account_unlocked' | 'suspicious_login' | 'password_changed' | 'email_changed' | 'magic_link_requested' | 'magic_link_verified' | 'magic_link_failed' | 'oauth_login_success' | 'oauth_login_failure' | 'oauth_account_created' | 'oauth_link_success' | 'oauth_link_failure' | 'oauth_unlink_success' | 'oauth_unlink_failure';
/**
 * Security event severity levels.
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';
/**
 * Security event metadata structure.
 */
export interface SecurityEventMetadata {
    /** Token family ID (for token-related events) */
    familyId?: string;
    /** Token count in the family */
    tokenCount?: number;
    /** Reason for the event */
    reason?: string;
    /** Admin user ID (for admin actions) */
    adminUserId?: string;
    /** Previous email address (for email change events) */
    previousEmail?: string;
    /** Additional metadata */
    [key: string]: unknown;
}
/**
 * Parameters for logging a security event.
 */
export interface LogSecurityEventParams {
    /** Database client */
    db: DbClient;
    /** User ID (if known) */
    userId?: string | undefined;
    /** User email (if known) */
    email?: string | undefined;
    /** Type of security event */
    eventType: SecurityEventType;
    /** Severity level */
    severity: SecurityEventSeverity;
    /** Client IP address */
    ipAddress?: string | undefined;
    /** Client user agent */
    userAgent?: string | undefined;
    /** Additional event metadata */
    metadata?: SecurityEventMetadata | undefined;
}
/**
 * Log a security event to the database.
 * Creates an audit trail for security-critical actions.
 *
 * @param params - Security event parameters
 * @returns Promise that resolves when the event is logged
 * @throws When database insertion fails
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * await logSecurityEvent({
 *   db,
 *   userId: user.id,
 *   email: user.email,
 *   eventType: 'token_reuse_detected',
 *   severity: 'critical',
 *   ipAddress: '192.168.1.1',
 *   metadata: { familyId: 'xxx', reason: 'Token used after rotation' }
 * });
 * ```
 */
export declare function logSecurityEvent(params: LogSecurityEventParams): Promise<void>;
/**
 * Log a token reuse detection event.
 * This is a critical security event that indicates a potential account compromise.
 *
 * @param db - Database client
 * @param userId - User ID whose token was reused
 * @param email - User email
 * @param familyId - Token family ID where reuse was detected
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logTokenReuseEvent(db: DbClient, userId: string, email: string, familyId: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a token family revocation event.
 * Called when an entire token family is revoked due to security concerns.
 *
 * @param db - Database client
 * @param userId - User ID whose tokens were revoked
 * @param email - User email
 * @param familyId - Token family ID that was revoked
 * @param reason - Reason for revocation
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logTokenFamilyRevokedEvent(db: DbClient, userId: string, email: string, familyId: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log an account lockout event.
 * Called when an account is locked due to too many failed login attempts.
 *
 * @param db - Database client
 * @param email - User email
 * @param failedAttempts - Number of failed attempts
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logAccountLockedEvent(db: DbClient, email: string, failedAttempts: number, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log an account unlock event.
 * Called when an admin manually unlocks an account.
 *
 * @param db - Database client
 * @param userId - User ID that was unlocked
 * @param email - User email
 * @param adminUserId - Admin who performed the unlock
 * @param ipAddress - Admin's IP address
 * @param userAgent - Admin's user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logAccountUnlockedEvent(db: DbClient, userId: string, email: string, adminUserId: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Get recent security events for a user.
 * Useful for displaying security activity to users.
 *
 * @param db - Database client
 * @param userId - User ID to fetch events for
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Array of security events
 * @complexity O(n) where n is the number of returned events
 */
export declare function getUserSecurityEvents(db: DbClient, userId: string, limit?: number): Promise<Array<{
    id: string;
    eventType: string;
    severity: string;
    createdAt: Date;
}>>;
/**
 * Get security event metrics for monitoring.
 * Returns counts of events by type and severity.
 *
 * @param db - Database client
 * @param since - Start date for metrics (default: 24 hours ago)
 * @returns Event counts by category
 * @complexity O(n) where n is the total events in the time window
 */
export declare function getSecurityEventMetrics(db: DbClient, since?: Date): Promise<{
    tokenReuseCount: number;
    accountLockedCount: number;
    criticalEventCount: number;
    totalEventCount: number;
}>;
/**
 * Parameters for sending a token reuse alert email.
 */
export interface SendTokenReuseAlertParams {
    /** User email to alert */
    email: string;
    /** IP address of the suspicious request */
    ipAddress: string;
    /** User agent of the suspicious request */
    userAgent: string | undefined;
    /** Timestamp of the detection */
    timestamp: Date;
}
/**
 * Send a security alert email when token reuse is detected.
 *
 * This alerts the user that their account may have been compromised
 * and that all their sessions have been terminated as a precaution.
 *
 * @param emailService - Email service for sending the alert
 * @param emailTemplates - Email templates for rendering the alert
 * @param params - Alert parameters
 * @returns Promise that resolves when email is sent
 * @throws When email sending fails
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * await sendTokenReuseAlert(emailService, emailTemplates, {
 *   email: 'user@example.com',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   timestamp: new Date(),
 * });
 * ```
 */
export declare function sendTokenReuseAlert(emailService: AuthEmailService, emailTemplates: AuthEmailTemplates, params: SendTokenReuseAlertParams): Promise<void>;
/**
 * Log a magic link request event.
 *
 * @param db - Database client
 * @param email - Email the magic link was sent to
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logMagicLinkRequestEvent(db: DbClient, email: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a successful magic link verification event.
 *
 * @param db - Database client
 * @param userId - Authenticated user ID
 * @param email - User email
 * @param isNewUser - Whether this created a new user account
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logMagicLinkVerifiedEvent(db: DbClient, userId: string, email: string, isNewUser: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a failed magic link verification event.
 *
 * @param db - Database client
 * @param email - Email (if known)
 * @param reason - Reason for failure
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logMagicLinkFailedEvent(db: DbClient, email: string | undefined, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a successful OAuth login event.
 *
 * @param db - Database client
 * @param userId - Authenticated user ID
 * @param email - User email
 * @param provider - OAuth provider name
 * @param isNewUser - Whether this created a new user account
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthLoginSuccessEvent(db: DbClient, userId: string, email: string, provider: string, isNewUser: boolean, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a failed OAuth login/callback event.
 *
 * @param db - Database client
 * @param provider - OAuth provider name
 * @param reason - Reason for failure
 * @param email - User email (if known)
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthLoginFailureEvent(db: DbClient, provider: string, reason: string, email?: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a successful OAuth account link event.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param provider - OAuth provider name
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthLinkSuccessEvent(db: DbClient, userId: string, email: string, provider: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a failed OAuth account link event.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param provider - OAuth provider name
 * @param reason - Reason for failure
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthLinkFailureEvent(db: DbClient, userId: string, email: string, provider: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a successful OAuth account unlink event.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param provider - OAuth provider name
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthUnlinkSuccessEvent(db: DbClient, userId: string, email: string, provider: string, ipAddress?: string, userAgent?: string): Promise<void>;
/**
 * Log a failed OAuth account unlink event.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param provider - OAuth provider name
 * @param reason - Reason for failure
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Promise that resolves when event is logged
 * @complexity O(1)
 */
export declare function logOAuthUnlinkFailureEvent(db: DbClient, userId: string, email: string, provider: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
//# sourceMappingURL=events.d.ts.map