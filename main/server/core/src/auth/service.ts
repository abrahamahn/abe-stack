// main/server/core/src/auth/service.ts
/**
 * Auth Service
 *
 * Pure business logic for authentication operations.
 * No HTTP awareness - returns domain objects or throws errors.
 *
 * @module service
 */

import {
  AccountLockedError,
  AUTH_EXPIRY,
  canonicalizeEmail,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  isAccountActive,
  isWithinDeletionGracePeriod,
  MS_PER_HOUR,
  normalizeEmail,
  validatePassword,
  WeakPasswordError,
  type BreadcrumbData,
  type UserId,
  type UserRole,
} from '@bslt/shared';

import {
  and,
  AUTH_TOKENS_TABLE,
  CONSENT_RECORDS_TABLE,
  eq,
  insert,
  isNull,
  toCamelCase,
  update,
  USER_COLUMNS,
  USERS_TABLE,
  withTransaction,
  type DbClient,
  type Repositories,
  type User,
} from '../../../db/src';
import { getMetricsCollector, sign as jwtSign } from '../../../system/src';
import { createTenant } from '../tenants';

import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
} from './security';
import { LOGIN_FAILURE_REASON } from './types';
import {
  createAccessToken,
  createAuthResponse,
  createRefreshTokenFamily,
  generateSecureToken,
  hashPassword,
  hashToken,
  needsRehash,
  revokeAllUserTokens,
  rotateRefreshToken as rotateRefreshTokenUtil,
  verifyPasswordSafe,
} from './utils';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
import type { EmailOptions } from '../../../system/src';
import type { AuthConfig } from '@bslt/shared/config';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build EmailOptions from template result, handling exactOptionalPropertyTypes.
 * Only includes html/text if they are defined strings.
 *
 * @param to - Recipient email
 * @param template - Email template with optional html/text
 * @returns EmailOptions without undefined optional properties
 * @complexity O(1)
 */
function buildEmailOptions(
  to: string,
  template: {
    readonly subject: string;
    readonly html?: string | undefined;
    readonly text?: string | undefined;
  },
): EmailOptions {
  const options: EmailOptions = { to, subject: template.subject };
  if (template.html !== undefined) {
    options.html = template.html;
  }
  if (template.text !== undefined) {
    options.text = template.text;
  }
  return options;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Authentication result returned after successful login.
 */
export interface AuthResult {
  /** JWT access token */
  accessToken: string;
  /** Opaque refresh token */
  refreshToken: string;
  /** Authenticated user data (matches domain User from @bslt/shared) */
  user: {
    id: UserId;
    email: string;
    username: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: UserRole;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean | null;
    dateOfBirth: string | null;
    gender: string | null;
    bio: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    language: string | null;
    website: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Result returned when the user has TOTP enabled and must verify a code.
 * Contains a signed JWT challenge token (5-minute expiry) with the user ID.
 */
export interface TotpChallengeResult {
  /** Discriminant — always true for TOTP challenge responses */
  requiresTotp: true;
  /** Signed JWT challenge token (purpose: totp_challenge, userId, 5-min expiry) */
  challengeToken: string;
  /** Human-readable message */
  message: string;
}

/**
 * Result returned when the user has SMS 2FA enabled (phone verified, no TOTP).
 * Contains a signed JWT challenge token (5-minute expiry) with the user ID.
 */
export interface SmsChallengeResult {
  /** Discriminant — always true for SMS challenge responses */
  requiresSms: true;
  /** Signed JWT challenge token (purpose: sms_challenge, userId, 5-min expiry) */
  challengeToken: string;
  /** Human-readable message */
  message: string;
}

/**
 * Token refresh result.
 */
export interface RefreshResult {
  /** New JWT access token */
  accessToken: string;
  /** New opaque refresh token */
  refreshToken: string;
}

/**
 * Registration result (pending email verification).
 */
export interface RegisterResult {
  /** Always 'pending_verification' */
  status: 'pending_verification';
  /** Human-readable message */
  message: string;
  /** Registered email address */
  email: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Register a new user.
 * Creates user with unverified email and sends verification email.
 * Returns pending status, user must verify email to complete registration.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param config - Auth configuration
 * @param email - User email
 * @param password - User password
 * @param username - Unique username (1-15 chars, alphanumeric + underscores)
 * @param firstName - User first name
 * @param lastName - User last name
 * @param baseUrl - Base URL for verification link
 * @returns Registration result
 * @throws {WeakPasswordError} If password is too weak
 * @throws {EmailSendError} If verification email fails
 * @complexity O(1) - constant database operations
 */
export async function registerUser(
  db: DbClient,
  repos: Repositories,
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  config: AuthConfig,
  email: string,
  password: string,
  username: string,
  firstName: string,
  lastName: string,
  baseUrl?: string,
  options: {
    tosAccepted?: boolean;
    ipAddress?: string;
    userAgent?: string;
  } = {},
): Promise<RegisterResult> {
  const { tosAccepted, ipAddress } = options;
  const normalizedEmail = normalizeEmail(email);
  const canonicalEmail = canonicalizeEmail(email);

  // Check if email is already taken (using repository)
  const existingUser = await repos.users.findByEmail(canonicalEmail);

  if (existingUser !== null) {
    if (!existingUser.emailVerified && baseUrl !== undefined && baseUrl !== '') {
      // Unverified account exists — resend verification email so user can complete registration
      try {
        await resendVerificationEmail(
          db,
          repos,
          emailService,
          emailTemplates,
          existingUser.email,
          baseUrl,
        );
      } catch {
        // Log the error but don't expose it to the client
      }
    } else {
      // Verified account — notify about registration attempt (prevents enumeration)
      try {
        const emailTemplate = emailTemplates.existingAccountRegistrationAttempt(existingUser.email);
        await emailService.send(buildEmailOptions(existingUser.email, emailTemplate));
      } catch {
        // Log the error but don't expose it to the client
      }
    }
    return {
      status: 'pending_verification',
      message:
        'Registration successful! Please check your email inbox and click the confirmation link to complete your registration.',
      email: normalizedEmail,
    };
  }

  // Check if username is already taken
  const existingUsername = await repos.users.findByUsername(username);
  if (existingUsername !== null) {
    const error = new Error('Username is already taken');
    error.name = 'ConflictError';
    throw error;
  }

  // Validate password strength (include personal info for dictionary check)
  const passwordValidation = await validatePassword(password, [
    normalizedEmail,
    username,
    firstName,
    lastName,
  ]);
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  const passwordHash = await hashPassword(password, config.argon2);

  // Find latest Terms of Service if accepted
  let tosDocId: string | undefined;
  if (tosAccepted === true) {
    const tosDoc = await repos.legalDocuments.findLatestByType('terms-of-service');
    if (tosDoc !== null) {
      tosDocId = tosDoc.id;
    }
  }

  // Create user (unverified by default) and verification token atomically
  const { user, verificationToken } = await withTransaction(db, async (tx) => {
    const newUserRows = await tx.query(
      insert(USERS_TABLE)
        .values({
          email: normalizedEmail,
          canonical_email: canonicalEmail,
          username,
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
          role: 'user',
          email_verified: false,
        })
        .returningAll()
        .toSql(),
    );

    if (newUserRows[0] === undefined) {
      throw new Error('Failed to create user');
    }

    const newUser = toCamelCase<User>(newUserRows[0], USER_COLUMNS);

    // Create email verification token
    const token = await createEmailVerificationToken(tx, newUser.id);

    // Record Terms of Service agreement
    if (tosDocId !== undefined) {
      await tx.execute(
        insert(CONSENT_RECORDS_TABLE)
          .values({
            user_id: newUser.id,
            record_type: 'legal_document',
            document_id: tosDocId,
            ip_address: ipAddress,
          })
          .toSql(),
      );
    }

    return { user: newUser, verificationToken: token };
  });

  // Send verification email (baseUrl is required, provided by handlers)
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('baseUrl is required to send verification emails');
  }
  const verifyUrl = `${baseUrl}/auth/confirm-email?token=${verificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(verifyUrl);

  try {
    const result = await emailService.send(buildEmailOptions(normalizedEmail, emailTemplate));
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown email error');
    }
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
 * Authenticate a user with email and password.
 * Returns auth result with tokens, throws on failure.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param identifier - Email or username (auto-detected via '@')
 * @param password - User password
 * @param logger - Logger instance
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @param onPasswordRehash - Callback for password rehash events
 * @returns Authentication result, or TOTP challenge if 2FA is enabled
 * @throws {AccountLockedError} If account is locked
 * @throws {InvalidCredentialsError} If credentials are invalid
 * @throws {EmailNotVerifiedError} If email is not verified
 * @complexity O(1) - constant database operations
 */
export async function authenticateUser(
  db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  identifier: string,
  password: string,
  logger: AuthLogger,
  ipAddress?: string,
  userAgent?: string,
  onPasswordRehash?: (userId: string, error?: Error) => void,
  errorTracker?: { addBreadcrumb: (m: string, d: BreadcrumbData) => void },
): Promise<AuthResult | TotpChallengeResult | SmsChallengeResult> {
  errorTracker?.addBreadcrumb('Authenticating user', {
    category: 'auth',
    data: { identifier: identifier.includes('@') ? 'email' : 'username' },
  });

  // Resolve identifier: email (contains '@') or username
  const isEmail = identifier.includes('@');
  const normalizedIdentifier = isEmail ? normalizeEmail(identifier) : identifier;
  const canonicalIdentifier = isEmail ? canonicalizeEmail(identifier) : identifier;
  const user = isEmail
    ? await repos.users.findByEmail(canonicalIdentifier)
    : await repos.users.findByUsername(normalizedIdentifier);

  // Use email for lockout tracking (fall back to normalized identifier if user not found)
  const lockoutKey = user?.email ?? (isEmail ? canonicalIdentifier : normalizedIdentifier);

  // Check if account is locked
  const locked = await isAccountLocked(db, lockoutKey, config.lockout);
  if (locked) {
    errorTracker?.addBreadcrumb('Account locked', { category: 'auth', level: 'warn' });
    await logLoginAttempt(
      db,
      lockoutKey,
      false,
      ipAddress,
      userAgent,
      LOGIN_FAILURE_REASON.ACCOUNT_LOCKED,
    );
    throw new AccountLockedError();
  }

  // Apply progressive delay based on recent failed attempts
  await applyProgressiveDelay(db, lockoutKey, config.lockout);

  // Timing-safe password verification
  const isValid = await verifyPasswordSafe(password, user?.passwordHash);

  if (user === null) {
    errorTracker?.addBreadcrumb('User not found', { category: 'auth', level: 'warn' });
    await handleFailedLogin(
      db,
      config,
      lockoutKey,
      LOGIN_FAILURE_REASON.USER_NOT_FOUND,
      ipAddress,
      userAgent,
    );
    throw new InvalidCredentialsError();
  }

  if (!isValid) {
    errorTracker?.addBreadcrumb('Password mismatch', { category: 'auth', level: 'warn' });
    await handleFailedLogin(
      db,
      config,
      lockoutKey,
      LOGIN_FAILURE_REASON.PASSWORD_MISMATCH,
      ipAddress,
      userAgent,
    );
    throw new InvalidCredentialsError();
  }

  // Check admin-imposed account lock (lockedUntil field on user record)
  if (user.lockedUntil !== null) {
    if (user.lockedUntil > new Date()) {
      errorTracker?.addBreadcrumb('Account suspended by admin', {
        category: 'auth',
        level: 'warn',
      });
      await logLoginAttempt(
        db,
        lockoutKey,
        false,
        ipAddress,
        userAgent,
        LOGIN_FAILURE_REASON.ACCOUNT_LOCKED,
      );
      throw new AccountLockedError();
    }
    // Lock expired — auto-unlock (fire-and-forget)
    repos.users.unlockAccount(user.id).catch(() => {});
  }

  // Check if account is deactivated or deleted (past grace period)
  if (!isAccountActive(user)) {
    // Deleted accounts within grace period can still log in to reactivate
    if (user.deletedAt !== null && isWithinDeletionGracePeriod(user)) {
      errorTracker?.addBreadcrumb('Reactivating deleted account', { category: 'auth' });
      // Allow login — user can reactivate during grace period
    } else {
      const reason =
        user.deactivatedAt !== null
          ? LOGIN_FAILURE_REASON.ACCOUNT_DEACTIVATED
          : LOGIN_FAILURE_REASON.ACCOUNT_DELETED;
      errorTracker?.addBreadcrumb(`Login blocked: ${reason}`, { category: 'auth', level: 'warn' });
      await logLoginAttempt(db, lockoutKey, false, ipAddress, userAgent, reason);
      // Return generic error to prevent account status enumeration
      throw new InvalidCredentialsError();
    }
  }

  // Check if email is verified
  if (!user.emailVerified) {
    errorTracker?.addBreadcrumb('Email not verified', { category: 'auth', level: 'warn' });
    await logLoginAttempt(
      db,
      lockoutKey,
      false,
      ipAddress,
      userAgent,
      LOGIN_FAILURE_REASON.UNVERIFIED_EMAIL,
    );
    throw new EmailNotVerifiedError(user.email);
  }

  // Check if TOTP (2FA) is enabled — return challenge instead of tokens
  if (user.totpEnabled) {
    errorTracker?.addBreadcrumb('TOTP challenge required', { category: 'auth' });
    await logLoginAttempt(
      db,
      lockoutKey,
      true,
      ipAddress,
      userAgent,
      LOGIN_FAILURE_REASON.TOTP_REQUIRED,
    );

    // Check if password hash needs upgrading (background task)
    if (needsRehash(user.passwordHash)) {
      rehashPassword(db, config, user.id, password, logger, onPasswordRehash);
    }

    const challengeToken = jwtSign(
      { userId: user.id, purpose: 'totp_challenge' },
      config.jwt.secret,
      { expiresIn: '5m' },
    );

    return {
      requiresTotp: true,
      challengeToken,
      message: 'Two-factor authentication required. Please enter your TOTP code.',
    };
  }

  // Check if SMS 2FA is active (phone verified, TOTP not enabled)
  if (user.phoneVerified === true) {
    errorTracker?.addBreadcrumb('SMS challenge required', { category: 'auth' });
    await logLoginAttempt(
      db,
      lockoutKey,
      true,
      ipAddress,
      userAgent,
      LOGIN_FAILURE_REASON.SMS_REQUIRED,
    );

    // Check if password hash needs upgrading (background task)
    if (needsRehash(user.passwordHash)) {
      rehashPassword(db, config, user.id, password, logger, onPasswordRehash);
    }

    const challengeToken = jwtSign(
      { userId: user.id, purpose: 'sms_challenge' },
      config.jwt.secret,
      { expiresIn: '5m' },
    );

    return {
      requiresSms: true,
      challengeToken,
      message: 'SMS verification required. Please request a code.',
    };
  }

  errorTracker?.addBreadcrumb('Login successful', { category: 'auth' });
  // Create tokens and log success atomically
  const { refreshToken } = await withTransaction(db, async (tx) => {
    await logLoginAttempt(tx, lockoutKey, true, ipAddress, userAgent);
    const sessionMeta: { ipAddress?: string; userAgent?: string } = {};
    if (ipAddress !== undefined) {
      sessionMeta.ipAddress = ipAddress;
    }
    if (userAgent !== undefined) {
      sessionMeta.userAgent = userAgent;
    }
    const { token } = await createRefreshTokenFamily(
      tx,
      user.id,
      config.refreshToken.expiryDays,
      sessionMeta,
    );
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
 * Refresh tokens using a valid refresh token.
 * Returns new tokens, throws if invalid.
 *
 * @param db - Database client
 * @param _repos - Repositories (unused, kept for interface consistency)
 * @param config - Auth configuration
 * @param oldRefreshToken - Current refresh token
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns New token pair
 * @throws {InvalidTokenError} If refresh token is invalid
 * @complexity O(1) - constant database operations
 */
export async function refreshUserTokens(
  db: DbClient,
  repos: Repositories,
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

  if (result === null) {
    throw new InvalidTokenError();
  }

  // Check token version: reject if all sessions were invalidated
  const user = await repos.users.findById(result.userId);
  if (user === null) {
    throw new InvalidTokenError();
  }

  // Create new access token with current tokenVersion
  const accessToken = createAccessToken(
    result.userId,
    result.email,
    result.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
    user.tokenVersion,
  );

  return {
    accessToken,
    refreshToken: result.token,
  };
}

/**
 * Logout user by invalidating their refresh token.
 *
 * @param _db - Database client (unused, kept for interface consistency)
 * @param repos - Repositories
 * @param refreshToken - Refresh token to invalidate
 * @complexity O(1)
 */
export async function logoutUser(
  _db: DbClient,
  repos: Repositories,
  refreshToken?: string,
): Promise<void> {
  if (refreshToken !== undefined && refreshToken !== '') {
    await repos.refreshTokens.deleteByToken(refreshToken);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle a failed login attempt.
 *
 * @param db - Database client
 * @param config - Auth configuration
 * @param email - User email
 * @param reason - Failure reason
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @complexity O(1)
 */
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
    getMetricsCollector().recordLockout();
    await logAccountLockedEvent(db, email, lockoutStatus.failedAttempts, ipAddress, userAgent);
  }
}

/**
 * Rehash password in the background (fire-and-forget with retry).
 *
 * @param db - Database client
 * @param config - Auth configuration
 * @param userId - User ID
 * @param password - Plain text password
 * @param logger - Logger instance
 * @param callback - Optional callback for rehash events
 * @param retryCount - Remaining retry attempts
 * @complexity O(1) per attempt
 */
function rehashPassword(
  db: DbClient,
  config: AuthConfig,
  userId: string,
  password: string,
  logger: AuthLogger,
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

/** Token expiry in hours */
const TOKEN_EXPIRY_HOURS = AUTH_EXPIRY.VERIFICATION_TOKEN_HOURS;

/**
 * Request a password reset email.
 * Always returns success to prevent user enumeration.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param email - User email
 * @param baseUrl - Base URL for reset link
 * @throws {EmailSendError} If email fails to send
 * @complexity O(1)
 */
export async function requestPasswordReset(
  db: DbClient,
  repos: Repositories,
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  email: string,
  baseUrl: string,
): Promise<void> {
  const canonicalEmail = canonicalizeEmail(email);
  // Using repository for user lookup
  const user = await repos.users.findByEmail(canonicalEmail);

  if (user === null) {
    // Don't reveal user doesn't exist - silently succeed
    return;
  }

  const { plain, hash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * MS_PER_HOUR);

  await withTransaction(db, async (tx) => {
    // Invalidate all existing password reset tokens for this user
    await tx.execute(
      update(AUTH_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(and(eq('type', 'password_reset'), eq('user_id', user.id), isNull('used_at')))
        .toSql(),
    );

    // Create a new password reset token
    await tx.execute(
      insert(AUTH_TOKENS_TABLE)
        .values({
          type: 'password_reset',
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
    const result = await emailService.send(buildEmailOptions(user.email, emailTemplate));
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown email error');
    }
  } catch (error) {
    // Token was created but email failed - throw specific error so handler can handle gracefully
    throw new EmailSendError(
      'Failed to send password reset email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Reset password using a valid token.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param token - Password reset token
 * @param newPassword - New password
 * @returns The email address of the user whose password was reset
 * @throws {InvalidTokenError} If token is invalid or expired
 * @throws {WeakPasswordError} If new password is too weak
 * @complexity O(1)
 */
export async function resetPassword(
  db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  token: string,
  newPassword: string,
): Promise<string> {
  // Hash the token to look it up
  const tokenHash = hashToken(token);

  // Find valid token (not expired, not used) - using repository
  const tokenRecord = await repos.authTokens.findValidByTokenHash('password_reset', tokenHash);

  if (tokenRecord === null) {
    throw new InvalidTokenError('Invalid or expired reset token');
  }

  if (tokenRecord.userId === null) {
    throw new InvalidTokenError('Token is not associated with a user');
  }

  // Using repository for user lookup
  const user = await repos.users.findById(tokenRecord.userId);

  if (user === null) {
    // This should not happen if the token is valid
    throw new InvalidTokenError('User not found for the given token');
  }

  // Validate password strength first
  const passwordValidation = await validatePassword(
    newPassword,
    [user.email, user.username, user.firstName, user.lastName].filter(
      (s): s is string => s !== null,
    ),
  );
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
      update(AUTH_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(eq('id', tokenRecord.id))
        .toSql(),
    );
  });

  await revokeAllUserTokens(db, tokenRecord.userId);

  return user.email;
}

/**
 * Check if a user has a password set (vs being magic-link only).
 *
 * @param passwordHash - User's password hash
 * @returns True if user has a real password
 * @complexity O(1)
 */
export function hasPassword(passwordHash: string): boolean {
  return !passwordHash.startsWith('magiclink:');
}

/**
 * Set password for a user who doesn't have one (magic-link only users).
 *
 * @param _db - Database client (unused, kept for interface consistency)
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param userId - User ID
 * @param newPassword - New password
 * @throws {InvalidCredentialsError} If user not found
 * @throws Error with name 'PasswordAlreadySetError' if user already has a password
 * @throws {WeakPasswordError} If password is too weak
 * @complexity O(1)
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

  if (user === null) {
    throw new InvalidCredentialsError();
  }

  // Check if user already has a password
  if (hasPassword(user.passwordHash)) {
    const error = new Error('User already has a password set');
    error.name = 'PasswordAlreadySetError';
    throw error;
  }

  // Validate password strength
  const passwordValidation = await validatePassword(
    newPassword,
    [user.email, user.username, user.firstName, user.lastName].filter(
      (s): s is string => s !== null,
    ),
  );
  if (!passwordValidation.isValid) {
    throw new WeakPasswordError({ errors: passwordValidation.errors });
  }

  // Hash and set the password - using repository
  const passwordHashValue = await hashPassword(newPassword, config.argon2);
  await repos.users.update(userId, { passwordHash: passwordHashValue });
}

/**
 * Create an email verification token for a user.
 *
 * @param dbOrRepos - Either DbClient (for transactions) or Repositories (for direct calls)
 * @param userId - User ID to create token for
 * @returns Plain text token
 * @complexity O(1)
 */
export async function createEmailVerificationToken(
  dbOrRepos: DbClient | Repositories,
  userId: string,
): Promise<string> {
  const { plain, hash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * MS_PER_HOUR);

  // Check if this is a Repositories object (has authTokens property)
  if ('authTokens' in dbOrRepos) {
    await dbOrRepos.authTokens.create({
      type: 'email_verification',
      userId,
      tokenHash: hash,
      expiresAt,
    });
  } else {
    // DbClient (for transactions)
    await dbOrRepos.execute(
      insert(AUTH_TOKENS_TABLE)
        .values({
          type: 'email_verification',
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
 * Resend verification email for an unverified user.
 * Creates a new verification token and sends the email.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param email - User email
 * @param baseUrl - Base URL for verification link
 * @throws {EmailSendError} If email fails to send
 * @complexity O(1)
 */
export async function resendVerificationEmail(
  db: DbClient,
  repos: Repositories,
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  email: string,
  baseUrl: string,
): Promise<void> {
  const canonicalEmail = canonicalizeEmail(email);
  // Using repository for user lookup
  const user = await repos.users.findByEmail(canonicalEmail);

  if (user === null) {
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
      update(AUTH_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(
          and(eq('type', 'email_verification'), eq('user_id', user.id), isNull('used_at')),
        )
        .toSql(),
    );

    return createEmailVerificationToken(tx, user.id);
  });

  // Send verification email (baseUrl is required, provided by handlers)
  const verifyUrl = `${baseUrl}/auth/confirm-email?token=${verificationToken}`;
  const emailTemplate = emailTemplates.emailVerification(verifyUrl);

  try {
    const result = await emailService.send(buildEmailOptions(user.email, emailTemplate));
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown email error');
    }
  } catch (error) {
    // Token was created but email failed - throw specific error so handler can handle gracefully
    throw new EmailSendError(
      'Failed to send verification email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Verify email using a token.
 * Returns auth result with tokens for auto-login after verification.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param config - Auth configuration
 * @param token - Email verification token
 * @returns Authentication result for auto-login
 * @throws {InvalidTokenError} If token is invalid or expired
 * @complexity O(1) - constant database operations
 */
export async function verifyEmail(
  db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  token: string,
  logger?: AuthLogger,
): Promise<AuthResult> {
  // Hash the token to look it up
  const tokenHash = hashToken(token);

  // Find valid token (not expired, not used) - using repository
  const tokenRecord = await repos.authTokens.findValidByTokenHash('email_verification', tokenHash);

  if (tokenRecord === null) {
    throw new InvalidTokenError('Invalid or expired verification token');
  }

  if (tokenRecord.userId === null) {
    throw new InvalidTokenError('Token is not associated with a user');
  }

  const verifiedUserId = tokenRecord.userId;

  // Mark email as verified, mark token as used, and create auth tokens atomically
  const { user, refreshToken } = await withTransaction(db, async (tx) => {
    // Update user to verified
    const updatedUserRows = await tx.query(
      update(USERS_TABLE)
        .set({ email_verified: true, email_verified_at: new Date() })
        .where(eq('id', verifiedUserId))
        .returningAll()
        .toSql(),
    );

    if (updatedUserRows[0] === undefined) {
      throw new Error('Failed to verify user');
    }

    const updatedUser = toCamelCase<User>(updatedUserRows[0], USER_COLUMNS);

    // Mark token as used ATOMICALLY to prevent race conditions
    // We check isNull('used_at') again in the update to ensure only one request succeeds
    const updatedTokens = await tx.query(
      update(AUTH_TOKENS_TABLE)
        .set({ used_at: new Date() })
        .where(
          and(eq('type', 'email_verification'), eq('id', tokenRecord.id), isNull('used_at')),
        )
        .returningAll()
        .toSql(),
    );

    if (updatedTokens[0] === undefined) {
      throw new InvalidTokenError('Token already used');
    }

    // Create refresh token for auto-login
    const { token: refreshTok } = await createRefreshTokenFamily(
      tx,
      updatedUser.id,
      config.refreshToken.expiryDays,
    );

    return { user: updatedUser, refreshToken: refreshTok };
  });

  // Fire-and-forget: create default workspace for users with no memberships
  // This ensures users always have a workspace context on first login
  const userId = user.id;
  const username = user.username;
  repos.memberships
    .findByUserId(userId)
    .then((memberships) => {
      if (memberships.length === 0) {
        const workspaceName = `${username ?? 'My'}'s Workspace`;
        return createTenant(db, repos, userId, { name: workspaceName });
      }
      return undefined;
    })
    .catch((err: unknown) => {
      // Log error but don't fail verification
      if (logger !== undefined) {
        logger.warn({ err, userId }, 'Failed to create default workspace after email verification');
      }
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
