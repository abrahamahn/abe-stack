// apps/server/src/infra/http/csrf.ts
/**
 * CSRF Protection
 *
 * Manual CSRF token generation and validation. Replaces @fastify/csrf-protection.
 * Uses the double-submit cookie pattern with signed tokens.
 */

import {
  randomBytes,
  createHmac,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
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

// Routes that don't need CSRF protection (no authenticated session to exploit)
// NOTE: /api/auth/logout is intentionally NOT exempt - logout requires CSRF
// protection to prevent forced logout attacks (CSRF logout attack)
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
 */
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Create a signed CSRF token
 */
function signToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64url');
  return `${token}.${signature}`;
}

/**
 * Verify a signed CSRF token
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

    if (!ivStr || !encryptedPart || !authTagStr) {
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
// Fastify Plugin
// ============================================================================

/**
 * Register CSRF protection on a Fastify instance
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
    secure = process.env.NODE_ENV === 'production',
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
    if (!cookieToken) {
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
      if (!decryptedToken) {
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

    if (!cookieResult.valid || !cookieResult.token) {
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
      (req.body as Record<string, unknown> | null)?._csrf;

    if (!headerToken || typeof headerToken !== 'string') {
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
