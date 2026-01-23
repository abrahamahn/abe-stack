// apps/server/src/modules/auth/security/events.ts
import { emailTemplates } from '@email';
import { insert, select, eq, gte, SECURITY_EVENTS_TABLE } from '@abe-stack/db';

import type { DbClient } from '@database';
import type { EmailService } from '@email';

/**
 * Security event types
 */
export type SecurityEventType =
  | 'token_reuse_detected'
  | 'token_family_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'suspicious_login'
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
 * Security event severity levels
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event metadata structure
 */
export interface SecurityEventMetadata {
  familyId?: string;
  tokenCount?: number;
  reason?: string;
  adminUserId?: string;
  previousEmail?: string;
  [key: string]: unknown;
}

/**
 * Parameters for logging a security event
 */
export interface LogSecurityEventParams {
  db: DbClient;
  userId?: string;
  email?: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: SecurityEventMetadata;
}

/**
 * Log a security event to the database
 * Creates an audit trail for security-critical actions
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
        user_id: userId || null,
        email: email || null,
        event_type: eventType,
        severity,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .toSql(),
  );
}

/**
 * Log a token reuse detection event
 * This is a critical security event that indicates a potential account compromise
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
 * Log a token family revocation event
 * Called when an entire token family is revoked due to security concerns
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
 * Log an account lockout event
 * Called when an account is locked due to too many failed login attempts
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
 * Log an account unlock event
 * Called when an admin manually unlocks an account
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
 * Get recent security events for a user
 * Useful for displaying security activity to users
 *
 * @param db - Database client
 * @param userId - User ID to fetch events for
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Promise<SecurityEvent[]> - Array of security events
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
 * Get security event metrics for monitoring
 * Returns counts of events by type and severity
 *
 * @param db - Database client
 * @param since - Start date for metrics (default: 24 hours ago)
 * @returns Promise with event counts
 */
export async function getSecurityEventMetrics(
  db: DbClient,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
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

  const tokenReuseCount = events.filter(
    (e) => e.event_type === 'token_reuse_detected',
  ).length;
  const accountLockedCount = events.filter(
    (e) => e.event_type === 'account_locked',
  ).length;
  const criticalEventCount = events.filter(
    (e) => e.severity === 'critical',
  ).length;

  return {
    tokenReuseCount,
    accountLockedCount,
    criticalEventCount,
    totalEventCount: events.length,
  };
}

/**
 * Parameters for sending a token reuse alert email
 */
export interface SendTokenReuseAlertParams {
  email: string;
  ipAddress: string;
  userAgent: string | undefined;
  timestamp: Date;
}

/**
 * Send a security alert email when token reuse is detected
 *
 * This alerts the user that their account may have been compromised
 * and that all their sessions have been terminated as a precaution.
 *
 * @example
 * ```typescript
 * await sendTokenReuseAlert(emailService, {
 *   email: 'user@example.com',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   timestamp: new Date(),
 * });
 * ```
 */
export async function sendTokenReuseAlert(
  emailService: EmailService,
  params: SendTokenReuseAlertParams,
): Promise<void> {
  const { email, ipAddress, userAgent, timestamp } = params;

  const template = emailTemplates.tokenReuseAlert(ipAddress, userAgent || 'Unknown', timestamp);

  await emailService.send({
    ...template,
    to: email,
  });
}

// ============================================================================
// Magic Link Events
// ============================================================================

/**
 * Log a magic link request event
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
 * Log a successful magic link verification event
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
 * Log a failed magic link verification event
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
 * Log a successful OAuth login event
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
 * Log a failed OAuth login/callback event
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
 * Log a successful OAuth account link event
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
 * Log a failed OAuth account link event
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
 * Log a successful OAuth account unlink event
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
 * Log a failed OAuth account unlink event
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
