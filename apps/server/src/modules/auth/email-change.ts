// modules/auth/src/email-change.ts

/**
 * Email Change Service
 *
 * Provides email change flow with verification:
 * 1. User requests email change (must verify password)
 * 2. Verification email sent to new address
 * 3. User clicks link to confirm the change
 *
 * @module email-change
 */

import { randomBytes } from 'node:crypto';

import { type DbClient, type Repositories } from '@abe-stack/db';
import { InvalidCredentialsError, InvalidTokenError, type AuthConfig } from '@abe-stack/shared';

import { hashPassword, verifyPasswordSafe } from './utils';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';

// ============================================================================
// Constants
// ============================================================================

const EMAIL_CHANGE_TOKEN_EXPIRY_HOURS = 24;

/**
 * Lightweight Argon2 config for token hashing.
 */
const TOKEN_HASH_CONFIG = {
  type: 2 as const, // argon2id
  memoryCost: 8192,
  timeCost: 1,
  parallelism: 1,
};

// ============================================================================
// Types
// ============================================================================

export interface EmailChangeResult {
  success: boolean;
  message: string;
}

export interface EmailChangeConfirmResult {
  success: boolean;
  message: string;
  email: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Initiate an email change.
 *
 * 1. Verify the user's password
 * 2. Check the new email isn't already taken
 * 3. Generate a verification token
 * 4. Send verification email to the new address
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param emailService - Email service
 * @param emailTemplates - Email templates
 * @param config - Auth configuration
 * @param userId - Authenticated user ID
 * @param newEmail - New email address
 * @param password - User's current password (for identity verification)
 * @param baseUrl - Base URL for verification link
 * @returns Result with success/message
 */
export async function initiateEmailChange(
  db: DbClient,
  repos: Repositories,
  emailService: AuthEmailService,
  emailTemplates: AuthEmailTemplates,
  config: AuthConfig,
  userId: string,
  newEmail: string,
  password: string,
  baseUrl?: string,
  log?: AuthLogger,
): Promise<EmailChangeResult> {
  // 1. Get user and verify password
  const user = await repos.users.findById(userId);
  if (user === null) {
    throw new InvalidCredentialsError();
  }

  const passwordValid = await verifyPasswordSafe(password, user.passwordHash);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }

  // 2. Check if new email is already taken
  const existingUser = await repos.users.findByEmail(newEmail);
  if (existingUser !== null) {
    // Don't reveal that the email is taken — return success message
    // to prevent user enumeration
    return {
      success: true,
      message: 'If the email is available, a verification link has been sent.',
    };
  }

  // 3. Generate verification token
  const plain = randomBytes(32).toString('hex');
  const tokenHash = await hashPassword(plain, TOKEN_HASH_CONFIG);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidate any existing email change tokens for this user
  await db.raw(
    `UPDATE email_change_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  // Store the token
  await db.raw(
    `INSERT INTO email_change_tokens (user_id, new_email, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, newEmail, tokenHash, expiresAt.toISOString()],
  );

  // 4. Send verification email to new address
  const verifyUrl = `${baseUrl ?? config.jwt.issuer}/api/auth/change-email/confirm?token=${plain}`;

  try {
    const html = emailTemplates.emailVerification(
      verifyUrl,
      EMAIL_CHANGE_TOKEN_EXPIRY_HOURS * 60,
    );

    await emailService.send({
      to: newEmail,
      subject: 'Confirm your new email address',
      html: html.html,
      text: html.text,
    });
  } catch (error) {
    log?.error({ err: error }, 'Failed to send email change verification');
  }

  return {
    success: true,
    message: 'If the email is available, a verification link has been sent.',
  };
}

/**
 * Confirm an email change using the verification token.
 *
 * 1. Verify the token
 * 2. Check the new email is still available
 * 3. Update the user's email
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param token - Verification token from email link
 * @returns Result with new email
 */
export async function confirmEmailChange(
  db: DbClient,
  repos: Repositories,
  token: string,
): Promise<EmailChangeConfirmResult> {
  // Hash the token to look it up
  const tokenHash = await hashPassword(token, TOKEN_HASH_CONFIG);

  // Find valid token
  const result = await db.raw<{
    id: string;
    user_id: string;
    new_email: string;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT id, user_id, new_email, expires_at, used_at FROM email_change_tokens WHERE token_hash = $1`,
    [tokenHash],
  );

  const tokenRecord = result[0];

  if (tokenRecord === undefined) {
    throw new InvalidTokenError('Invalid or expired token');
  }

  if (tokenRecord.used_at !== null) {
    throw new InvalidTokenError('Token has already been used');
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    throw new InvalidTokenError('Token has expired');
  }

  // Check the new email is still available
  const existingUser = await repos.users.findByEmail(tokenRecord.new_email);
  if (existingUser !== null) {
    throw new InvalidTokenError('Email address is no longer available');
  }

  // Update the user's email and mark token as used
  await db.raw(
    `UPDATE users SET email = $1, updated_at = now(), version = version + 1 WHERE id = $2`,
    [tokenRecord.new_email, tokenRecord.user_id],
  );

  await db.raw(
    `UPDATE email_change_tokens SET used_at = now() WHERE id = $1`,
    [tokenRecord.id],
  );

  return {
    success: true,
    message: 'Email address has been updated successfully.',
    email: tokenRecord.new_email,
  };
}
