// apps/server/src/modules/auth/utils/refresh-token.ts
/**
 * Refresh Token Management
 *
 * Implements refresh token rotation with family tracking
 * to detect and prevent token reuse attacks.
 */

import { and, eq, gt, lt } from 'drizzle-orm';

import { refreshTokenFamilies, refreshTokens, withTransaction } from '../../../infra/database';
import { logTokenFamilyRevokedEvent, logTokenReuseEvent } from '../../../infra/security/events';

import { createRefreshToken, getRefreshTokenExpiry } from './jwt';

import type { DbClient, UserRole } from '../../../infra/database';

// ============================================================================
// Token Family Management
// ============================================================================

/**
 * Create a new refresh token family
 * Families are used to detect token reuse attacks
 */
export async function createRefreshTokenFamily(
  db: DbClient,
  userId: string,
  expiryDays: number = 7,
): Promise<{ familyId: string; token: string }> {
  const [family] = await db.insert(refreshTokenFamilies).values({ userId }).returning();

  if (!family) {
    throw new Error('Failed to create refresh token family');
  }

  const token = createRefreshToken();
  await db.insert(refreshTokens).values({
    userId,
    familyId: family.id,
    token,
    expiresAt: getRefreshTokenExpiry(expiryDays),
  });

  return {
    familyId: family.id,
    token,
  };
}

/**
 * Rotate a refresh token (create new one, invalidate old one)
 * Returns new token or null if rotation fails
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

  // Find the old token
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.token, oldToken), gt(refreshTokens.expiresAt, new Date())),
  });

  if (!storedToken) {
    return null;
  }

  // Check if this token was recently used (grace period for network issues)
  const tokenAge = Date.now() - storedToken.createdAt.getTime();
  const isWithinGracePeriod = tokenAge < gracePeriod;

  // Check if family is revoked
  if (storedToken.familyId) {
    const family = await db.query.refreshTokenFamilies.findFirst({
      where: eq(refreshTokenFamilies.id, storedToken.familyId),
    });

    if (family?.revokedAt) {
      const user = await db.query.users.findFirst({
        where: eq(refreshTokens.userId, storedToken.userId),
      });

      if (user) {
        await logTokenReuseEvent(
          db,
          user.id,
          user.email,
          storedToken.familyId,
          ipAddress,
          userAgent,
        );
      }

      await revokeTokenFamily(db, storedToken.familyId, 'Token reuse detected');
      return null;
    }
  }

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(refreshTokens.userId, storedToken.userId),
  });

  if (!user) {
    return null;
  }

  // Check if this exact token was already rotated
  const recentTokenInFamily = storedToken.familyId
    ? await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.familyId, storedToken.familyId),
          gt(refreshTokens.createdAt, graceWindowStart),
        ),
        orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
      })
    : null;

  // If there's a newer token in the family within grace period, allow it (network retry)
  if (recentTokenInFamily && recentTokenInFamily.token !== oldToken && isWithinGracePeriod) {
    return {
      token: recentTokenInFamily.token,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // If token was used more than grace period ago, this is a reuse attack
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
      return null;
    }
  }

  // Atomically delete old token and create new one
  const newToken = await withTransaction(db, async (tx) => {
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
 */
export async function revokeTokenFamily(
  db: DbClient,
  familyId: string,
  reason: string,
): Promise<void> {
  await db
    .update(refreshTokenFamilies)
    .set({
      revokedAt: new Date(),
      revokeReason: reason,
    })
    .where(eq(refreshTokenFamilies.id, familyId));

  await db.delete(refreshTokens).where(eq(refreshTokens.familyId, familyId));
}

/**
 * Revoke all refresh tokens for a user (used on logout all devices)
 */
export async function revokeAllUserTokens(db: DbClient, userId: string): Promise<void> {
  await db
    .update(refreshTokenFamilies)
    .set({
      revokedAt: new Date(),
      revokeReason: 'User logged out from all devices',
    })
    .where(eq(refreshTokenFamilies.userId, userId));

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(db: DbClient): Promise<number> {
  const result = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
  return Array.isArray(result) ? result.length : 0;
}
