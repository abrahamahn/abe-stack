// src/shared/src/utils/http/http.ts

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
  const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);

  if (cookieHeader === undefined || cookieHeader === null || cookieHeader === '') {
    return cookies;
  }

  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx < 0) continue;

    const key = pair.slice(0, eqIdx).trim();
    if (key === '' || blockedKeys.has(key.toLowerCase())) {
      continue;
    }
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
