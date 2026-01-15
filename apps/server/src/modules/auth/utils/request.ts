// apps/server/src/modules/auth/utils/request.ts
/**
 * Request utilities for extracting client information
 */

import type { FastifyRequest } from 'fastify';

export interface RequestInfo {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

/**
 * Extract IP address from request
 * Relies on Fastify's built-in IP detection (configured via trustProxy)
 */
function extractIpAddress(request: FastifyRequest): string | undefined {
  return request.ip;
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(request: FastifyRequest): string | undefined {
  const userAgent = request.headers['user-agent'];

  if (!userAgent || typeof userAgent !== 'string') {
    return undefined;
  }

  // Limit length to prevent log bloat
  const MAX_USER_AGENT_LENGTH = 500;
  return userAgent.substring(0, MAX_USER_AGENT_LENGTH);
}

/**
 * Extract request information for logging and security
 */
export function extractRequestInfo(request: FastifyRequest): RequestInfo {
  return {
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
  };
}
