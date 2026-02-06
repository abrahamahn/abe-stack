// backend/engine/src/security/jwt.ts
/**
 * Native JWT Implementation
 *
 * Minimal JWT implementation using Node's native crypto module.
 * Supports HS256 (HMAC SHA-256) - the standard for most applications.
 *
 * Zero dependencies. Full control over token handling.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

export interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  iat?: number; // Issued at (Unix timestamp)
  exp?: number; // Expiration (Unix timestamp)
  [key: string]: unknown;
}

export interface SignOptions {
  expiresIn?: string | number; // e.g., '15m', '7d', 3600
}

// ============================================================================
// Errors
// ============================================================================

export class JwtError extends Error {
  constructor(
    message: string,
    public readonly code: JwtErrorCode,
  ) {
    super(message);
    this.name = 'JwtError';
  }
}

export type JwtErrorCode =
  | 'INVALID_TOKEN'
  | 'INVALID_SIGNATURE'
  | 'TOKEN_EXPIRED'
  | 'MALFORMED_TOKEN';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Base64URL encode a string or buffer
 */
function base64UrlEncode(input: string | Buffer): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString('base64url');
}

/**
 * Base64URL decode to string
 */
function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Parse expiration string to seconds
 * Supports: 's' (seconds), 'm' (minutes), 'h' (hours), 'd' (days)
 */
function parseExpiration(exp: string | number): number {
  if (typeof exp === 'number') return exp;

  const match = exp.match(/^(\d+)([smhd])$/);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new JwtError(`Invalid expiration format: ${exp}`, 'INVALID_TOKEN');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

/**
 * Get current Unix timestamp in seconds
 */
function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Sign a payload and create a JWT token
 */
export function sign(payload: object, secret: string, options?: SignOptions): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };

  // Build payload with timestamps
  const now = nowInSeconds();
  const tokenPayload: JwtPayload = {
    ...payload,
    iat: now,
  };

  // Add expiration if specified
  if (options?.expiresIn !== undefined) {
    const expiresInSeconds = parseExpiration(options.expiresIn);
    tokenPayload.exp = now + expiresInSeconds;
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));

  // Create signature using HMAC SHA-256
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify a JWT token and return the payload
 * Throws JwtError if token is invalid, expired, or signature doesn't match
 */
export function verify(token: string, secret: string): JwtPayload {
  if (typeof token !== 'string') {
    throw new JwtError('Token must be a string', 'INVALID_TOKEN');
  }

  // Split token into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JwtError('Invalid token format', 'MALFORMED_TOKEN');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  if (
    encodedHeader === undefined ||
    encodedHeader === '' ||
    encodedPayload === undefined ||
    encodedPayload === '' ||
    signature === undefined ||
    signature === ''
  ) {
    throw new JwtError('Invalid token format', 'MALFORMED_TOKEN');
  }

  // 1. Verify Header first to ensure alg is HS256
  // This prevents "none" algorithm attacks
  let header: unknown;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
  } catch {
    throw new JwtError('Invalid header', 'MALFORMED_TOKEN');
  }

  if (
    header === null ||
    header === undefined ||
    typeof header !== 'object' ||
    (header as Record<string, unknown>)['alg'] !== 'HS256' ||
    (header as Record<string, unknown>)['typ'] !== 'JWT'
  ) {
    throw new JwtError('Algorithm not supported', 'INVALID_TOKEN');
  }

  // Verify signature using constant-time comparison
  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  // Constant-time comparison to prevent timing attacks
  const validSignature =
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!validSignature) {
    throw new JwtError('Invalid signature', 'INVALID_SIGNATURE');
  }

  // Decode and parse payload
  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
  } catch {
    throw new JwtError('Malformed token payload', 'MALFORMED_TOKEN');
  }

  // Check expiration
  if (payload.exp !== undefined) {
    const now = nowInSeconds();
    if (now >= payload.exp) {
      throw new JwtError('Token has expired', 'TOKEN_EXPIRED');
    }
  }

  return payload;
}

/**
 * Decode a JWT token without verification (useful for debugging)
 * WARNING: This does NOT verify the signature - never trust unverified data
 */
export function decode(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    const encodedPayload = parts[1];
    if (parts.length !== 3 || encodedPayload === undefined || encodedPayload === '') return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// Convenience Functions with Aliases
// ============================================================================

/**
 * Async wrapper for sign function (for compatibility with async interfaces)
 */
export function jwtSign(payload: object, secret: string, options?: SignOptions): string {
  return sign(payload, secret, options);
}

/**
 * Async wrapper for verify function (for compatibility with async interfaces)
 */
export function jwtVerify(token: string, secret: string): JwtPayload {
  return verify(token, secret);
}

/**
 * Alias for decode function
 */
export function jwtDecode(token: string): JwtPayload | null {
  return decode(token);
}

/**
 * Check if a token secret meets minimum requirements
 */
export function checkTokenSecret(secret: string): boolean {
  if (secret === '') {
    return false;
  }
  // Additional validation could be added here
  return true;
}
