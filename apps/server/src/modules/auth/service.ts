// apps/server/src/modules/auth/service.ts
/**
 * Auth Service
 *
 * Pure business logic for authentication operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { validatePassword, type UserRole } from '@abe-stack/core';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
  refreshTokens,
  users,
  withTransaction,
  type DbClient,
} from '@infra';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@shared';
import {
  createAccessToken,
  createRefreshTokenFamily,
  hashPassword,
  needsRehash,
  rotateRefreshToken as rotateRefreshTokenUtil,
  verifyPasswordSafe,
} from '@utils/index';
import { eq } from 'drizzle-orm';


import type { AuthConfig } from '@config';

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Register a new user
 * Returns auth result with tokens, throws if validation fails
 */
export async function registerUser(
  db: DbClient,
  config: AuthConfig,
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  // Check if email is already taken
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new EmailAlreadyExistsError(`Email already registered: ${email}`);
  }

  // Validate password strength
  const passwordValidation = await validatePassword(password, [email, name || '']);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  const passwordHash = await hashPassword(password, config.argon2);

  // Create user and refresh token atomically
  const { user, refreshToken } = await withTransaction(db, async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name: name || null,
        passwordHash,
        role: 'user',
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    const { token } = await createRefreshTokenFamily(
      tx,
      newUser.id,
      config.refreshToken.expiryDays,
    );

    return { user: newUser, refreshToken: token };
  });

  // Create access token
  const accessToken = createAccessToken(
    user.id,
    user.email,
    user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Authenticate a user with email and password
 * Returns auth result with tokens, throws on failure
 */
export async function authenticateUser(
  db: DbClient,
  config: AuthConfig,
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
  onPasswordRehash?: (userId: string, error?: Error) => void,
): Promise<AuthResult> {
  // Check if account is locked
  const locked = await isAccountLocked(db, email, config.lockout);
  if (locked) {
    await logLoginAttempt(db, email, false, ipAddress, userAgent, 'Account locked');
    throw new AccountLockedError();
  }

  // Apply progressive delay based on recent failed attempts
  await applyProgressiveDelay(db, email, config.lockout);

  // Fetch user (may be null)
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Timing-safe password verification
  const isValid = await verifyPasswordSafe(password, user?.passwordHash);

  if (!user) {
    await handleFailedLogin(db, config, email, 'User not found', ipAddress, userAgent);
    throw new InvalidCredentialsError();
  }

  if (!isValid) {
    await handleFailedLogin(db, config, email, 'Invalid password', ipAddress, userAgent);
    throw new InvalidCredentialsError();
  }

  // Create tokens and log success atomically
  const { refreshToken } = await withTransaction(db, async (tx) => {
    await logLoginAttempt(tx, email, true, ipAddress, userAgent);
    const { token } = await createRefreshTokenFamily(tx, user.id, config.refreshToken.expiryDays);
    return { refreshToken: token };
  });

  // Check if password hash needs upgrading (background task)
  if (needsRehash(user.passwordHash)) {
    rehashPassword(db, config, user.id, password, onPasswordRehash);
  }

  // Create access token
  const accessToken = createAccessToken(
    user.id,
    user.email,
    user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Refresh tokens using a valid refresh token
 * Returns new tokens, throws if invalid
 */
export async function refreshUserTokens(
  db: DbClient,
  config: AuthConfig,
  oldRefreshToken: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<RefreshResult> {
  const result = await rotateRefreshTokenUtil(
    db,
    oldRefreshToken,
    ipAddress,
    userAgent,
    config.refreshToken.expiryDays,
    config.refreshToken.gracePeriodSeconds,
  );

  if (!result) {
    throw new InvalidTokenError();
  }

  // Create new access token
  const accessToken = createAccessToken(
    result.userId,
    result.email,
    result.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return {
    accessToken,
    refreshToken: result.token,
  };
}

/**
 * Logout user by invalidating their refresh token
 */
export async function logoutUser(db: DbClient, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function handleFailedLogin(
  db: DbClient,
  config: AuthConfig,
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  await logLoginAttempt(db, email, false, ipAddress, userAgent, reason);
  const lockoutStatus = await getAccountLockoutStatus(db, email, config.lockout);
  if (lockoutStatus.isLocked) {
    await logAccountLockedEvent(db, email, lockoutStatus.failedAttempts, ipAddress, userAgent);
  }
}

function rehashPassword(
  db: DbClient,
  config: AuthConfig,
  userId: string,
  password: string,
  callback?: (userId: string, error?: Error) => void,
): void {
  // Fire and forget - don't block login
  hashPassword(password, config.argon2)
    .then((newHash) => db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId)))
    .then(() => callback?.(userId))
    .catch((error: unknown) =>
      callback?.(userId, error instanceof Error ? error : new Error(String(error))),
    );
}
