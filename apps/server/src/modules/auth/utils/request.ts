// apps/server/src/modules/auth/utils/request.ts
/**
 * Request utilities for extracting client information
 */

import { verifyToken, type TokenPayload } from './jwt';

import type { FastifyRequest } from 'fastify';

export interface RequestInfo {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

/**
 * Basic IP address validation (IPv4 and IPv6)
 */
function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Extract IP address from request
 * For simplicity, this version trusts x-forwarded-for when present
 * In production with reverse proxy, configure Fastify's trustProxy option
 */
function extractIpAddress(request: FastifyRequest): string | undefined {
  // Check x-forwarded-for header first
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ipsString = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const clientIp = ipsString?.split(',')[0]?.trim();
    if (clientIp && isValidIp(clientIp)) {
      return clientIp;
    }
  }

  // Fall back to request.ip
  const requestIp = request.ip;
  if (requestIp && isValidIp(requestIp)) {
    return requestIp;
  }

  return undefined;
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

/**
 * Extract and verify Bearer token from Authorization header
 * Returns the token payload if valid, null otherwise
 */
export function extractAndVerifyToken(
  request: { headers: { authorization?: string } },
  secret: string,
): TokenPayload | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    return verifyToken(token, secret);
  } catch {
    return null;
  }
}
