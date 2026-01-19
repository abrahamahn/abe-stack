// packages/core/src/http/cookie.ts
/**
 * Parses a cookie header string into an object of key-value pairs.
 *
 * @param cookieHeader The string from the 'Cookie' header.
 * @returns A record of cookie names and their values.
 */
export function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.split('=').map((part) => part.trim());
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}
