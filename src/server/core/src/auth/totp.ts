// backend/core/src/auth/totp.ts

/**
 * TOTP (2FA) Service
 *
 * Provides TOTP setup, verification, enable/disable, and backup code management.
 * Uses the `otpauth` library for TOTP generation and verification.
 *
 * @module totp
 */

import { randomBytes } from 'node:crypto';

import * as otpAuth from 'otpauth';

import { hashPassword, verifyPasswordSafe } from './utils';

import type { DbClient } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Constants
// ============================================================================

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ALGORITHM = 'SHA1';

/**
 * Lightweight Argon2 config for backup code hashing.
 * Backup codes are already high-entropy, so we use minimal params.
 */
const BACKUP_CODE_HASH_CONFIG = {
  type: 2 as const, // argon2id
  memoryCost: 8192, // 8 MiB
  timeCost: 1,
  parallelism: 1,
};

// ============================================================================
// Types
// ============================================================================

export interface TotpSetupResult {
  /** Base32-encoded TOTP secret */
  secret: string;
  /** otpauth:// URI for QR code generation */
  otpauthUrl: string;
  /** Plaintext backup codes (only shown once) */
  backupCodes: string[];
}

export interface TotpVerifyResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Generate a new TOTP secret and backup codes for 2FA setup.
 *
 * This does NOT enable 2FA — the user must verify a code first via `enableTotp()`.
 * The secret is stored on the user record (totp_secret) but totp_enabled remains false
 * until verification.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param userEmail - User email (displayed in authenticator app)
 * @param config - Auth configuration (for TOTP issuer/window)
 * @returns Setup result with secret, otpauth URL, and backup codes
 */
export async function setupTotp(
  db: DbClient,
  userId: string,
  userEmail: string,
  config: AuthConfig,
): Promise<TotpSetupResult> {
  // Generate a new TOTP secret
  const secret = new otpAuth.Secret({ size: 20 });

  const totp = new otpAuth.TOTP({
    issuer: config.totp.issuer,
    label: userEmail,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  const otpauthUrl = totp.toString();

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  // Hash and store backup codes
  const codeHashes = await Promise.all(
    backupCodes.map(async (code) => ({
      codeHash: await hashPassword(code, BACKUP_CODE_HASH_CONFIG),
    })),
  );

  // Store secret on user (but don't enable yet) and store backup codes
  await db.raw(
    `UPDATE users SET totp_secret = $1, totp_enabled = false, updated_at = now() WHERE id = $2`,
    [secret.base32, userId],
  );

  // Delete any existing backup codes and insert new ones
  await db.raw(`DELETE FROM totp_backup_codes WHERE user_id = $1`, [userId]);
  for (const { codeHash } of codeHashes) {
    await db.raw(`INSERT INTO totp_backup_codes (user_id, code_hash) VALUES ($1, $2)`, [
      userId,
      codeHash,
    ]);
  }

  return {
    secret: secret.base32,
    otpauthUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP code and enable 2FA for the user.
 *
 * Called after `setupTotp()` to confirm the user has correctly configured
 * their authenticator app. Sets `totp_enabled = true`.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param code - 6-digit TOTP code from authenticator app
 * @param config - Auth configuration
 * @returns Verification result
 */
export async function enableTotp(
  db: DbClient,
  userId: string,
  code: string,
  config: AuthConfig,
): Promise<TotpVerifyResult> {
  // Get the user's TOTP secret
  const result = await db.raw<{ totp_secret: string | null; totp_enabled: boolean }>(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [userId],
  );
  const user = result[0];

  if (user?.totp_secret == null) {
    return { success: false, message: 'TOTP not set up. Call setup first.' };
  }

  if (user.totp_enabled) {
    return { success: false, message: '2FA is already enabled.' };
  }

  // Verify the code
  const isValid = verifyTotpCode(user.totp_secret, code, config.totp.window);
  if (!isValid) {
    return { success: false, message: 'Invalid TOTP code. Please try again.' };
  }

  // Enable 2FA
  await db.raw(`UPDATE users SET totp_enabled = true, updated_at = now() WHERE id = $1`, [userId]);

  return { success: true, message: '2FA has been enabled successfully.' };
}

/**
 * Disable 2FA for a user after verifying their current TOTP code.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param code - Current TOTP code (or backup code)
 * @param config - Auth configuration
 * @returns Verification result
 */
export async function disableTotp(
  db: DbClient,
  userId: string,
  code: string,
  config: AuthConfig,
): Promise<TotpVerifyResult> {
  const result = await db.raw<{ totp_secret: string | null; totp_enabled: boolean }>(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [userId],
  );
  const user = result[0];

  if (user === undefined || !user.totp_enabled || user.totp_secret === null) {
    return { success: false, message: '2FA is not enabled.' };
  }

  // Verify with TOTP code or backup code
  const isValid = verifyTotpCode(user.totp_secret, code, config.totp.window);
  const isBackupValid = !isValid && (await verifyBackupCode(db, userId, code));

  if (!isValid && !isBackupValid) {
    return { success: false, message: 'Invalid code. Please try again.' };
  }

  // Disable 2FA and clear secret
  await db.raw(
    `UPDATE users SET totp_enabled = false, totp_secret = NULL, updated_at = now() WHERE id = $1`,
    [userId],
  );

  // Delete backup codes
  await db.raw(`DELETE FROM totp_backup_codes WHERE user_id = $1`, [userId]);

  return { success: true, message: '2FA has been disabled.' };
}

/**
 * Check if a user has 2FA enabled.
 */
export async function getTotpStatus(db: DbClient, userId: string): Promise<{ enabled: boolean }> {
  const result = await db.raw<{ totp_enabled: boolean }>(
    `SELECT totp_enabled FROM users WHERE id = $1`,
    [userId],
  );
  const user = result[0];
  return { enabled: user?.totp_enabled === true };
}

/**
 * Verify a TOTP code during login (when 2FA is required).
 *
 * Checks the TOTP code first, then falls back to backup codes.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param code - TOTP code or backup code
 * @param config - Auth configuration
 * @returns Whether the code is valid
 */
export async function verifyTotpForLogin(
  db: DbClient,
  userId: string,
  code: string,
  config: AuthConfig,
): Promise<boolean> {
  const result = await db.raw<{ totp_secret: string | null; totp_enabled: boolean }>(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
    [userId],
  );
  const user = result[0];

  if (user === undefined || !user.totp_enabled || user.totp_secret === null) {
    return false;
  }

  // Try TOTP code first
  if (verifyTotpCode(user.totp_secret, code, config.totp.window)) {
    return true;
  }

  // Fall back to backup code
  return verifyBackupCode(db, userId, code);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Verify a TOTP code against a secret.
 */
function verifyTotpCode(secretBase32: string, code: string, window: number): boolean {
  const totp = new otpAuth.TOTP({
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: otpAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: code, window });
  return delta !== null;
}

/**
 * Verify and consume a backup code.
 * Each backup code can only be used once.
 */
async function verifyBackupCode(db: DbClient, userId: string, code: string): Promise<boolean> {
  const result = await db.raw<{ id: string; code_hash: string }>(
    `SELECT id, code_hash FROM totp_backup_codes WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  for (const row of result) {
    const matches = await verifyPasswordSafe(code, row.code_hash);
    if (matches) {
      // Mark as used
      await db.raw(`UPDATE totp_backup_codes SET used_at = now() WHERE id = $1`, [row.id]);
      return true;
    }
  }

  return false;
}

/**
 * Generate random backup codes.
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate 8-character alphanumeric codes (e.g., "A1B2-C3D4")
    const raw = randomBytes(BACKUP_CODE_LENGTH)
      .toString('hex')
      .slice(0, BACKUP_CODE_LENGTH)
      .toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}
