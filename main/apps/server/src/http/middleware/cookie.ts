// main/apps/server/src/http/middleware/cookie.ts
/**
 * Cookie Utilities
 *
 * Manual cookie parsing and setting. Replaces @fastify/cookie.
 */

import { signToken, verifyToken } from '@bslt/server-system';
import { parseCookies, serializeCookie } from '@bslt/shared';

import type { CookieOptions, CookieSerializeOptions } from '@bslt/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Re-export shared cookie utilities for barrel consumers
export { parseCookies, serializeCookie };
export type { CookieOptions, CookieSerializeOptions };

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
    unsignCookie: (value: string) => { valid: boolean; value: string | null };
  }
  interface FastifyReply {
    setCookie: (name: string, value: string, options?: CookieOptions) => FastifyReply;
    clearCookie: (name: string, options?: CookieOptions) => FastifyReply;
  }
}

// ============================================================================
// Cookie Signing
// ============================================================================

/**
 * Sign a cookie value with HMAC-SHA256
 *
 * @param value - The cookie value to sign
 * @param secret - The secret key for HMAC signing
 * @returns The signed cookie value in format "value.signature"
 */
export function signCookie(value: string, secret: string): string {
  return signToken(value, secret);
}

/**
 * Verify and extract a signed cookie value
 *
 * @param signedValue - The signed cookie value to verify
 * @param secret - The secret key used for signing
 * @returns Object with valid flag and extracted value (null if invalid)
 */
export function unsignCookie(
  signedValue: string,
  secret: string,
): { valid: boolean; value: string | null } {
  const result = verifyToken(signedValue, secret);
  return {
    valid: result.valid,
    value: result.token,
  };
}

// ============================================================================
// Fastify Plugin
// ============================================================================

export interface CookiePluginOptions {
  secret: string;
  parseOptions?: Record<string, unknown>;
}

/**
 * Register cookie support on a Fastify instance
 *
 * @param server - The Fastify instance to register on
 * @param options - Cookie plugin options including the signing secret
 */
export function registerCookies(server: FastifyInstance, options: CookiePluginOptions): void {
  const { secret } = options;

  // Decorate request with cookies (use null for reference types in Fastify 5)
  // Cast to unknown to satisfy TypeScript while allowing null decoration
  server.decorateRequest('cookies', null as unknown as Record<string, string | undefined>);
  server.decorateRequest(
    'unsignCookie',
    null as unknown as (value: string) => { valid: boolean; value: string | null },
  );

  // Decorate reply with cookie methods (use function to bind Fastify reply)
  server.decorateReply(
    'setCookie',
    function (
      this: FastifyReply,
      name: string,
      value: string,
      opts: CookieOptions = {},
    ): FastifyReply {
      let cookieValue = value;

      // Sign if requested
      if (opts.signed === true) {
        cookieValue = signCookie(value, secret);
      }

      const serialized = serializeCookie(name, cookieValue, opts);

      // Get existing Set-Cookie headers
      const existing = this.getHeader('Set-Cookie');
      if (existing != null) {
        const cookies = Array.isArray(existing) ? existing : [existing as string];
        this.header('Set-Cookie', [...cookies, serialized]);
      } else {
        this.header('Set-Cookie', serialized);
      }

      return this;
    },
  );
  server.decorateReply(
    'clearCookie',
    function (this: FastifyReply, name: string, opts: CookieOptions = {}): FastifyReply {
      return this.setCookie(name, '', {
        ...opts,
        expires: new Date(0),
        maxAge: 0,
      });
    },
  );

  // Parse cookies on each request
  server.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // Parse cookies from header
    req.cookies = parseCookies(req.headers.cookie);

    // Add unsign method bound to secret
    req.unsignCookie = (value: string): ReturnType<typeof unsignCookie> =>
      unsignCookie(value, secret);

    void reply;
  });
}
