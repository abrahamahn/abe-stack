// apps/server/src/modules/auth/utils/refresh-token.ts
/**
 * Refresh Token Management
 *
 * Implements refresh token rotation with family tracking
 * to detect and prevent token reuse attacks.
 */

import { TokenReuseError } from '@abe-stack/core';
import {
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  refreshTokenFamilies,
  refreshTokens,
  withTransaction,
  type DbClient,
  type UserRole,
} from '@infrastructure';
import { and, eq, gt, lt } from 'drizzle-orm';

import { createRefreshToken, getRefreshTokenExpiry } from './jwt';

// ============================================================================
// Token Family Management
// ============================================================================

/**
 * Create a new refresh token family
 * Families are used to detect token reuse attacks
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token insertion fails, the family creation is rolled back.
 */
export async function createRefreshTokenFamily(
  db: DbClient,
  userId: string,
  expiryDays: number = 7,
): Promise<{ familyId: string; token: string }> {
  return await withTransaction(db, async (tx) => {
    const [family] = await tx.insert(refreshTokenFamilies).values({ userId }).returning();

    if (!family) {
      throw new Error('Failed to create refresh token family');
    }

    const token = createRefreshToken();
    await tx.insert(refreshTokens).values({
      userId,
      familyId: family.id,
      token,
      expiresAt: getRefreshTokenExpiry(expiryDays),
    });

    return {
      familyId: family.id,
      token,
    };
  });
}

/**
 * Rotate a refresh token (create new one, invalidate old one)
 * Returns new token or null if rotation fails
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Combined token + user lookup using parallel queries where safe
 * 2. Uses composite index (token, expires_at) for efficient token validation
 * 3. Single query for family status check with user info when possible
 * 4. Minimized round trips by batching independent queries
 */
export async function rotateRefreshToken(
  db: DbClient,
  oldToken: string,
  ipAddress?: string,
  userAgent?: string,
  expiryDays: number = 7,
  gracePeriodSeconds: number = 30,
): Promise<{ token: string; userId: string; email: string; role: UserRole } | null> {
  const gracePeriod = gracePeriodSeconds * 1000;
  const graceWindowStart = new Date(Date.now() - gracePeriod);
  const now = new Date();

  // OPTIMIZATION 1: Single query to find valid token
  // Uses composite index (token, expires_at) for efficient lookup
  // Query: WHERE token = $1 AND expires_at > NOW()
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.token, oldToken), gt(refreshTokens.expiresAt, now)),
  });

  if (!storedToken) {
    return null;
  }

  // Calculate grace period metrics once
  const tokenAge = Date.now() - storedToken.createdAt.getTime();
  const isWithinGracePeriod = tokenAge < gracePeriod;

  // OPTIMIZATION 2: Parallel fetch of user and family data
  // These are independent queries that can run concurrently
  // User lookup uses primary key index on users.id
  // Family lookup uses primary key index on refresh_token_families.id
  const [user, family] = await Promise.all([
    // User lookup - always needed for the response
    db.query.users.findFirst({
      where: eq(refreshTokens.userId, storedToken.userId),
    }),
    // Family lookup - only if familyId exists
    storedToken.familyId
      ? db.query.refreshTokenFamilies.findFirst({
          where: eq(refreshTokenFamilies.id, storedToken.familyId),
        })
      : Promise.resolve(null),
  ]);

  // Early exit if user doesn't exist
  if (!user) {
    return null;
  }

  // Check if family is revoked (token reuse attack)
  // At this point, family exists if storedToken.familyId exists (from parallel fetch)
  if (family?.revokedAt && storedToken.familyId) {
    await logTokenReuseEvent(db, user.id, user.email, storedToken.familyId, ipAddress, userAgent);
    await revokeTokenFamily(db, storedToken.familyId, 'Token reuse detected');
    throw new TokenReuseError(user.id, user.email, storedToken.familyId, ipAddress, userAgent);
  }

  // OPTIMIZATION 3: Only check for recent tokens if family exists
  // Uses index on (family_id) combined with created_at filter
  // Query: WHERE family_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT 1
  const recentTokenInFamily = storedToken.familyId
    ? await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.familyId, storedToken.familyId),
          gt(refreshTokens.createdAt, graceWindowStart),
        ),
        orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
      })
    : null;

  // Handle network retry case: return newer token if within grace period
  if (recentTokenInFamily && recentTokenInFamily.token !== oldToken && isWithinGracePeriod) {
    return {
      token: recentTokenInFamily.token,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // Detect token reuse attack outside grace period
  if (recentTokenInFamily && recentTokenInFamily.token !== oldToken && !isWithinGracePeriod) {
    if (storedToken.familyId) {
      await logTokenReuseEvent(db, user.id, user.email, storedToken.familyId, ipAddress, userAgent);
      await logTokenFamilyRevokedEvent(
        db,
        user.id,
        user.email,
        storedToken.familyId,
        'Token reuse detected outside grace period',
        ipAddress,
        userAgent,
      );
      await revokeTokenFamily(
        db,
        storedToken.familyId,
        'Token reuse detected outside grace period',
      );
      throw new TokenReuseError(user.id, user.email, storedToken.familyId, ipAddress, userAgent);
    }
  }

  // OPTIMIZATION 4: Atomic token rotation in single transaction
  // Uses primary key index for delete, inserts use sequence for id
  const newToken = await withTransaction(db, async (tx) => {
    // Delete uses primary key index: WHERE id = $1
    await tx.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    const token = createRefreshToken();
    await tx.insert(refreshTokens).values({
      userId: storedToken.userId,
      familyId: storedToken.familyId,
      token,
      expiresAt: getRefreshTokenExpiry(expiryDays),
    });

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
 * Revoke an entire token family (all tokens created from the same initial login)
 *
 * This operation is wrapped in a transaction for atomicity.
 * If token deletion fails, the family update is rolled back.
 */
export async function revokeTokenFamily(
  db: DbClient,
  familyId: string,
  reason: string,
): Promise<void> {
  await withTransaction(db, async (tx) => {
    await tx
      .update(refreshTokenFamilies)
      .set({
        revokedAt: new Date(),
        revokeReason: reason,
      })
      .where(eq(refreshTokenFamilies.id, familyId));

    await tx.delete(refreshTokens).where(eq(refreshTokens.familyId, familyId));
  });
}

/**
 * Revoke all refresh tokens for a user (used on logout all devices)
 *
 * This operation is wrapped in a transaction for atomicity.
 * If any operation fails, all changes are rolled back.
 */
export async function revokeAllUserTokens(db: DbClient, userId: string): Promise<void> {
  await withTransaction(db, async (tx) => {
    await tx
      .update(refreshTokenFamilies)
      .set({
        revokedAt: new Date(),
        revokeReason: 'User logged out from all devices',
      })
      .where(eq(refreshTokenFamilies.userId, userId));

    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  });
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(db: DbClient): Promise<number> {
  const result = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
  return Array.isArray(result) ? result.length : 0;
}
