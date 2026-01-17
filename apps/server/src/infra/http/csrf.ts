// apps/server/src/infra/http/csrf.ts
/**
 * CSRF Protection
 *
 * Manual CSRF token generation and validation. Replaces @fastify/csrf-protection.
 * Uses the double-submit cookie pattern with signed tokens.
 */

import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface CsrfOptions {
  cookieName?: string;
  headerName?: string;
  secret: string;
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

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * Register CSRF protection on a Fastify instance
 */
export function registerCsrf(server: FastifyInstance, options: CsrfOptions): void {
  const { cookieName = '_csrf', headerName = 'x-csrf-token', secret, cookieOpts = {} } = options;

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
    const signedToken = signed ? signToken(token, secret) : token;

    // Set the CSRF cookie
    this.setCookie(cookieName, signedToken, {
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
    const cookieResult = signed
      ? verifyToken(cookieToken, secret)
      : { valid: true, token: cookieToken };

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
