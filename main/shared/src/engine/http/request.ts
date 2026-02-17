// main/shared/src/engine/http/request.ts
/**
 * HTTP request utilities.
 */

import { parseXForwardedFor } from './proxy';

/**
 * Extract a unique requester ID from a request.
 * Useful for rate limiting and auditing.
 *
 * @param req - Minimal request object with headers and IP
 * @returns Requester ID (first entry in X-Forwarded-For or socket IP)
 */
export function getRequesterId(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const forwardedFor = parseXForwardedFor(req.headers['x-forwarded-for']);
  const firstForwarded = forwardedFor[0];

  if (firstForwarded !== undefined) {
    return firstForwarded;
  }

  return typeof req.ip === 'string' && req.ip !== '' ? req.ip : 'unknown';
}

/**
 * Extract client IP address from a request.
 *
 * @param req - Request object with IP
 * @returns IP address string or 'unknown'
 */
export function extractIpAddress(req: { ip?: string }): string {
  return typeof req.ip === 'string' && req.ip !== '' ? req.ip : 'unknown';
}

/**
 * Extract and truncate user agent from request headers.
 *
 * @param headers - Request headers
 * @param maxLength - Maximum length to return (default: 500)
 * @returns Truncated user agent string or undefined
 */
export function extractUserAgent(
  headers: Record<string, string | string[] | undefined>,
  maxLength = 500,
): string | undefined {
  const userAgent = headers['user-agent'];

  if (typeof userAgent !== 'string' || userAgent === '') {
    return undefined;
  }

  return userAgent.substring(0, maxLength);
}
