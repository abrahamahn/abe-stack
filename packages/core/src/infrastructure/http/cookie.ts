// packages/core/src/infrastructure/http/cookie.ts
/**
 * Parse a cookie header string into an object of key-value pairs.
 *
 * Handles URL-encoded values and quoted strings.
 *
 * @param cookieHeader The string from the 'Cookie' header.
 * @returns A record of cookie names and their values.
 */
export function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
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
