// src/server/engine/src/security/token.ts
/**
 * Security Token Utilities
 *
 * Common security functions for CSRF token generation, signing,
 * encryption, and validation. Uses Node.js native crypto module.
 *
 * @module @abe-stack/server-engine/security/token
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for CSRF token validation.
 *
 * @param secret - The secret key used for HMAC signing / AES encryption
 * @param encrypted - Whether the cookie token is AES-256-GCM encrypted
 * @param signed - Whether the cookie token is HMAC-signed
 */
export interface CsrfValidationOptions {
  secret: string;
  encrypted?: boolean;
  signed?: boolean;
}

// ============================================================================
// Token Generation & Validation
// ============================================================================

/** Number of random bytes for CSRF tokens. */
export const TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token.
 *
 * @returns A random base64url-encoded token
 * @complexity O(1)
 */
export function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Create a signed CSRF token.
 *
 * @param token - The token to sign
 * @param secret - The secret key for HMAC signing
 * @returns Signed token in format "token.signature"
 * @complexity O(1)
 */
export function signToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64url');
  return `${token}.${signature}`;
}

/**
 * Verify a signed CSRF token.
 *
 * @param signedToken - The signed token to verify
 * @param secret - The secret key used for signing
 * @returns Object with valid flag and extracted token (null if invalid)
 * @complexity O(1)
 */
export function verifyToken(
  signedToken: string,
  secret: string,
): { valid: boolean; token: string | null } {
  const lastDotIdx = signedToken.lastIndexOf('.');
  if (lastDotIdx < 0) {
    return { valid: false, token: null };
  }

  const token = signedToken.slice(0, lastDotIdx);
  const signature = signedToken.slice(lastDotIdx + 1);

  const expectedSignature = createHmac('sha256', secret).update(token).digest('base64url');

  try {
    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, token: null };
    }

    if (timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: true, token };
    }
  } catch {
    // Invalid base64
  }

  return { valid: false, token: null };
}

/**
 * Encrypt a CSRF token using AES-256-GCM.
 *
 * @param token - The token to encrypt
 * @param secret - The secret key for deriving encryption key
 * @returns Encrypted token in format "iv.encrypted.authTag"
 * @complexity O(1)
 */
export function encryptToken(token: string, secret: string): string {
  const key = createHmac('sha256', secret).update('csrf-encryption-key').digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(token, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');

  const authTag = cipher.getAuthTag().toString('base64url');

  // Format: iv.encrypted.authTag
  return `${iv.toString('base64url')}.${encrypted}.${authTag}`;
}

/**
 * Decrypt a CSRF token using AES-256-GCM.
 *
 * @param encryptedToken - The encrypted token to decrypt
 * @param secret - The secret key for deriving decryption key
 * @returns Decrypted token string or null if decryption fails
 * @complexity O(1)
 */
export function decryptToken(encryptedToken: string, secret: string): string | null {
  try {
    const parts = encryptedToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const ivStr = parts[0];
    const encryptedPart = parts[1];
    const authTagStr = parts[2];

    if (
      ivStr == null ||
      ivStr === '' ||
      encryptedPart == null ||
      encryptedPart === '' ||
      authTagStr == null ||
      authTagStr === ''
    ) {
      return null;
    }

    const key = createHmac('sha256', secret).update('csrf-encryption-key').digest();
    const iv = Buffer.from(ivStr, 'base64url');
    const authTag = Buffer.from(authTagStr, 'base64url');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedPart, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Validate a CSRF token pair (cookie token and request token).
 * Used for WebSocket upgrades and other non-Fastify contexts.
 *
 * @param cookieToken - The token from the CSRF cookie
 * @param requestToken - The token from the request (header, query param, etc.)
 * @param options - Validation options (must match how tokens were generated)
 * @returns true if the tokens are valid and match
 * @complexity O(1)
 */
export function validateCsrfToken(
  cookieToken: string | undefined,
  requestToken: string | undefined,
  options: CsrfValidationOptions,
): boolean {
  const { secret, encrypted = false, signed = true } = options;

  if ((cookieToken ?? '') === '' || (requestToken ?? '') === '') {
    return false;
  }

  // Verify the cookie token
  let cookieResult: { valid: boolean; token: string | null };

  if (encrypted) {
    // Decrypt first, then verify signature if signed
    const decryptedToken = decryptToken(cookieToken as string, secret);
    if (decryptedToken == null) {
      return false;
    }

    cookieResult = signed
      ? verifyToken(decryptedToken, secret)
      : { valid: true, token: decryptedToken };
  } else {
    cookieResult = signed
      ? verifyToken(cookieToken as string, secret)
      : { valid: true, token: cookieToken as string };
  }

  if (!cookieResult.valid || cookieResult.token == null) {
    return false;
  }

  // Compare tokens (timing-safe)
  try {
    const tokenBuffer = Buffer.from(requestToken as string);
    const expectedBuffer = Buffer.from(cookieResult.token);

    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
