// apps/server/src/modules/auth/utils/refresh-token.ts
/**
 * Refresh Token Management
 *
 * Implements refresh token rotation with family tracking
 * to detect and prevent token reuse attacks.
 */

import { TokenReuseError } from '@abe-stack/core';
import {
    REFRESH_TOKENS_TABLE,
    REFRESH_TOKEN_COLUMNS,
    REFRESH_TOKEN_FAMILIES_TABLE,
    REFRESH_TOKEN_FAMILY_COLUMNS,
    USERS_TABLE,
    USER_COLUMNS,
    and,
    deleteFrom,
    eq,
    gt,
    insert,
    lt,
    select,
    toCamelCase,
    update,
    type RefreshToken,
    type RefreshTokenFamily,
    type User,
} from '@abe-stack/db';
import {
    logTokenFamilyRevokedEvent,
    logTokenReuseEvent,
    withTransaction,
    type DbClient,
    type UserRole,
} from '@infrastructure';

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
    const familyRows = await tx.query<Record<string, unknown>>(
      insert(REFRESH_TOKEN_FAMILIES_TABLE).values({ user_id: userId }).returningAll().toSql(),
    );

    if (familyRows[0] === undefined) {
      throw new Error('Failed to create refresh token family');
    }

    const family = toCamelCase<RefreshTokenFamily>(familyRows[0], REFRESH_TOKEN_FAMILY_COLUMNS);

    const token = createRefreshToken();
    await tx.execute(
      insert(REFRESH_TOKENS_TABLE)
        .values({
          user_id: userId,
          family_id: family.id,
          token,
          expires_at: getRefreshTokenExpiry(expiryDays),
        })
        .toSql(),
    );

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
  const storedTokenRow = await db.queryOne<Record<string, unknown>>(
    select(REFRESH_TOKENS_TABLE)
      .where(and(eq('token', oldToken), gt('expires_at', now)))
      .limit(1)
      .toSql(),
  );

  if (storedTokenRow === null) {
    return null;
  }

  const storedToken = toCamelCase<RefreshToken>(storedTokenRow, REFRESH_TOKEN_COLUMNS);

  // Calculate grace period metrics once
  const tokenAge = Date.now() - storedToken.createdAt.getTime();
  const isWithinGracePeriod = tokenAge < gracePeriod;

  // OPTIMIZATION 2: Parallel fetch of user and family data
  // These are independent queries that can run concurrently
  const [userRow, familyRow] = await Promise.all([
    // User lookup - always needed for the response
    db.queryOne<Record<string, unknown>>(
      select(USERS_TABLE).where(eq('id', storedToken.userId)).limit(1).toSql(),
    ),
    // Family lookup - only if familyId exists
    storedToken.familyId !== null
      ? db.queryOne<Record<string, unknown>>(
          select(REFRESH_TOKEN_FAMILIES_TABLE)
            .where(eq('id', storedToken.familyId))
            .limit(1)
            .toSql(),
        )
      : Promise.resolve(null),
  ]);

  // Early exit if user doesn't exist
  if (userRow === null) {
    return null;
  }

  const user = toCamelCase<User>(userRow, USER_COLUMNS);
  const family = familyRow !== null
    ? toCamelCase<RefreshTokenFamily>(familyRow, REFRESH_TOKEN_FAMILY_COLUMNS)
    : null;

  // Check if family is revoked (token reuse attack)
  // At this point, family exists if storedToken.familyId exists (from parallel fetch)
  if (family?.revokedAt !== undefined && family.revokedAt !== null && storedToken.familyId !== null) {
    await logTokenReuseEvent(db, user.id, user.email, storedToken.familyId, ipAddress, userAgent);
    await revokeTokenFamily(db, storedToken.familyId, 'Token reuse detected');
    throw new TokenReuseError(user.id, user.email, storedToken.familyId, ipAddress, userAgent);
  }

  // OPTIMIZATION 3: Only check for recent tokens if family exists
  // Uses index on (family_id) combined with created_at filter
  const recentTokenRow = storedToken.familyId !== null
    ? await db.queryOne<Record<string, unknown>>(
        select(REFRESH_TOKENS_TABLE)
          .where(and(eq('family_id', storedToken.familyId), gt('created_at', graceWindowStart)))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      )
    : null;

  const recentTokenInFamily = recentTokenRow !== null
    ? toCamelCase<RefreshToken>(recentTokenRow, REFRESH_TOKEN_COLUMNS)
    : null;

  // Handle network retry case: return newer token if within grace period
  if (recentTokenInFamily !== null && recentTokenInFamily.token !== oldToken && isWithinGracePeriod) {
    return {
      token: recentTokenInFamily.token,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // Detect token reuse attack outside grace period
  if (recentTokenInFamily !== null && recentTokenInFamily.token !== oldToken && !isWithinGracePeriod) {
    if (storedToken.familyId !== null) {
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
    await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('id', storedToken.id)).toSql());

    const token = createRefreshToken();
    await tx.execute(
      insert(REFRESH_TOKENS_TABLE)
        .values({
          user_id: storedToken.userId,
          family_id: storedToken.familyId,
          token,
          expires_at: getRefreshTokenExpiry(expiryDays),
        })
        .toSql(),
    );

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
    await tx.execute(
      update(REFRESH_TOKEN_FAMILIES_TABLE)
        .set({
          revoked_at: new Date(),
          revoke_reason: reason,
        })
        .where(eq('id', familyId))
        .toSql(),
    );

    await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('family_id', familyId)).toSql());
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
    await tx.execute(
      update(REFRESH_TOKEN_FAMILIES_TABLE)
        .set({
          revoked_at: new Date(),
          revoke_reason: 'User logged out from all devices',
        })
        .where(eq('user_id', userId))
        .toSql(),
    );

    await tx.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('user_id', userId)).toSql());
  });
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(db: DbClient): Promise<number> {
  const result = await db.execute(
    deleteFrom(REFRESH_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
  );
  return result;
}
