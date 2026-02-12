// src/apps/server/src/http/middleware/csrf.ts
/**
 * CSRF Protection
 *
 * Manual CSRF token generation and validation. Replaces @fastify/csrf-protection.
 * Uses the double-submit cookie pattern with signed tokens.
 */

import {
  encryptToken,
  generateToken,
  signToken,
  validateCsrfToken,
} from '@abe-stack/server-engine';
import { CSRF_COOKIE_NAME, HTTP_STATUS } from '@abe-stack/shared';

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
  '/api/auth/resend-verification',
]);

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
    cookieName = CSRF_COOKIE_NAME,
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
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        error: 'Forbidden',
        message: 'Missing CSRF token',
      });
      return;
    }

    // Get token from header or body (body is now parsed)
    // Headers can be string | string[], so take first value if array
    const rawHeaderToken = req.headers[headerName] ?? req.headers[headerName.toLowerCase()];
    const headerFromRequest = Array.isArray(rawHeaderToken) ? rawHeaderToken[0] : rawHeaderToken;
    const headerToken =
      headerFromRequest ??
      ((req.body as Record<string, unknown> | null)?.['_csrf'] as string | undefined);

    if (headerToken == null || headerToken === '') {
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        error: 'Forbidden',
        message: 'Missing CSRF token in request',
      });
      return;
    }

    // Validate using shared utility
    const isValid = validateCsrfToken(cookieToken, headerToken, {
      secret,
      encrypted,
      signed,
    });

    if (!isValid) {
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        error: 'Forbidden',
        message: 'CSRF token mismatch',
      });
      return;
    }
  }); // Fixed missing closing brace/paren from previous edit if any
}
