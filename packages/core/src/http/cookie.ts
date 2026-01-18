// packages/core/src/http/cookie.ts
/**
 * HTTP Cookie Utilities
 *
 * Shared cookie parsing utilities.
 */

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
