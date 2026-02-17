// main/shared/src/engine/http/auth.ts
/**
 * Bearer auth scheme prefix
 */
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
