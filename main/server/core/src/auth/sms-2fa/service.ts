// main/server/core/src/auth/sms-2fa/service.ts
/**
 * SMS 2FA Service
 *
 * Business logic for sending and verifying SMS verification codes.
 * Uses SHA-256 hashing for code storage and timing-safe comparison for verification.
 *
 * @module sms-2fa
 */

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { SMS_VERIFICATION_CODES_TABLE } from '../../../../db/src';

import { SMS_CODE_EXPIRY_MS, SMS_MAX_ATTEMPTS } from './types';

import type { DbClient } from '../../../../db/src';
import type { SmsProvider } from '../../../../system/src';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Generate a cryptographically secure 6-digit code.
 *
 * @returns 6-digit numeric string (zero-padded)
 * @complexity O(1)
 */
function generateSmsCode(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Hash a verification code with SHA-256.
 *
 * SMS codes are short-lived (5 min) and 6 digits, so SHA-256 is sufficient.
 * Argon2 would be overkill given the tight expiry and attempt limits.
 *
 * @param code - Plaintext verification code
 * @returns Hex-encoded SHA-256 hash
 * @complexity O(1)
 */
function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Compare two hex-encoded hashes in constant time to prevent timing attacks.
 *
 * @param hash1 - First hash (hex string)
 * @param hash2 - Second hash (hex string)
 * @returns Whether the hashes match
 * @complexity O(n) where n = hash length
 */
function timingSafeCompare(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) return false;
  const buf1 = Buffer.from(hash1, 'hex');
  const buf2 = Buffer.from(hash2, 'hex');
  return timingSafeEqual(buf1, buf2);
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Send an SMS verification code to a phone number.
 *
 * Generates a 6-digit code, hashes it with SHA-256, stores it in the database,
 * and sends it via the configured SMS provider.
 *
 * @param db - Database client
 * @param smsProvider - SMS provider for sending messages
 * @param userId - User ID
 * @param phone - Phone number to send the code to
 * @returns Whether the SMS was sent successfully
 * @throws Error if the SMS provider fails to send
 * @complexity O(1)
 */
export async function sendSms2faCode(
  db: DbClient,
  smsProvider: SmsProvider,
  userId: string,
  phone: string,
): Promise<{ success: boolean; error?: string }> {
  const code = generateSmsCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRY_MS);

  // Invalidate any existing pending codes for this user
  await db.raw(
    `UPDATE ${SMS_VERIFICATION_CODES_TABLE} SET verified = true
     WHERE user_id = $1 AND verified = false AND expires_at > NOW()`,
    [userId],
  );

  // Store the hashed code
  await db.raw(
    `INSERT INTO ${SMS_VERIFICATION_CODES_TABLE} (user_id, phone, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, phone, codeHash, expiresAt],
  );

  // Send the code via SMS provider
  const result = await smsProvider.send({
    to: phone,
    body: `Your verification code is: ${code}. It expires in 5 minutes.`,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? 'Failed to send SMS' };
  }

  return { success: true };
}

/**
 * Verify an SMS verification code.
 *
 * Checks the code against stored hashes using timing-safe comparison.
 * Enforces max attempt limits and expiry.
 *
 * @param db - Database client
 * @param userId - User ID
 * @param code - Plaintext 6-digit code to verify
 * @returns Whether the code is valid
 * @complexity O(1)
 */
export async function verifySms2faCode(
  db: DbClient,
  userId: string,
  code: string,
): Promise<{ valid: boolean; message: string }> {
  // Find the latest unverified, unexpired code for this user
  const result = await db.raw<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
  }>(
    `SELECT id, code_hash, attempts, expires_at FROM ${SMS_VERIFICATION_CODES_TABLE}
     WHERE user_id = $1 AND verified = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const record = result[0];

  if (record === undefined) {
    return { valid: false, message: 'No pending verification code. Please request a new one.' };
  }

  // Check attempt limit
  if (record.attempts >= SMS_MAX_ATTEMPTS) {
    // Mark as consumed to prevent further attempts
    await db.raw(`UPDATE ${SMS_VERIFICATION_CODES_TABLE} SET verified = true WHERE id = $1`, [
      record.id,
    ]);
    return { valid: false, message: 'Too many attempts. Please request a new code.' };
  }

  // Increment attempts
  await db.raw(`UPDATE ${SMS_VERIFICATION_CODES_TABLE} SET attempts = attempts + 1 WHERE id = $1`, [
    record.id,
  ]);

  // Timing-safe compare
  const codeHash = hashCode(code);
  const isValid = timingSafeCompare(codeHash, record.code_hash);

  if (!isValid) {
    const remainingAttempts = SMS_MAX_ATTEMPTS - record.attempts - 1;
    return {
      valid: false,
      message:
        remainingAttempts > 0
          ? `Invalid code. ${String(remainingAttempts)} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
          : 'Invalid code. Please request a new one.',
    };
  }

  // Mark as verified
  await db.raw(`UPDATE ${SMS_VERIFICATION_CODES_TABLE} SET verified = true WHERE id = $1`, [
    record.id,
  ]);

  return { valid: true, message: 'Code verified successfully.' };
}

/**
 * Check if a user has a pending (unverified, unexpired) SMS verification code.
 *
 * @param db - Database client
 * @param userId - User ID
 * @returns The pending code record or null
 * @complexity O(1)
 */
export async function getSmsVerificationCode(
  db: DbClient,
  userId: string,
): Promise<{ id: string; phone: string; expiresAt: Date; attempts: number } | null> {
  const result = await db.raw<{
    id: string;
    phone: string;
    expires_at: Date;
    attempts: number;
  }>(
    `SELECT id, phone, expires_at, attempts FROM ${SMS_VERIFICATION_CODES_TABLE}
     WHERE user_id = $1 AND verified = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const record = result[0];
  if (record === undefined) return null;

  return {
    id: record.id,
    phone: record.phone,
    expiresAt: record.expires_at,
    attempts: record.attempts,
  };
}
