// main/server/core/src/auth/magic-link/service.ts
/**
 * Magic Link Service
 *
 * Business logic for passwordless authentication via magic links.
 * Handles token generation, verification, and rate limiting.
 *
 * @module magic-link/service
 */

import { randomBytes } from 'node:crypto';

import {
    AUTH_EXPIRY,
    canonicalizeEmail,
    EmailSendError,
    InvalidTokenError,
    MS_PER_HOUR,
    normalizeEmail,
    QUOTAS,
    TooManyRequestsError,
    type UserId,
} from '@abe-stack/shared';

import {
    and,
    eq,
    gt,
    insert,
    isNull,
    MAGIC_LINK_TOKENS_TABLE,
    select,
    toCamelCase,
    update,
    USER_COLUMNS,
    USERS_TABLE,
    withTransaction,
    type DbClient,
    type Repositories,
    type User,
} from '../../../../db/src';
import {
    createAccessToken,
    createAuthResponse,
    createRefreshTokenFamily,
    generateBase64UrlToken,
    generateUniqueUsername,
    hashToken,
} from '../utils';

import type { AuthEmailService, AuthEmailTemplates } from '../types';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Constants
// ============================================================================

/** Token length in bytes (32 bytes = 256 bits of entropy) */
const TOKEN_BYTES = 32;

/** Token expiry in minutes (default, can be overridden by config) */
const DEFAULT_TOKEN_EXPIRY_MINUTES = AUTH_EXPIRY.MAGIC_LINK_MINUTES;

/** Max requests per email per hour for rate limiting (default) */
const DEFAULT_MAX_REQUESTS_PER_EMAIL = QUOTAS.MAGIC_LINK_MAX_PER_EMAIL;

/** Max requests per IP per hour for rate limiting */
const DEFAULT_MAX_REQUESTS_PER_IP = QUOTAS.MAGIC_LINK_MAX_PER_IP;

/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = MS_PER_HOUR;

// ============================================================================
// Types
// ============================================================================

/**
 * Magic link authentication result.
 */
export interface MagicLinkResult {
  /** JWT access token */
  accessToken: string;
  /** Opaque refresh token */
  refreshToken: string;
  /** Authenticated user data (matches AuthResponseData from utils/response) */
  user: {
    id: UserId;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: 'user' | 'admin' | 'moderator';
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
 * Magic link request result.
 */
export interface RequestMagicLinkResult {
  /** Whether the request was processed */
  success: boolean;
  /** Human-readable message */
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if rate limit is exceeded for an email.
 *
 * @param repos - Repositories
 * @param email - Email to check
 * @param maxRequests - Max requests allowed in the window
 * @returns True if rate limited
 * @complexity O(1)
 */
async function isEmailRateLimited(
  repos: Repositories,
  email: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_EMAIL,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const requestCount = await repos.magicLinkTokens.countRecentByEmail(email, windowStart);
  return requestCount >= maxRequests;
}

/**
 * Check if rate limit is exceeded for an IP address.
 * Prevents abuse from a single source targeting multiple emails.
 *
 * @param repos - Repositories
 * @param ipAddress - IP address to check
 * @param maxRequests - Max requests allowed in the window
 * @returns True if rate limited
 * @complexity O(1)
 */
async function isIpRateLimited(
  repos: Repositories,
  ipAddress: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS_PER_IP,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const requestCount = await repos.magicLinkTokens.countRecentByIp(ipAddress, windowStart);
  return requestCount >= maxRequests;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Magic link request options.
 */
export interface MagicLinkRequestOptions {
  /** Token expiry in minutes (default: 15) */
  tokenExpiryMinutes?: number;
  /** Max requests per email per hour (default: 3) */
  maxAttemptsPerEmail?: number;
  /** Max requests per IP per hour (default: 10) */
  maxAttemptsPerIp?: number;
}

/**
 * Request a magic link for passwordless authentication.
 *
 * @param _db - Database client (kept for interface consistency)
 * @param repos - Repositories for database operations
 * @param emailService - Email service for sending magic links
 * @param emailTemplates - Email templates for rendering the magic link email
 * @param email - User's email address
 * @param baseUrl - Frontend base URL for the magic link
 * @param ipAddress - Client IP address (for security logging and rate limiting)
 * @param userAgent - Client user agent (for security logging)
 * @param options - Optional configuration overrides
 * @returns Result indicating success (always returns success to prevent email enumeration)
 * @throws {TooManyRequestsError} If rate limit is exceeded
 * @complexity O(1)
 */
export async function requestMagicLink(
  _db: DbClient,
  repos: Repositories,
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  email: string,
  baseUrl: string,
  ipAddress?: string,
  userAgent?: string,
  options?: MagicLinkRequestOptions,
): Promise<RequestMagicLinkResult> {
  const {
    tokenExpiryMinutes = DEFAULT_TOKEN_EXPIRY_MINUTES,
    maxAttemptsPerEmail = DEFAULT_MAX_REQUESTS_PER_EMAIL,
    maxAttemptsPerIp = DEFAULT_MAX_REQUESTS_PER_IP,
  } = options ?? {};

  const normalizedEmail = normalizeEmail(email);
  const canonicalEmail = canonicalizeEmail(email);

  // Check email-based rate limit (using repository)
  const emailRateLimited = await isEmailRateLimited(repos, canonicalEmail, maxAttemptsPerEmail);
  if (emailRateLimited) {
    throw new TooManyRequestsError('Too many magic link requests. Please try again later.');
  }

  // Check IP-based rate limit (if IP is provided)
  if (ipAddress !== undefined && ipAddress !== '') {
    const ipRateLimited = await isIpRateLimited(repos, ipAddress, maxAttemptsPerIp);
    if (ipRateLimited) {
      throw new TooManyRequestsError(
        'Too many requests from this location. Please try again later.',
      );
    }
  }

  // Generate token
  const token = generateBase64UrlToken(TOKEN_BYTES);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000);

  // Store hashed token (using repository)
  await repos.magicLinkTokens.create({
    email: canonicalEmail,
    tokenHash,
    expiresAt,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  // Build magic link URL
  const magicLinkUrl = `${baseUrl}/auth/magic-link?token=${token}`;

  // Send email
  const emailTemplate = emailTemplates.magicLink(magicLinkUrl, tokenExpiryMinutes);

  try {
    // Build email options explicitly to avoid exactOptionalPropertyTypes issues
    // when spreading emailTemplate which may have optional html/text as undefined
    const emailOptions: Parameters<typeof emailService.send>[0] = {
      to: normalizedEmail,
      subject: emailTemplate.subject,
    };
    if (emailTemplate.html !== undefined) {
      emailOptions.html = emailTemplate.html;
    }
    if (emailTemplate.text !== undefined) {
      emailOptions.text = emailTemplate.text;
    }
    await emailService.send(emailOptions);
  } catch (error) {
    // Token was created but email failed
    throw new EmailSendError(
      'Failed to send magic link email',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with this email, a magic link has been sent.',
  };
}

/**
 * Verify a magic link token and authenticate the user.
 *
 * Uses atomic update to prevent race conditions - the token is marked as used
 * in the same operation that validates it, ensuring only one request can succeed.
 *
 * @param db - Database client
 * @param repos - Repositories for username uniqueness checks
 * @param config - Auth configuration
 * @param token - The magic link token from the URL
 * @returns Authentication result with tokens and user info
 * @throws {InvalidTokenError} If token is invalid, expired, or already used
 * @complexity O(1) - constant database operations
 */
export async function verifyMagicLink(
  db: DbClient,
  repos: Repositories,
  config: AuthConfig,
  token: string,
): Promise<MagicLinkResult> {
  // Hash the token to look it up
  const tokenHash = hashToken(token);

  // Find or create user and generate tokens atomically
  const result = await withTransaction(db, async (tx) => {
    // Atomically mark token as used while validating it
    // This prevents race conditions - only the first request succeeds
    const now = new Date();
    type TokenRecord = Record<string, unknown> & {
      id: string;
      email: string;
      token_hash: string;
      expires_at: Date;
      used_at: Date | null;
    };
    const tokenRecords = await tx.query<TokenRecord>(
      update(MAGIC_LINK_TOKENS_TABLE)
        .set({ used_at: now })
        .where(and(eq('token_hash', tokenHash), gt('expires_at', now), isNull('used_at')))
        .returningAll()
        .toSql(),
    );
    const tokenRecord = tokenRecords[0];

    // If no rows were updated, token is invalid, expired, or already used
    if (tokenRecord == null) {
      throw new InvalidTokenError('Invalid or expired magic link');
    }

    // Find existing user
    const tokenCanonicalEmail = canonicalizeEmail(tokenRecord.email);
    const userRow = await tx.queryOne(
      select(USERS_TABLE).where(eq('canonical_email', tokenCanonicalEmail)).limit(1).toSql(),
    );
    let user: User | null = userRow != null ? toCamelCase<User>(userRow, USER_COLUMNS) : null;

    // If user doesn't exist, create them
    if (user == null) {
      // Generate a unique username from the email prefix
      const username = await generateUniqueUsername(repos, tokenRecord.email);
      const normalizedTokenEmail = normalizeEmail(tokenRecord.email);
      const canonicalTokenEmail = canonicalizeEmail(tokenRecord.email);

      const newUserRows = await tx.query(
        insert(USERS_TABLE)
          .values({
            email: normalizedTokenEmail,
            canonical_email: canonicalTokenEmail,
            username,
            first_name: 'User',
            last_name: '',
            // Magic link users don't have a password - generate a random unusable hash
            password_hash: `magiclink:${randomBytes(32).toString('hex')}`,
            role: 'user',
            email_verified: true, // Email is verified by using magic link
            email_verified_at: new Date(),
          })
          .returningAll()
          .toSql(),
      );

      if (newUserRows[0] == null) {
        throw new Error('Failed to create user');
      }
      user = toCamelCase<User>(newUserRows[0], USER_COLUMNS);
    } else if (!user.emailVerified) {
      // If user exists but email not verified, verify it now
      const updatedRows = await tx.query(
        update(USERS_TABLE)
          .set({ email_verified: true, email_verified_at: new Date() })
          .where(eq('id', user.id))
          .returningAll()
          .toSql(),
      );

      if (updatedRows[0] != null) {
        user = toCamelCase<User>(updatedRows[0], USER_COLUMNS);
      }
    }

    // Create refresh token
    const { token: refreshToken } = await createRefreshTokenFamily(
      tx,
      user.id,
      config.refreshToken.expiryDays,
    );

    return { user, refreshToken };
  });

  // Create access token
  const accessToken = createAccessToken(
    result.user.id,
    result.user.email,
    result.user.role,
    config.jwt.secret,
    config.jwt.accessTokenExpiry,
  );

  return createAuthResponse(accessToken, result.refreshToken, result.user);
}

/**
 * Clean up expired magic link tokens.
 * Should be called periodically by a scheduled job.
 *
 * @param _db - Database client (kept for interface consistency)
 * @param repos - Repositories for database operations
 * @returns Number of tokens deleted
 * @complexity O(n) where n is the number of expired tokens
 */
export async function cleanupExpiredMagicLinkTokens(
  _db: DbClient,
  repos: Repositories,
): Promise<number> {
  return repos.magicLinkTokens.deleteExpired();
}
