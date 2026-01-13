// apps/server/src/infra/security/events.ts
import { eq, gte } from 'drizzle-orm';

import { securityEvents } from '../database';

import type { DbClient } from '../database';

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
  | 'email_changed';

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

  await db.insert(securityEvents).values({
    userId: userId || null,
    email: email || null,
    eventType,
    severity,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
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
  const events = await db.query.securityEvents.findMany({
    where: eq(securityEvents.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit,
    columns: {
      id: true,
      eventType: true,
      severity: true,
      createdAt: true,
    },
  });

  return events;
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
  const events = await db.query.securityEvents.findMany({
    where: gte(securityEvents.createdAt, since),
    columns: {
      eventType: true,
      severity: true,
    },
  });

  const tokenReuseCount = events.filter((e) => e.eventType === 'token_reuse_detected').length;
  const accountLockedCount = events.filter((e) => e.eventType === 'account_locked').length;
  const criticalEventCount = events.filter((e) => e.severity === 'critical').length;

  return {
    tokenReuseCount,
    accountLockedCount,
    criticalEventCount,
    totalEventCount: events.length,
  };
}
