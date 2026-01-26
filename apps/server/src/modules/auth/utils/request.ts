// apps/server/src/modules/auth/utils/request.ts
/**
 * Request utilities for extracting client information
 */

export interface RequestInfo {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

/**
 * Minimal interface for requests that support IP and user-agent extraction.
 * This allows handlers to use the abstract RequestWithCookies type while
 * still being able to extract request info without unsafe casts.
 */
export interface RequestWithClientInfo {
  /** Client IP address (may be from X-Forwarded-For if trustProxy is enabled) */
  ip?: string;
  /** HTTP headers */
  headers: {
    'user-agent'?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Extract IP address from request
 * Relies on Fastify's built-in IP detection (configured via trustProxy)
 */
function extractIpAddress(request: RequestWithClientInfo): string | undefined {
  return request.ip;
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(request: RequestWithClientInfo): string | undefined {
  const userAgent = request.headers['user-agent'];

  if (typeof userAgent !== 'string' || userAgent === '') {
    return undefined;
  }

  // Limit length to prevent log bloat
  const MAX_USER_AGENT_LENGTH = 500;
  return userAgent.substring(0, MAX_USER_AGENT_LENGTH);
}

/**
 * Extract request information for logging and security
 */
export function extractRequestInfo(request: RequestWithClientInfo): RequestInfo {
  return {
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
  };
}
