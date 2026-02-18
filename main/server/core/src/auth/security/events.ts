// main/server/core/src/auth/security/events.ts
/**
 * Security Events
 *
 * Functions for logging security-critical events to the database
 * and sending security alert emails.
 *
 * @module security/events
 */

import { MS_PER_DAY } from '@bslt/shared';

import { eq, gte, insert, SECURITY_EVENTS_TABLE, select } from '../../../../db/src';

import type { DbClient } from '../../../../db/src';
import type { AuthEmailService, AuthEmailTemplates } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Security event types tracked by the auth module.
 */
export type SecurityEventType =
  | 'token_reuse_detected'
  | 'token_family_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'suspicious_login'
  | 'new_device_login'
  | 'device_trusted'
  | 'device_revoked'
  | 'password_changed'
  | 'email_changed'
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

// ============================================================================
// Core Event Logging
// ============================================================================

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
export async function logSecurityEvent(params: LogSecurityEventParams): Promise<void> {
  const { db, userId, email, eventType, severity, ipAddress, userAgent, metadata } = params;

  await db.execute(
    insert(SECURITY_EVENTS_TABLE)
      .values({
        user_id: userId != null && userId !== '' ? userId : null,
        email: email != null && email !== '' ? email : null,
        event_type: eventType,
        severity,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : null,
        metadata: metadata != null ? JSON.stringify(metadata) : null,
      })
      .toSql(),
  );
}

// ============================================================================
// Specific Event Loggers
// ============================================================================

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
export async function logTokenReuseEvent(
  db: DbClient,
  userId: string,
  email: string,
  familyId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'token_reuse_detected',
    severity: 'critical',
    ipAddress,
    userAgent,
    metadata: {
      familyId,
      reason: 'Refresh token used after rotation',
    },
  });
}

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
export async function logTokenFamilyRevokedEvent(
  db: DbClient,
  userId: string,
  email: string,
  familyId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'token_family_revoked',
    severity: 'high',
    ipAddress,
    userAgent,
    metadata: {
      familyId,
      reason,
    },
  });
}

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
export async function logAccountLockedEvent(
  db: DbClient,
  email: string,
  failedAttempts: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    email,
    eventType: 'account_locked',
    severity: 'medium',
    ipAddress,
    userAgent,
    metadata: {
      failedAttempts,
      reason: 'Too many failed login attempts',
    },
  });
}

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
export async function logAccountUnlockedEvent(
  db: DbClient,
  userId: string,
  email: string,
  adminUserId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'account_unlocked',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      adminUserId,
      reason: 'Manually unlocked by admin',
    },
  });
}

/**
 * Flag a suspicious login (e.g., new country/region, unusual time).
 * Creates a high-severity security event for review.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param reason - Description of why this login is suspicious
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @complexity O(1)
 */
export async function flagSuspiciousLogin(
  db: DbClient,
  userId: string,
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'suspicious_login',
    severity: 'high',
    ipAddress,
    userAgent,
    metadata: { reason },
  });
}

/**
 * Log a new device login event.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param email - User email
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @complexity O(1)
 */
export async function logNewDeviceLogin(
  db: DbClient,
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'new_device_login',
    severity: 'medium',
    ipAddress,
    userAgent,
    metadata: { reason: 'Login from unrecognized device' },
  });
}

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
export async function getUserSecurityEvents(
  db: DbClient,
  userId: string,
  limit: number = 50,
): Promise<Array<{ id: string; eventType: string; severity: string; createdAt: Date }>> {
  type EventRow = Record<string, unknown> & {
    id: string;
    event_type: string;
    severity: string;
    created_at: Date;
  };
  const rows = await db.query<EventRow>(
    select(SECURITY_EVENTS_TABLE)
      .columns('id', 'event_type', 'severity', 'created_at')
      .where(eq('user_id', userId))
      .orderBy('created_at', 'desc')
      .limit(limit)
      .toSql(),
  );

  return rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    severity: row.severity,
    createdAt: row.created_at,
  }));
}

/**
 * Get security event metrics for monitoring.
 * Returns counts of events by type and severity.
 *
 * @param db - Database client
 * @param since - Start date for metrics (default: 24 hours ago)
 * @returns Event counts by category
 * @complexity O(n) where n is the total events in the time window
 */
export async function getSecurityEventMetrics(
  db: DbClient,
  since: Date = new Date(Date.now() - MS_PER_DAY),
): Promise<{
  tokenReuseCount: number;
  accountLockedCount: number;
  criticalEventCount: number;
  totalEventCount: number;
}> {
  type EventRow = Record<string, unknown> & {
    event_type: string;
    severity: string;
  };
  const events = await db.query<EventRow>(
    select(SECURITY_EVENTS_TABLE)
      .columns('event_type', 'severity')
      .where(gte('created_at', since))
      .toSql(),
  );

  const tokenReuseCount = events.filter((e) => e.event_type === 'token_reuse_detected').length;
  const accountLockedCount = events.filter((e) => e.event_type === 'account_locked').length;
  const criticalEventCount = events.filter((e) => e.severity === 'critical').length;

  return {
    tokenReuseCount,
    accountLockedCount,
    criticalEventCount,
    totalEventCount: events.length,
  };
}

// ============================================================================
// Token Reuse Alert
// ============================================================================

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
export async function sendTokenReuseAlert(
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  params: SendTokenReuseAlertParams,
): Promise<void> {
  const { email, ipAddress, userAgent, timestamp } = params;

  const template = emailTemplates.tokenReuseAlert(ipAddress, userAgent ?? 'Unknown', timestamp);

  await emailService.send({
    to: email,
    subject: template.subject,
    ...(template.html !== undefined && { html: template.html }),
    ...(template.text !== undefined && { text: template.text }),
  });
}

// ============================================================================
// "Was This You?" Alert Emails
// ============================================================================

/**
 * Parameters for sending a "Was This You?" security alert.
 */
export interface SendSecurityAlertParams {
  /** User email to alert */
  email: string;
  /** IP address of the request */
  ipAddress: string;
  /** User agent of the request */
  userAgent: string | undefined;
  /** Timestamp of the event */
  timestamp: Date;
}

/**
 * Parameters for sending an email change alert.
 */
export interface SendEmailChangedAlertParams extends SendSecurityAlertParams {
  /** The new email address */
  newEmail: string;
  /** Optional link to revert the email change */
  revertUrl?: string | undefined;
}

/**
 * Send a "Was this you?" alert after a successful login.
 *
 * @param emailService - Email service for sending the alert
 * @param emailTemplates - Email templates for rendering the alert
 * @param params - Alert parameters
 * @returns Promise that resolves when email is sent
 * @throws When email sending fails
 * @complexity O(1)
 */
export async function sendNewLoginAlert(
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  params: SendSecurityAlertParams,
): Promise<void> {
  const { email, ipAddress, userAgent, timestamp } = params;

  const template = emailTemplates.newLoginAlert(ipAddress, userAgent ?? 'Unknown', timestamp);

  await emailService.send({
    to: email,
    subject: template.subject,
    ...(template.html !== undefined && { html: template.html }),
    ...(template.text !== undefined && { text: template.text }),
  });
}

/**
 * Send a "Was this you?" alert after a password change.
 *
 * @param emailService - Email service for sending the alert
 * @param emailTemplates - Email templates for rendering the alert
 * @param params - Alert parameters
 * @returns Promise that resolves when email is sent
 * @throws When email sending fails
 * @complexity O(1)
 */
export async function sendPasswordChangedAlert(
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  params: SendSecurityAlertParams,
): Promise<void> {
  const { email, ipAddress, userAgent, timestamp } = params;

  const template = emailTemplates.passwordChangedAlert(
    ipAddress,
    userAgent ?? 'Unknown',
    timestamp,
  );

  await emailService.send({
    to: email,
    subject: template.subject,
    ...(template.html !== undefined && { html: template.html }),
    ...(template.text !== undefined && { text: template.text }),
  });
}

/**
 * Send a "Was this you?" alert after an email change (to the OLD email).
 *
 * @param emailService - Email service for sending the alert
 * @param emailTemplates - Email templates for rendering the alert
 * @param params - Alert parameters including the new email
 * @returns Promise that resolves when email is sent
 * @throws When email sending fails
 * @complexity O(1)
 */
export async function sendEmailChangedAlert(
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  params: SendEmailChangedAlertParams,
): Promise<void> {
  const { email, newEmail, ipAddress, userAgent, timestamp, revertUrl } = params;

  const template = emailTemplates.emailChangedAlert(
    newEmail,
    ipAddress,
    userAgent ?? 'Unknown',
    timestamp,
    revertUrl,
  );

  await emailService.send({
    to: email,
    subject: template.subject,
    ...(template.html !== undefined && { html: template.html }),
    ...(template.text !== undefined && { text: template.text }),
  });
}

// ============================================================================
// Magic Link Events
// ============================================================================

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
export async function logMagicLinkRequestEvent(
  db: DbClient,
  email: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    email,
    eventType: 'magic_link_requested',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      reason: 'Magic link authentication requested',
    },
  });
}

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
export async function logMagicLinkVerifiedEvent(
  db: DbClient,
  userId: string,
  email: string,
  isNewUser: boolean,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'magic_link_verified',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      reason: 'Magic link successfully verified',
      isNewUser,
    },
  });
}

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
export async function logMagicLinkFailedEvent(
  db: DbClient,
  email: string | undefined,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    email,
    eventType: 'magic_link_failed',
    severity: 'medium',
    ipAddress,
    userAgent,
    metadata: {
      reason,
    },
  });
}

// ============================================================================
// OAuth Events
// ============================================================================

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
export async function logOAuthLoginSuccessEvent(
  db: DbClient,
  userId: string,
  email: string,
  provider: string,
  isNewUser: boolean,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: isNewUser ? 'oauth_account_created' : 'oauth_login_success',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      isNewUser,
      reason: isNewUser ? `New account created via ${provider}` : `Logged in via ${provider}`,
    },
  });
}

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
export async function logOAuthLoginFailureEvent(
  db: DbClient,
  provider: string,
  reason: string,
  email?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    email,
    eventType: 'oauth_login_failure',
    severity: 'medium',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      reason,
    },
  });
}

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
export async function logOAuthLinkSuccessEvent(
  db: DbClient,
  userId: string,
  email: string,
  provider: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'oauth_link_success',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      reason: `Linked ${provider} account`,
    },
  });
}

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
export async function logOAuthLinkFailureEvent(
  db: DbClient,
  userId: string,
  email: string,
  provider: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'oauth_link_failure',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      reason,
    },
  });
}

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
export async function logOAuthUnlinkSuccessEvent(
  db: DbClient,
  userId: string,
  email: string,
  provider: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'oauth_unlink_success',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      reason: `Unlinked ${provider} account`,
    },
  });
}

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
export async function logOAuthUnlinkFailureEvent(
  db: DbClient,
  userId: string,
  email: string,
  provider: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logSecurityEvent({
    db,
    userId,
    email,
    eventType: 'oauth_unlink_failure',
    severity: 'low',
    ipAddress,
    userAgent,
    metadata: {
      provider,
      reason,
    },
  });
}
