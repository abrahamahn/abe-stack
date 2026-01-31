// infra/http/src/middleware/csrf.ts
/**
 * CSRF Protection
 *
 * Manual CSRF token generation and validation. Replaces @fastify/csrf-protection.
 * Uses the double-submit cookie pattern with signed tokens.
 */

import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    randomBytes,
    timingSafeEqual,
} from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface CsrfOptions {
  cookieName?: string;
  headerName?: string;
  secret: string;
  encrypted?: boolean; // Use AES encryption for tokens in production
  cookieOpts?: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    signed?: boolean;
  };
}

declare module 'fastify' {
  interface FastifyReply {
    generateCsrf: () => string;
  }
}

// ============================================================================
// Token Generation & Validation
// ============================================================================

const TOKEN_LENGTH = 32;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF-Exempt Endpoints
 *
 * These paths are exempted from CSRF protection because they meet one or more
 * of the following security criteria:
 *
 * 1. No authenticated session exists to exploit (unauthenticated endpoints)
 * 2. Protected by one-time tokens that prevent replay attacks
 * 3. Protected by HTTP-only SameSite cookies (refresh token flow)
 *
 * Security rationale for each endpoint:
 *
 * - /api/auth/login
 *   No authenticated session to exploit. The user is not logged in yet,
 *   so there's no session state an attacker could abuse via CSRF.
 *
 * - /api/auth/register
 *   No existing session (new user creation). An attacker cannot force
 *   a victim to create an account they don't control.
 *
 * - /api/auth/forgot-password
 *   Public endpoint with no session state. The email is sent to the
 *   account owner, so forcing this request only sends a reset email
 *   to the legitimate user (mild annoyance, not a security issue).
 *
 * - /api/auth/reset-password
 *   Protected by a one-time, time-limited token sent via email.
 *   The token itself validates the request authenticity.
 *
 * - /api/auth/verify-email
 *   Protected by a one-time verification token. Only the recipient
 *   of the verification email can successfully call this endpoint.
 *
 * - /api/auth/refresh
 *   Protected by HTTP-only SameSite cookie containing the refresh token.
 *   The SameSite attribute prevents cross-origin requests from including
 *   the cookie, providing CSRF protection at the browser level.
 *
 * NOTE: /api/auth/logout is intentionally NOT exempt - logout requires CSRF
 * protection to prevent forced logout attacks (CSRF logout attack), where
 * an attacker could force a victim to log out of their session.
 */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/refresh',
]);

/**
 * Generate a CSRF token
 *
 * @returns A random base64url-encoded token
 */
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Create a signed CSRF token
 *
 * @param token - The token to sign
 * @param secret - The secret key for HMAC signing
 * @returns Signed token in format "token.signature"
 */
function signToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64url');
  return `${token}.${signature}`;
}

/**
 * Verify a signed CSRF token
 *
 * @param signedToken - The signed token to verify
 * @param secret - The secret key used for signing
 * @returns Object with valid flag and extracted token (null if invalid)
 */
function verifyToken(
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
 * Encrypt a CSRF token using AES-256-GCM
 *
 * @param token - The token to encrypt
 * @param secret - The secret key for deriving encryption key
 * @returns Encrypted token in format "iv.encrypted.authTag"
 */
function encryptToken(token: string, secret: string): string {
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
 * Decrypt a CSRF token using AES-256-GCM
 *
 * @param encryptedToken - The encrypted token to decrypt
 * @param secret - The secret key for deriving decryption key
 * @returns Decrypted token string or null if decryption fails
 */
function decryptToken(encryptedToken: string, secret: string): string | null {
  try {
    const parts = encryptedToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const ivStr = parts[0];
    const encryptedPart = parts[1];
    const authTagStr = parts[2];

    if (ivStr == null || ivStr === '' || encryptedPart == null || encryptedPart === '' || authTagStr == null || authTagStr === '') {
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

// ============================================================================
// Standalone CSRF Validation (for WebSocket upgrades, etc.)
// ============================================================================

export interface CsrfValidationOptions {
  secret: string;
  encrypted?: boolean;
  signed?: boolean;
}

/**
 * Validate a CSRF token pair (cookie token and request token).
 * Used for WebSocket upgrades and other non-Fastify contexts.
 *
 * @param cookieToken - The token from the CSRF cookie
 * @param requestToken - The token from the request (header, query param, etc.)
 * @param options - Validation options (must match how tokens were generated)
 * @returns true if the tokens are valid and match
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

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * Register CSRF protection on a Fastify instance
 *
 * @param server - The Fastify instance to register on
 * @param options - CSRF configuration options
 */
export function registerCsrf(server: FastifyInstance, options: CsrfOptions): void {
  const {
    cookieName = '_csrf',
    headerName = 'x-csrf-token',
    secret,
    encrypted = false,
    cookieOpts = {},
  } = options;

  const {
    path = '/',
    httpOnly = true,
    secure = process.env['NODE_ENV'] === 'production',
    sameSite = secure ? 'strict' : 'lax',
    signed = true,
  } = cookieOpts;

  // Decorate reply with generateCsrf method
  server.decorateReply('generateCsrf', function (this: FastifyReply): string {
    const token = generateToken();
    let finalToken = signed ? signToken(token, secret) : token;

    // Encrypt token if encryption is enabled
    if (encrypted) {
      finalToken = encryptToken(finalToken, secret);
    }

    // Set the CSRF cookie
    this.setCookie(cookieName, finalToken, {
      path,
      httpOnly,
      secure,
      sameSite,
      signed: false, // We handle signing ourselves
    });

    return token;
  });

  // Validate CSRF in preHandler (after body parsing)
  server.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Skip validation for safe methods
    if (SAFE_METHODS.has(req.method)) {
      return;
    }

    // Skip validation for exempt paths (auth endpoints)
    const path = req.url.split('?')[0] ?? req.url;
    if (CSRF_EXEMPT_PATHS.has(path)) {
      return;
    }

    // Get token from cookie
    const cookieToken = req.cookies[cookieName];
    if (cookieToken == null || cookieToken === '') {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Missing CSRF token',
      });
      return;
    }

    // Verify the cookie token
    let cookieResult: { valid: boolean; token: string | null };

    if (encrypted) {
      // Decrypt first, then verify signature if signed
      const decryptedToken = decryptToken(cookieToken, secret);
      if (decryptedToken == null) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'Invalid CSRF token',
        });
        return;
      }

      cookieResult = signed
        ? verifyToken(decryptedToken, secret)
        : { valid: true, token: decryptedToken };
    } else {
      cookieResult = signed
        ? verifyToken(cookieToken, secret)
        : { valid: true, token: cookieToken };
    }

    if (!cookieResult.valid || cookieResult.token == null) {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Invalid CSRF token',
      });
      return;
    }

    // Get token from header or body (body is now parsed)
    const headerToken =
      req.headers[headerName] ??
      req.headers[headerName.toLowerCase()] ??
      (req.body as Record<string, unknown> | null)?.['_csrf'];

    if ((headerToken ?? '') === '' || typeof headerToken !== 'string') {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'Missing CSRF token in request',
      });
      return;
    }

    // Compare tokens (timing-safe)
    try {
      const tokenBuffer = Buffer.from(headerToken);
      const expectedBuffer = Buffer.from(cookieResult.token);

      if (tokenBuffer.length !== expectedBuffer.length) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'CSRF token mismatch',
        });
        return;
      }

      if (!timingSafeEqual(tokenBuffer, expectedBuffer)) {
        reply.status(403).send({
          error: 'Forbidden',
          message: 'CSRF token mismatch',
        });
        return;
      }
    } catch {
      reply.status(403).send({
        error: 'Forbidden',
        message: 'CSRF token validation failed',
      });
      return;
    }
  });
}
