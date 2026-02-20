// main/apps/server/src/http/middleware/csrf.ts
/**
 * CSRF Protection
 *
 * Manual CSRF token generation and validation. Replaces @fastify/csrf-protection.
 * Uses the double-submit cookie pattern with signed tokens.
 */

import { encryptToken, generateToken, signToken, validateCsrfToken } from '@bslt/server-system';
import {
  AUTH_CONSTANTS,
  CSRF_EXEMPT_PATHS,
  HTTP_STATUS,
  SAFE_METHODS,
  extractCsrfToken,
} from '@bslt/shared';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const { CSRF_COOKIE_NAME } = AUTH_CONSTANTS;

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
    // Do NOT pass `signed` here — we already handle signing/encryption via
    // signToken/encryptToken above. Passing signed=true would double-sign.
    this.setCookie(cookieName, finalToken, {
      path,
      httpOnly,
      secure,
      sameSite,
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
    const urlPath = req.url.split('?')[0] ?? req.url;
    if (CSRF_EXEMPT_PATHS.has(urlPath)) {
      return;
    }

    // Get token from cookie
    const cookieToken = req.cookies[cookieName];
    if (cookieToken == null || cookieToken === '') {
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
        error: 'Forbidden',
        message: 'Missing CSRF token',
      });
      return;
    }

    // Get token from header or body (body is now parsed)
    const headerToken = extractCsrfToken(
      req.headers as Record<string, string | string[] | undefined>,
      req.body,
      headerName,
    );

    if (headerToken == null || headerToken === '') {
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
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
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
        error: 'Forbidden',
        message: 'CSRF token mismatch',
      });
      return;
    }
  });
}
