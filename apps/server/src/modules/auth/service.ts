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
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
  withTransaction,
  type DbClient,
  type EmailService,
  type Logger,
  type Repositories,
} from '@infrastructure';
import {
  and,
  eq,
  isNull,
  insert,
  update,
  toCamelCase,
  USERS_TABLE,
  USER_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  type User,
} from '@abe-stack/db';
import {
  AccountLockedError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@shared';

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
    createdAt: string;
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
  repos: Repositories,
  emailService: EmailService,
  _config: AuthConfig,
  email: string,
  password: string,
  name?: string,
  baseUrl?: string,
): Promise<RegisterResult> {
  // Check if email is already taken (using repository)
  const existingUser = await repos.users.findByEmail(email);

  if (existingUser) {
    // If user exists, send an email to them to notify about the new registration attempt
    // and return a generic success message to prevent user enumeration.
    try {
      const emailTemplate = emailTemplates.existingAccountRegistrationAttempt(existingUser.email);
      await emailService.send({
        to: existingUser.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
      });
    } catch {
      // Log the error but don't expose it to the client
      // A monitoring/alerting system should be in place for such errors
    }
    return {
      status: 'pending_verification',
      message:
        'Registration successful! Please check your email inbox and click the confirmation link to complete your registration.',
      email,
    };
  }

  // Validate password strength
  const passwordValidation = await validatePassword(password, [email, name || '']);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  const passwordHash = await hashPassword(password, _config.argon2);

  // Create user (unverified by default) and verification token atomically
  const { user, verificationToken } = await withTransaction(db, async (tx) => {
    const newUserRows = await tx.query<Record<string, unknown>>(
      insert(USERS_TABLE)
        .values({
          email,
          name: name || null,
          password_hash: passwordHash,
          role: 'user',
          email_verified: false,
        })
        .returningAll()
        .toSql(),
    );

    if (!newUserRows[0]) {
      throw new Error('Failed to create user');
    }

    const newUser = toCamelCase<User>(newUserRows[0], USER_COLUMNS);

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
  repos: Repositories,
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

  // Fetch user (may be null) - using repository
  const user = await repos.users.findByEmail(email);

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
  _repos: Repositories,
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
export async function logoutUser(
  _db: DbClient,
  repos: Repositories,
  refreshToken?: string,
): Promise<void> {
  if (refreshToken) {
    await repos.refreshTokens.deleteByToken(refreshToken);
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
  retryCount = 3,
): void {
  // Fire and forget - don't block login
  hashPassword(password, config.argon2)
    .then((newHash) =>
      db.execute(
        update(USERS_TABLE).set({ password_hash: newHash }).where(eq('id', userId)).toSql(),
      ),
    )
    .then(() => callback?.(userId))
    .catch((error: unknown) => {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      // Always log rehash failures for observability
      logger.error('Failed to upgrade password hash', {
        userId,
        error: normalizedError.message,
        stack: normalizedError.stack,
        retryCount,
      });

      if (retryCount > 0) {
        setTimeout(
          () => {
            rehashPassword(db, config, userId, password, logger, callback, retryCount - 1);
          },
          1000 * (4 - retryCount),
        ); // 1s, 2s, 3s
      } else {
        callback?.(userId, normalizedError);
      }
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
  repos: Repositories,
  emailService: EmailService,
  email: string,
  baseUrl: string,
): Promise<void> {
  // Using repository for user lookup
  const user = await repos.users.findByEmail(email);

  if (!user) {
    // Don't reveal user doesn't exist - silently succeed
    return;
  }

  const { plain, hash } = await generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await withTransaction(db, async (tx) => {
    // Invalidate all existing password reset tokens for this user
    await tx.execute(
      update(PASSWORD_RESET_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(and(eq('user_id', user.id), isNull('used_at')))
        .toSql(),
    );

    // Create a new password reset token
    await tx.execute(
      insert(PASSWORD_RESET_TOKENS_TABLE)
        .values({
          user_id: user.id,
          token_hash: hash,
          expires_at: expiresAt,
        })
        .toSql(),
    );
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
  repos: Repositories,
  config: AuthConfig,
  token: string,
  newPassword: string,
): Promise<void> {
  // Hash the token to look it up
  const tokenHash = await hashPassword(token, TOKEN_HASH_CONFIG);

  // Find valid token (not expired, not used) - using repository
  const tokenRecord = await repos.passwordResetTokens.findValidByTokenHash(tokenHash);

  if (!tokenRecord) {
    throw new InvalidTokenError('Invalid or expired reset token');
  }

  // Using repository for user lookup
  const user = await repos.users.findById(tokenRecord.userId);

  if (!user) {
    // This should not happen if the token is valid
    throw new InvalidTokenError('User not found for the given token');
  }

  // Validate password strength first
  const passwordValidation = await validatePassword(newPassword, [user.email, user.name || '']);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword, config.argon2);

  // Update password and mark token as used atomically
  await withTransaction(db, async (tx) => {
    await tx.execute(
      update(USERS_TABLE)
        .set({ password_hash: passwordHash })
        .where(eq('id', tokenRecord.userId))
        .toSql(),
    );

    await tx.execute(
      update(PASSWORD_RESET_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(eq('id', tokenRecord.id))
        .toSql(),
    );
  });
}

/**
 * Check if a user has a password set (vs being magic-link only)
 */
export function hasPassword(passwordHash: string): boolean {
  return !passwordHash.startsWith('magiclink:');
}

/**
 * Set password for a user who doesn't have one (magic-link only users)
 *
 * @throws InvalidCredentialsError if user not found
 * @throws Error with code PASSWORD_ALREADY_SET if user already has a password
 * @throws WeakPasswordError if password is too weak
 */
export async function setPassword(
  _db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  userId: string,
  newPassword: string,
): Promise<void> {
  // Find the user - using repository
  const user = await repos.users.findById(userId);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  // Check if user already has a password
  if (hasPassword(user.passwordHash)) {
    const error = new Error('User already has a password set');
    error.name = 'PasswordAlreadySetError';
    throw error;
  }

  // Validate password strength
  const passwordValidation = await validatePassword(newPassword, [user.email, user.name || '']);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash and set the password - using repository
  const passwordHashValue = await hashPassword(newPassword, config.argon2);
  await repos.users.update(userId, { passwordHash: passwordHashValue });
}

/**
 * Create an email verification token for a user
 * @param dbOrRepos - Either DbClient (for transactions) or Repositories (for direct calls)
 */
export async function createEmailVerificationToken(
  dbOrRepos: DbClient | Repositories,
  userId: string,
): Promise<string> {
  const { plain, hash } = await generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Check if this is a Repositories object (has emailVerificationTokens property)
  if ('emailVerificationTokens' in dbOrRepos) {
    await dbOrRepos.emailVerificationTokens.create({
      userId,
      tokenHash: hash,
      expiresAt,
    });
  } else {
    // DbClient (for transactions)
    await dbOrRepos.execute(
      insert(EMAIL_VERIFICATION_TOKENS_TABLE)
        .values({
          user_id: userId,
          token_hash: hash,
          expires_at: expiresAt,
        })
        .toSql(),
    );
  }

  return plain;
}

/**
 * Resend verification email for an unverified user
 * Creates a new verification token and sends the email
 */
export async function resendVerificationEmail(
  db: DbClient,
  repos: Repositories,
  emailService: EmailService,
  email: string,
  baseUrl: string,
): Promise<void> {
  // Using repository for user lookup
  const user = await repos.users.findByEmail(email);

  if (!user) {
    // Don't reveal user doesn't exist - silently succeed
    return;
  }

  if (user.emailVerified) {
    // Already verified - nothing to do
    return;
  }

  // Create new verification token (using transaction for atomicity)
  const verificationToken = await withTransaction(db, async (tx) => {
    // Invalidate all existing email verification tokens for this user
    await tx.execute(
      update(EMAIL_VERIFICATION_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(and(eq('user_id', user.id), isNull('used_at')))
        .toSql(),
    );

    return createEmailVerificationToken(tx, user.id);
  });

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
  repos: Repositories,
  config: AuthConfig,
  token: string,
): Promise<AuthResult> {
  // Hash the token to look it up
  const tokenHash = await hashPassword(token, TOKEN_HASH_CONFIG);

  // Find valid token (not expired, not used) - using repository
  const tokenRecord = await repos.emailVerificationTokens.findValidByTokenHash(tokenHash);

  if (!tokenRecord) {
    throw new InvalidTokenError('Invalid or expired verification token');
  }

  // Mark email as verified, mark token as used, and create auth tokens atomically
  const { user, refreshToken } = await withTransaction(db, async (tx) => {
    // Update user to verified
    const updatedUserRows = await tx.query<Record<string, unknown>>(
      update(USERS_TABLE)
        .set({ email_verified: true, email_verified_at: new Date() })
        .where(eq('id', tokenRecord.userId))
        .returningAll()
        .toSql(),
    );

    if (!updatedUserRows[0]) {
      throw new Error('Failed to verify user');
    }

    const updatedUser = toCamelCase<User>(updatedUserRows[0], USER_COLUMNS);

    // Mark token as used
    await tx.execute(
      update(EMAIL_VERIFICATION_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(eq('id', tokenRecord.id))
        .toSql(),
    );

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
