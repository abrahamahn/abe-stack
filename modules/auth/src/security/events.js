// modules/auth/src/security/events.ts
/**
 * Security Events
 *
 * Functions for logging security-critical events to the database
 * and sending security alert emails.
 *
 * @module security/events
 */
import { eq, gte, insert, SECURITY_EVENTS_TABLE, select } from '@abe-stack/db';
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
export async function logSecurityEvent(params) {
    const { db, userId, email, eventType, severity, ipAddress, userAgent, metadata } = params;
    await db.execute(insert(SECURITY_EVENTS_TABLE)
        .values({
        user_id: userId != null && userId !== '' ? userId : null,
        email: email != null && email !== '' ? email : null,
        event_type: eventType,
        severity,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : null,
        metadata: metadata != null ? JSON.stringify(metadata) : null,
    })
        .toSql());
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
export async function logTokenReuseEvent(db, userId, email, familyId, ipAddress, userAgent) {
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
export async function logTokenFamilyRevokedEvent(db, userId, email, familyId, reason, ipAddress, userAgent) {
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
export async function logAccountLockedEvent(db, email, failedAttempts, ipAddress, userAgent) {
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
export async function logAccountUnlockedEvent(db, userId, email, adminUserId, ipAddress, userAgent) {
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
 * Get recent security events for a user.
 * Useful for displaying security activity to users.
 *
 * @param db - Database client
 * @param userId - User ID to fetch events for
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Array of security events
 * @complexity O(n) where n is the number of returned events
 */
export async function getUserSecurityEvents(db, userId, limit = 50) {
    const rows = await db.query(select(SECURITY_EVENTS_TABLE)
        .columns('id', 'event_type', 'severity', 'created_at')
        .where(eq('user_id', userId))
        .orderBy('created_at', 'desc')
        .limit(limit)
        .toSql());
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
export async function getSecurityEventMetrics(db, since = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    const events = await db.query(select(SECURITY_EVENTS_TABLE)
        .columns('event_type', 'severity')
        .where(gte('created_at', since))
        .toSql());
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
export async function sendTokenReuseAlert(emailService, emailTemplates, params) {
    const { email, ipAddress, userAgent, timestamp } = params;
    const template = emailTemplates.tokenReuseAlert(ipAddress, userAgent ?? 'Unknown', timestamp);
    await emailService.send({
        ...template,
        to: email,
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
export async function logMagicLinkRequestEvent(db, email, ipAddress, userAgent) {
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
export async function logMagicLinkVerifiedEvent(db, userId, email, isNewUser, ipAddress, userAgent) {
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
export async function logMagicLinkFailedEvent(db, email, reason, ipAddress, userAgent) {
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
export async function logOAuthLoginSuccessEvent(db, userId, email, provider, isNewUser, ipAddress, userAgent) {
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
export async function logOAuthLoginFailureEvent(db, provider, reason, email, ipAddress, userAgent) {
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
export async function logOAuthLinkSuccessEvent(db, userId, email, provider, ipAddress, userAgent) {
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
export async function logOAuthLinkFailureEvent(db, userId, email, provider, reason, ipAddress, userAgent) {
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
export async function logOAuthUnlinkSuccessEvent(db, userId, email, provider, ipAddress, userAgent) {
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
export async function logOAuthUnlinkFailureEvent(db, userId, email, provider, reason, ipAddress, userAgent) {
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
//# sourceMappingURL=events.js.map