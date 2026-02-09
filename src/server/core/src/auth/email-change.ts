// src/server/core/src/auth/email-change.ts

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

import { createHash, randomBytes } from 'node:crypto';

import {
  canonicalizeEmail,
  InvalidCredentialsError,
  InvalidTokenError,
  normalizeEmail,
} from '@abe-stack/shared';

import { revokeAllUserTokens, verifyPasswordSafe } from './utils';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
import type { DbClient, Repositories } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Constants
// ============================================================================

const EMAIL_CHANGE_TOKEN_EXPIRY_HOURS = 24;
const EMAIL_CHANGE_REVERT_TOKEN_EXPIRY_HOURS = 48;

/**
 * Lightweight Argon2 config for token hashing.
 */
/**
 * Hash a token using SHA-256 for deterministic lookup.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
  previousEmail: string;
  userId: string;
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
  const normalizedNewEmail = normalizeEmail(newEmail);
  const canonicalNewEmail = canonicalizeEmail(newEmail);

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
  const existingUser = await repos.users.findByEmail(canonicalNewEmail);
  if (existingUser !== null && existingUser.id !== userId) {
    // Don't reveal that the email is taken — return success message
    // to prevent user enumeration
    return {
      success: true,
      message: 'If the email is available, a verification link has been sent.',
    };
  }

  // 3. Generate verification token
  const plain = randomBytes(32).toString('hex');
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidate any existing email change tokens for this user
  await db.raw(
    `UPDATE email_change_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  // Store the token
  await db.raw(
    `INSERT INTO email_change_tokens (user_id, new_email, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, normalizedNewEmail, tokenHash, expiresAt.toISOString()],
  );

  // 4. Send verification email to new address
  const verifyUrl = `${baseUrl ?? config.jwt.issuer}/auth/change-email/confirm?token=${plain}`;

  try {
    const template = emailTemplates.emailVerification(
      verifyUrl,
      EMAIL_CHANGE_TOKEN_EXPIRY_HOURS * 60,
    );

    await emailService.send({
      to: normalizedNewEmail,
      subject: 'Confirm your new email address',
      ...(template.html !== undefined ? { html: template.html } : {}),
      ...(template.text !== undefined ? { text: template.text } : {}),
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
  const tokenHash = hashToken(token);

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

  const canonicalNewEmail = canonicalizeEmail(tokenRecord.new_email);

  // Check the new email is still available
  const existingUser = await repos.users.findByEmail(canonicalNewEmail);
  if (existingUser !== null) {
    throw new InvalidTokenError('Email address is no longer available');
  }

  // Fetch the user's current email before changing it
  const user = await repos.users.findById(tokenRecord.user_id);
  if (user === null) {
    throw new InvalidTokenError('User not found');
  }
  const previousEmail = user.email;

  // Update the user's email and mark token as used
  await db.raw(
    `UPDATE users SET email = $1, canonical_email = $2, updated_at = now(), version = version + 1 WHERE id = $3`,
    [tokenRecord.new_email, canonicalNewEmail, tokenRecord.user_id],
  );

  await db.raw(`UPDATE email_change_tokens SET used_at = now() WHERE id = $1`, [tokenRecord.id]);

  return {
    success: true,
    message: 'Email address has been updated successfully.',
    email: tokenRecord.new_email,
    previousEmail,
    userId: tokenRecord.user_id,
  };
}

// ============================================================================
// Email Change Reversion
// ============================================================================

export interface EmailChangeRevertResult {
  message: string;
  email: string;
}

/**
 * Create a reversion token for an email change.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param oldEmail - Previous email address
 * @param newEmail - New email address
 * @returns Plain token for email link
 */
export async function createEmailChangeRevertToken(
  db: DbClient,
  userId: string,
  oldEmail: string,
  newEmail: string,
): Promise<string> {
  const plain = randomBytes(32).toString('hex');
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_REVERT_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.raw(
    `UPDATE email_change_revert_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await db.raw(
    `INSERT INTO email_change_revert_tokens (user_id, old_email, new_email, token_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [userId, oldEmail, newEmail, tokenHash, expiresAt.toISOString()],
  );

  return plain;
}

/**
 * Revert an email change using a reversion token.
 * Locks the account and revokes all sessions as a safety measure.
 *
 * @param db - Database client
 * @param repos - Repositories
 * @param token - Reversion token
 * @returns Result with reverted email
 */
export async function revertEmailChange(
  db: DbClient,
  repos: Repositories,
  token: string,
): Promise<EmailChangeRevertResult> {
  const tokenHash = hashToken(token);

  const result = await db.raw<{
    id: string;
    user_id: string;
    old_email: string;
    new_email: string;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT id, user_id, old_email, new_email, expires_at, used_at FROM email_change_revert_tokens WHERE token_hash = $1`,
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

  const user = await repos.users.findById(tokenRecord.user_id);
  if (user === null) {
    throw new InvalidTokenError('User not found');
  }

  if (normalizeEmail(user.email) !== normalizeEmail(tokenRecord.new_email)) {
    throw new InvalidTokenError('Email change already reversed or superseded');
  }

  const canonicalOldEmail = canonicalizeEmail(tokenRecord.old_email);
  const lockedUntil = new Date('2099-12-31T23:59:59.999Z');

  await db.raw(
    `UPDATE users SET email = $1, canonical_email = $2, locked_until = $3, updated_at = now(), version = version + 1 WHERE id = $4`,
    [tokenRecord.old_email, canonicalOldEmail, lockedUntil.toISOString(), tokenRecord.user_id],
  );

  await db.raw(`UPDATE email_change_revert_tokens SET used_at = now() WHERE id = $1`, [
    tokenRecord.id,
  ]);

  await revokeAllUserTokens(db, tokenRecord.user_id);

  return {
    message: 'Email address has been reverted and your account has been locked.',
    email: tokenRecord.old_email,
  };
}
