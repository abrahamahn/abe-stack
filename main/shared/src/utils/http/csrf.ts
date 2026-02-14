// main/shared/src/utils/http/csrf.ts
/**
 * CSRF Protection Constants and Utilities.
 */

/**
 * Standard safe HTTP methods that do not require CSRF protection.
 */
export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF-Exempt Endpoints
 *
 * These paths are exempted from CSRF protection because they meet one or more
 * of the following security criteria:
 *
 * 1. No authenticated session exists to exploit (unauthenticated endpoints)
 * 2. Protected by one-time tokens that prevent replay attacks
 * 3. Protected by HTTP-only SameSite cookies (refresh token flow)
 */
export const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/refresh',
  '/api/auth/resend-verification',
]);

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
