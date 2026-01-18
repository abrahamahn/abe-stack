// apps/server/src/infra/http/cookie.ts
/**
 * Cookie Utilities
 *
 * Manual cookie parsing and setting. Replaces @fastify/cookie.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  signed?: boolean;
}

export interface CookieSerializeOptions extends CookieOptions {
  encode?: (value: string) => string;
}

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
// Cookie Parsing
// ============================================================================

/**
 * Parse a cookie header string into an object
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;

    const key = pair.slice(0, eqIdx).trim();
    let value = pair.slice(eqIdx + 1).trim();

    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Decode URI component
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

// ============================================================================
// Cookie Signing
// ============================================================================

/**
 * Sign a cookie value with HMAC-SHA256
 */
export function signCookie(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64url');
  return `${value}.${signature}`;
}

/**
 * Verify and extract a signed cookie value
 */
export function unsignCookie(
  signedValue: string,
  secret: string,
): { valid: boolean; value: string | null } {
  const lastDotIdx = signedValue.lastIndexOf('.');
  if (lastDotIdx < 0) {
    return { valid: false, value: null };
  }

  const value = signedValue.slice(0, lastDotIdx);
  const signature = signedValue.slice(lastDotIdx + 1);

  const expectedSignature = createHmac('sha256', secret).update(value).digest('base64url');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, value: null };
    }

    if (timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: true, value };
    }
  } catch {
    // Invalid base64
  }

  return { valid: false, value: null };
}

// ============================================================================
// Cookie Serialization
// ============================================================================

/**
 * Serialize a cookie into a Set-Cookie header value
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieSerializeOptions = {},
): string {
  const encode = options.encode ?? encodeURIComponent;
  let cookie = `${encode(name)}=${encode(value)}`;

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${String(Math.floor(options.maxAge))}`;
  }

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.httpOnly) {
    cookie += '; HttpOnly';
  }

  if (options.secure) {
    cookie += '; Secure';
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`;
  }

  return cookie;
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
      if (opts.signed) {
        cookieValue = signCookie(value, secret);
      }

      const serialized = serializeCookie(name, cookieValue, opts);

      // Get existing Set-Cookie headers
      const existing = this.getHeader('Set-Cookie');
      if (existing) {
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
