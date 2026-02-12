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

import {
  AUTH_EXPIRY,
  canonicalizeEmail,
  InvalidCredentialsError,
  InvalidTokenError,
  MS_PER_HOUR,
  normalizeEmail,
} from '@abe-stack/shared';

import { generateSecureToken, hashToken, revokeAllUserTokens, verifyPasswordSafe } from './utils';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
import type { DbClient, Repositories } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

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
  _db: DbClient,
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
    // Don't reveal that the email is taken -- return success message
    // to prevent user enumeration
    return {
      success: true,
      message: 'If the email is available, a verification link has been sent.',
    };
  }

  // 3. Generate verification token
  const { plain, hash: tokenHash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + AUTH_EXPIRY.EMAIL_CHANGE_HOURS * MS_PER_HOUR);

  // Invalidate any existing email change tokens for this user
  await repos.emailChangeTokens.invalidateForUser(userId);

  // Store the token
  await repos.emailChangeTokens.create({
    userId,
    newEmail: normalizedNewEmail,
    tokenHash,
    expiresAt,
  });

  // 4. Send verification email to new address
  const verifyUrl = `${baseUrl ?? config.jwt.issuer}/auth/change-email/confirm?token=${plain}`;

  try {
    const template = emailTemplates.emailVerification(
      verifyUrl,
      AUTH_EXPIRY.EMAIL_CHANGE_HOURS * 60,
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
 * @param _db - Database client (unused, kept for API compatibility)
 * @param repos - Repositories
 * @param token - Verification token from email link
 * @returns Result with new email
 */
export async function confirmEmailChange(
  _db: DbClient,
  repos: Repositories,
  token: string,
): Promise<EmailChangeConfirmResult> {
  // Hash the token to look it up
  const tokenHash = hashToken(token);

  // Find token by hash
  const tokenRecord = await repos.emailChangeTokens.findByTokenHash(tokenHash);

  if (tokenRecord === null) {
    throw new InvalidTokenError('Invalid or expired token');
  }

  if (tokenRecord.usedAt !== null) {
    throw new InvalidTokenError('Token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new InvalidTokenError('Token has expired');
  }

  const canonicalNewEmail = canonicalizeEmail(tokenRecord.newEmail);

  // Check the new email is still available
  const existingUser = await repos.users.findByEmail(canonicalNewEmail);
  if (existingUser !== null) {
    throw new InvalidTokenError('Email address is no longer available');
  }

  // Fetch the user's current email before changing it
  const user = await repos.users.findById(tokenRecord.userId);
  if (user === null) {
    throw new InvalidTokenError('User not found');
  }
  const previousEmail = user.email;

  // Update the user's email
  await repos.users.update(tokenRecord.userId, {
    email: tokenRecord.newEmail,
    canonicalEmail: canonicalNewEmail,
    updatedAt: new Date(),
  });

  // Mark token as used
  await repos.emailChangeTokens.markAsUsed(tokenRecord.id);

  return {
    success: true,
    message: 'Email address has been updated successfully.',
    email: tokenRecord.newEmail,
    previousEmail,
    userId: tokenRecord.userId,
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
 * @param _db - Database client (unused, kept for API compatibility)
 * @param repos - Repositories
 * @param userId - User ID
 * @param oldEmail - Previous email address
 * @param newEmail - New email address
 * @returns Plain token for email link
 */
export async function createEmailChangeRevertToken(
  _db: DbClient,
  repos: Repositories,
  userId: string,
  oldEmail: string,
  newEmail: string,
): Promise<string> {
  const { plain, hash: tokenHash } = generateSecureToken();
  const expiresAt = new Date(Date.now() + AUTH_EXPIRY.EMAIL_CHANGE_REVERT_HOURS * MS_PER_HOUR);

  // Invalidate any existing revert tokens for this user
  await repos.emailChangeRevertTokens.invalidateForUser(userId);

  // Store the token
  await repos.emailChangeRevertTokens.create({
    userId,
    oldEmail,
    newEmail,
    tokenHash,
    expiresAt,
  });

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

  // Find token by hash
  const tokenRecord = await repos.emailChangeRevertTokens.findByTokenHash(tokenHash);

  if (tokenRecord === null) {
    throw new InvalidTokenError('Invalid or expired token');
  }

  if (tokenRecord.usedAt !== null) {
    throw new InvalidTokenError('Token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new InvalidTokenError('Token has expired');
  }

  const user = await repos.users.findById(tokenRecord.userId);
  if (user === null) {
    throw new InvalidTokenError('User not found');
  }

  if (normalizeEmail(user.email) !== normalizeEmail(tokenRecord.newEmail)) {
    throw new InvalidTokenError('Email change already reversed or superseded');
  }

  const canonicalOldEmail = canonicalizeEmail(tokenRecord.oldEmail);
  const lockedUntil = new Date('2099-12-31T23:59:59.999Z');

  // Revert the user's email and lock the account
  await repos.users.update(tokenRecord.userId, {
    email: tokenRecord.oldEmail,
    canonicalEmail: canonicalOldEmail,
    lockedUntil,
    updatedAt: new Date(),
  });

  // Mark token as used
  await repos.emailChangeRevertTokens.markAsUsed(tokenRecord.id);

  await revokeAllUserTokens(db, tokenRecord.userId);

  return {
    message: 'Email address has been reverted and your account has been locked.',
    email: tokenRecord.oldEmail,
  };
}
