// apps/server/src/modules/auth/service.ts
/**
 * Auth Service
 *
 * Pure business logic for authentication operations.
 * No HTTP awareness - returns domain objects or throws errors.
 */

import { randomBytes } from 'node:crypto';

import { validatePassword, type UserRole } from '@abe-stack/core';
import {
  applyProgressiveDelay,
  emailTemplates,
  emailVerificationTokens,
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
  passwordResetTokens,
  refreshTokens,
  users,
  withTransaction,
  type DbClient,
  type EmailService,
  type Logger,
} from '@infra';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@shared';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { createAuthResponse } from './utils';
import {
  createAccessToken,
  createRefreshTokenFamily,
  hashPassword,
  needsRehash,
  rotateRefreshToken as rotateRefreshTokenUtil,
  verifyPasswordSafe,
} from './utils';

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

export interface RegisterResult {
  status: 'pending_verification';
  message: string;
  email: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Register a new user
 * Creates user with unverified email and sends verification email
 * Returns pending status, user must verify email to complete registration
 */
export async function registerUser(
  db: DbClient,
  emailService: EmailService,
  _config: AuthConfig,
  email: string,
  password: string,
  name?: string,
  baseUrl?: string,
): Promise<RegisterResult> {
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

  const passwordHash = await hashPassword(password, _config.argon2);

  // Create user (unverified by default) and verification token atomically
  const { user, verificationToken } = await withTransaction(db, async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name: name || null,
        passwordHash,
        role: 'user',
        emailVerified: false,
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Create email verification token
    const token = await createEmailVerificationToken(tx, newUser.id);

    return { user: newUser, verificationToken: token };
  });

  // Send verification email (baseUrl is required, provided by handlers)
  if (!baseUrl) {
    throw new Error('baseUrl is required to send verification emails');
  }
  const verifyUrl = `${baseUrl}/auth/confirm-email?token=${verificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(verifyUrl);

  try {
    await emailService.send({
      ...emailTemplate,
      to: email,
    });
  } catch (error) {
    // User was created but email failed - throw specific error so handler can handle gracefully
    throw new EmailSendError(
      'Failed to send verification email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  return {
    status: 'pending_verification',
    message:
      'Registration successful! Please check your email inbox and click the confirmation link to complete your registration.',
    email: user.email,
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
  logger: Logger,
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

  // Check if email is verified
  if (!user.emailVerified) {
    await logLoginAttempt(db, email, false, ipAddress, userAgent, 'Email not verified');
    throw new EmailNotVerifiedError(email);
  }

  // Create tokens and log success atomically
  const { refreshToken } = await withTransaction(db, async (tx) => {
    await logLoginAttempt(tx, email, true, ipAddress, userAgent);
    const { token } = await createRefreshTokenFamily(tx, user.id, config.refreshToken.expiryDays);
    return { refreshToken: token };
  });

  // Check if password hash needs upgrading (background task)
  if (needsRehash(user.passwordHash)) {
    rehashPassword(db, config, user.id, password, logger, onPasswordRehash);
  }

  // Create access token
  const accessToken = createAccessToken(
    user.id,
    user.email,
    user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return createAuthResponse(accessToken, refreshToken, user);
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
  logger: Logger,
  callback?: (userId: string, error?: Error) => void,
): void {
  // Fire and forget - don't block login
  hashPassword(password, config.argon2)
    .then((newHash) => db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId)))
    .then(() => callback?.(userId))
    .catch((error: unknown) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      // Always log rehash failures for observability
      logger.error('Failed to upgrade password hash', {
        userId,
        error: normalizedError.message,
        stack: normalizedError.stack,
      });
      callback?.(userId, normalizedError);
    });
}

// ============================================================================
// Password Reset & Email Verification
// ============================================================================

/**
 * Lightweight Argon2 config for token hashing
 * Tokens are already high-entropy, so we use minimal params
 */
const TOKEN_HASH_CONFIG = {
  type: 2 as const, // argon2id
  memoryCost: 8192, // 8 MiB (lighter than password hashing)
  timeCost: 1,
  parallelism: 1,
};

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a random token and return both plain and hashed versions
 */
async function generateSecureToken(): Promise<{ plain: string; hash: string }> {
  const plain = randomBytes(32).toString('hex');
  const hash = await hashPassword(plain, TOKEN_HASH_CONFIG);
  return { plain, hash };
}

/**
 * Request a password reset email
 * Always returns success to prevent user enumeration
 */
export async function requestPasswordReset(
  db: DbClient,
  emailService: EmailService,
  email: string,
  baseUrl: string,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // Don't reveal user doesn't exist - silently succeed
    return;
  }

  const { plain, hash } = await generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hash,
    expiresAt,
  });

  // Send password reset email
  const resetUrl = `${baseUrl}/auth/reset-password?token=${plain}`;
  const emailTemplate = emailTemplates.passwordReset(resetUrl);

  try {
    await emailService.send({
      ...emailTemplate,
      to: email,
    });
  } catch (error) {
    // Token was created but email failed - throw specific error so handler can handle gracefully
    throw new EmailSendError(
      'Failed to send password reset email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Reset password using a valid token
 */
export async function resetPassword(
  db: DbClient,
  config: AuthConfig,
  token: string,
  newPassword: string,
): Promise<void> {
  // Validate password strength first
  const passwordValidation = await validatePassword(newPassword, []);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash the token to look it up
  const tokenHash = await hashPassword(token, TOKEN_HASH_CONFIG);

  // Find valid token (not expired, not used)
  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt),
    ),
  });

  if (!tokenRecord) {
    throw new InvalidTokenError('Invalid or expired reset token');
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword, config.argon2);

  // Update password and mark token as used atomically
  await withTransaction(db, async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, tokenRecord.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenRecord.id));
  });
}

/**
 * Create an email verification token for a user
 */
export async function createEmailVerificationToken(db: DbClient, userId: string): Promise<string> {
  const { plain, hash } = await generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hash,
    expiresAt,
  });

  return plain;
}

/**
 * Resend verification email for an unverified user
 * Creates a new verification token and sends the email
 */
export async function resendVerificationEmail(
  db: DbClient,
  emailService: EmailService,
  email: string,
  baseUrl: string,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    // Don't reveal user doesn't exist - silently succeed
    return;
  }

  if (user.emailVerified) {
    // Already verified - nothing to do
    return;
  }

  // Create new verification token
  const verificationToken = await createEmailVerificationToken(db, user.id);

  // Send verification email (baseUrl is required, provided by handlers)
  const verifyUrl = `${baseUrl}/auth/confirm-email?token=${verificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(verifyUrl);

  try {
    await emailService.send({
      ...emailTemplate,
      to: email,
    });
  } catch (error) {
    // Token was created but email failed - throw specific error so handler can handle gracefully
    throw new EmailSendError(
      'Failed to send verification email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Verify email using a token
 * Returns auth result with tokens for auto-login after verification
 */
export async function verifyEmail(
  db: DbClient,
  config: AuthConfig,
  token: string,
): Promise<AuthResult> {
  // Hash the token to look it up
  const tokenHash = await hashPassword(token, TOKEN_HASH_CONFIG);

  // Find valid token (not expired, not used)
  const tokenRecord = await db.query.emailVerificationTokens.findFirst({
    where: and(
      eq(emailVerificationTokens.tokenHash, tokenHash),
      gt(emailVerificationTokens.expiresAt, new Date()),
      isNull(emailVerificationTokens.usedAt),
    ),
  });

  if (!tokenRecord) {
    throw new InvalidTokenError('Invalid or expired verification token');
  }

  // Mark email as verified, mark token as used, and create auth tokens atomically
  const { user, refreshToken } = await withTransaction(db, async (tx) => {
    // Update user to verified
    const [updatedUser] = await tx
      .update(users)
      .set({ emailVerified: true, emailVerifiedAt: new Date() })
      .where(eq(users.id, tokenRecord.userId))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to verify user');
    }

    // Mark token as used
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    // Create refresh token for auto-login
    const { token: refreshTok } = await createRefreshTokenFamily(
      tx,
      updatedUser.id,
      config.refreshToken.expiryDays,
    );

    return { user: updatedUser, refreshToken: refreshTok };
  });

  // Create access token
  const accessToken = createAccessToken(
    user.id,
    user.email,
    user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return createAuthResponse(accessToken, refreshToken, user);
}
