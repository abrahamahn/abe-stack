// src/shared/src/utils/http/http.ts

import { isSafeObjectKey } from '../../core/guard';

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

/**

 * Parse a cookie header string into an object of key-value pairs.
 *
 * Handles URL-encoded values and quoted strings.
 *
 * @param cookieHeader The string from the 'Cookie' header.
 * @returns A record of cookie names and their values.
 */
export function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null) as Record<string, string>;

  if (cookieHeader === undefined || cookieHeader === null || cookieHeader === '') {
    return cookies;
  }

  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;

    const key = pair.slice(0, eqIdx).trim();
    if (key === '' || !isSafeObjectKey(key.toLowerCase())) {
      continue;
    }
    let value = pair.slice(eqIdx + 1).trim();

    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Decode URI component, using defineProperty to prevent prototype pollution
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      decoded = value;
    }
    Object.defineProperty(cookies, key, {
      value: decoded,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  return cookies;
}

/** Bearer auth scheme prefix */
const BEARER_PREFIX = 'Bearer ';

/**
 * Extract a Bearer token from an Authorization header value.
 * Returns undefined if the header is not a valid Bearer token.
 *
 * @param authHeader - The Authorization header value
 * @returns The extracted token, or undefined if not a Bearer token
 */
export function extractBearerToken(authHeader: string | undefined): string | undefined {
  if (authHeader?.startsWith(BEARER_PREFIX) !== true) return undefined;
  const token = authHeader.slice(BEARER_PREFIX.length);
  return token !== '' ? token : undefined;
}

/**
 * Serialize a cookie into a Set-Cookie header value
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Serialization options (path, domain, maxAge, etc.)
 * @returns Serialized Set-Cookie header string
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

  if (options.expires !== undefined) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path !== undefined) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain != null && options.domain !== '') {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.httpOnly === true) {
    cookie += '; HttpOnly';
  }

  if (options.secure === true) {
    cookie += '; Secure';
  }

  if (options.sameSite !== undefined) {
    cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`;
  }

  return cookie;
}
