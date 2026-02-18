// main/shared/src/system/http/csrf.ts
/**
 * CSRF Protection Constants and Utilities.
 */

/**
 * Extract CSRF token from request headers or body.
 *
 * @param headers - Request headers
 * @param body - Request body
 * @param headerName - Name of the CSRF header (default: 'x-csrf-token')
 * @returns CSRF token string or undefined
 */
export function extractCsrfToken(
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
  headerName = 'x-csrf-token',
): string | undefined {
  const rawHeaderToken = headers[headerName] ?? headers[headerName.toLowerCase()];
  const headerToken = Array.isArray(rawHeaderToken) ? rawHeaderToken[0] : rawHeaderToken;

  if (headerToken != null && headerToken !== '') {
    return headerToken;
  }

  return (body as Record<string, unknown> | null)?.['_csrf'] as string | undefined;
}
