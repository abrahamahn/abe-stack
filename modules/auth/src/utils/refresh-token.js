// modules/auth/src/utils/refresh-token.ts
/**
 * Refresh Token Management
 *
 * Implements refresh token rotation with family tracking
 * to detect and prevent token reuse attacks.
 *
 * @module utils/refresh-token
 */
import { TokenReuseError } from '@abe-stack/core';
import { and, deleteFrom, eq, gt, insert, lt, REFRESH_TOKENS_TABLE, REFRESH_TOKEN_COLUMNS, REFRESH_TOKEN_FAMILIES_TABLE, REFRESH_TOKEN_FAMILY_COLUMNS, select, toCamelCase, update, USER_COLUMNS, USERS_TABLE, withTransaction, } from '@abe-stack/db';
import { logTokenFamilyRevokedEvent, logTokenReuseEvent } from '../security/events';
import { createRefreshToken, getRefreshTokenExpiry } from './jwt';
// ============================================================================
// Token Family Management
// ============================================================================
/**
 * Create a new refresh token family.
 * Families are used to detect token reuse attacks.
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token insertion fails, the family creation is rolled back.
 *
 * @param db - Database client
 * @param userId - User ID to create family for
 * @param expiryDays - Number of days until token expires (default: 7)
 * @returns Object containing the family ID and token
 * @throws When database operations fail
 * @complexity O(1) - two database inserts
 */
export async function createRefreshTokenFamily(db, userId, expiryDays = 7) {
    return await withTransaction(db, async (tx) => {
        const familyRows = await tx.query(insert(REFRESH_TOKEN_FAMILIES_TABLE).values({ user_id: userId }).returningAll().toSql());
        if (familyRows[0] === undefined) {
            throw new Error('Failed to create refresh token family');
        }
        const family = toCamelCase(familyRows[0], REFRESH_TOKEN_FAMILY_COLUMNS);
        const token = createRefreshToken();
        await tx.execute(insert(REFRESH_TOKENS_TABLE)
            .values({
            user_id: userId,
            family_id: family.id,
            token,
            expires_at: getRefreshTokenExpiry(expiryDays),
        })
            .toSql());
        return {
            familyId: family.id,
            token,
        };
    });
}
/**
 * Rotate a refresh token (create new one, invalidate old one).
 * Returns new token or null if rotation fails.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Combined token + user lookup using parallel queries where safe
 * 2. Uses composite index (token, expires_at) for efficient token validation
 * 3. Single query for family status check with user info when possible
 * 4. Minimized round trips by batching independent queries
 *
 * @param db - Database client
 * @param oldToken - The current refresh token to rotate
 * @param ipAddress - Client IP address (for security logging)
 * @param userAgent - Client user agent (for security logging)
 * @param expiryDays - Days until new token expires (default: 7)
 * @param gracePeriodSeconds - Grace period for network retries (default: 30)
 * @returns New token with user info, or null if token is invalid
 * @throws {TokenReuseError} If token reuse attack is detected
 * @complexity O(1) - fixed number of database queries
 */
export async function rotateRefreshToken(db, oldToken, ipAddress, userAgent, expiryDays = 7, gracePeriodSeconds = 30) {
    const gracePeriod = gracePeriodSeconds * 1000;
    const graceWindowStart = new Date(Date.now() - gracePeriod);
    const now = new Date();
    // OPTIMIZATION 1: Single query to find valid token
    // Uses composite index (token, expires_at) for efficient lookup
    const storedTokenRow = await db.queryOne(select(REFRESH_TOKENS_TABLE)
        .where(and(eq('token', oldToken), gt('expires_at', now)))
        .limit(1)
        .toSql());
    if (storedTokenRow === null) {
        return null;
    }
    const storedToken = toCamelCase(storedTokenRow, REFRESH_TOKEN_COLUMNS);
    // Calculate grace period metrics once
    const tokenAge = Date.now() - storedToken.createdAt.getTime();
    const isWithinGracePeriod = tokenAge < gracePeriod;
    // OPTIMIZATION 2: Parallel fetch of user and family data
    // These are independent queries that can run concurrently
    const [userRow, familyRow] = await Promise.all([
        // User lookup - always needed for the response
        db.queryOne(select(USERS_TABLE).where(eq('id', storedToken.userId)).limit(1).toSql()),
        // Family lookup - only if familyId exists
        storedToken.familyId !== null
            ? db.queryOne(select(REFRESH_TOKEN_FAMILIES_TABLE)
                .where(eq('id', storedToken.familyId))
                .limit(1)
                .toSql())
            : Promise.resolve(null),
    ]);
    // Early exit if user doesn't exist
    if (userRow === null) {
        return null;
    }
    const user = toCamelCase(userRow, USER_COLUMNS);
    const family = familyRow !== null
        ? toCamelCase(familyRow, REFRESH_TOKEN_FAMILY_COLUMNS)
        : null;
    // Check if family is revoked (token reuse attack)
    if (family?.revokedAt !== undefined &&
        family.revokedAt !== null &&
        storedToken.familyId !== null) {
        await logTokenReuseEvent(db, user.id, user.email, storedToken.familyId, ipAddress, userAgent);
        await revokeTokenFamily(db, storedToken.familyId, 'Token reuse detected');
        throw new TokenReuseError(user.id, user.email, storedToken.familyId, ipAddress, userAgent);
    }
    // OPTIMIZATION 3: Only check for recent tokens if family exists
    // Uses index on (family_id) combined with created_at filter
    const recentTokenRow = storedToken.familyId !== null
        ? await db.queryOne(select(REFRESH_TOKENS_TABLE)
            .where(and(eq('family_id', storedToken.familyId), gt('created_at', graceWindowStart)))
            .orderBy('created_at', 'desc')
            .limit(1)
            .toSql())
        : null;
    const recentTokenInFamily = recentTokenRow !== null
        ? toCamelCase(recentTokenRow, REFRESH_TOKEN_COLUMNS)
        : null;
    // Handle network retry case: return newer token if within grace period
    if (recentTokenInFamily !== null &&
        recentTokenInFamily.token !== oldToken &&
        isWithinGracePeriod) {
        return {
            token: recentTokenInFamily.token,
            userId: user.id,
            email: user.email,
            role: user.role,
        };
    }
    // Detect token reuse attack outside grace period
    if (recentTokenInFamily !== null &&
        recentTokenInFamily.token !== oldToken &&
        !isWithinGracePeriod) {
        if (storedToken.familyId !== null) {
            await logTokenReuseEvent(db, user.id, user.email, storedToken.familyId, ipAddress, userAgent);
            await logTokenFamilyRevokedEvent(db, user.id, user.email, storedToken.familyId, 'Token reuse detected outside grace period', ipAddress, userAgent);
            await revokeTokenFamily(db, storedToken.familyId, 'Token reuse detected outside grace period');
            throw new TokenReuseError(user.id, user.email, storedToken.familyId, ipAddress, userAgent);
        }
    }
    // OPTIMIZATION 4: Atomic token rotation in single transaction
    // Uses primary key index for delete, inserts use sequence for id
    const newToken = await withTransaction(db, async (tx) => {
        // Delete uses primary key index: WHERE id = $1
        await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('id', storedToken.id)).toSql());
        const token = createRefreshToken();
        await tx.execute(insert(REFRESH_TOKENS_TABLE)
            .values({
            user_id: storedToken.userId,
            family_id: storedToken.familyId,
            token,
            expires_at: getRefreshTokenExpiry(expiryDays),
        })
            .toSql());
        return token;
    });
    return {
        token: newToken,
        userId: user.id,
        email: user.email,
        role: user.role,
    };
}
// ============================================================================
// Token Revocation
// ============================================================================
/**
 * Revoke an entire token family (all tokens created from the same initial login).
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token deletion fails, the family update is rolled back.
 *
 * @param db - Database client
 * @param familyId - Token family ID to revoke
 * @param reason - Reason for revocation (for audit trail)
 * @returns Promise that resolves when revocation is complete
 * @complexity O(1) - two database operations
 */
export async function revokeTokenFamily(db, familyId, reason) {
    await withTransaction(db, async (tx) => {
        await tx.execute(update(REFRESH_TOKEN_FAMILIES_TABLE)
            .set({
            revoked_at: new Date(),
            revoke_reason: reason,
        })
            .where(eq('id', familyId))
            .toSql());
        await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('family_id', familyId)).toSql());
    });
}
/**
 * Revoke all refresh tokens for a user (used on logout all devices).
 *
 * This operation is wrapped in a transaction for atomicity.
 * If any operation fails, all changes are rolled back.
 *
 * @param db - Database client
 * @param userId - User ID to revoke all tokens for
 * @returns Promise that resolves when all tokens are revoked
 * @complexity O(1) - two database operations
 */
export async function revokeAllUserTokens(db, userId) {
    await withTransaction(db, async (tx) => {
        await tx.execute(update(REFRESH_TOKEN_FAMILIES_TABLE)
            .set({
            revoked_at: new Date(),
            revoke_reason: 'User logged out from all devices',
        })
            .where(eq('user_id', userId))
            .toSql());
        await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('user_id', userId)).toSql());
    });
}
/**
 * Clean up expired tokens (run periodically).
 *
 * @param db - Database client
 * @returns Number of tokens deleted
 * @complexity O(n) where n is the number of expired tokens
 */
export async function cleanupExpiredTokens(db) {
    const result = await db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql());
    return result;
}
//# sourceMappingURL=refresh-token.js.map