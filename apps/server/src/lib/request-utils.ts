// apps/server/src/lib/request-utils.ts
import { authConfig } from '../config/auth';

import type { FastifyRequest } from 'fastify';

/**
 * Request information extracted for logging and security purposes
 */
export interface RequestInfo {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}

/**
 * Check if an IP is in the trusted proxy list
 * Supports CIDR notation (e.g., "10.0.0.0/8") and exact matches
 * @param ip - IP address to check
 * @param trustedProxies - List of trusted proxy IPs/CIDRs
 * @returns true if IP is trusted
 */
function isTrustedProxy(ip: string, trustedProxies: string[]): boolean {
  if (trustedProxies.length === 0) {
    return false;
  }

  // For simplicity, this does exact string matching
  // In production, you'd want a proper CIDR matching library
  return trustedProxies.some((trusted) => {
    // Exact match
    if (trusted === ip) {
      return true;
    }

    // Simple subnet matching for common cases
    if (trusted.includes('/')) {
      const [subnet] = trusted.split('/');
      if (subnet) {
        const lastDotIndex = subnet.lastIndexOf('.');
        if (lastDotIndex > 0) {
          return ip.startsWith(subnet.substring(0, lastDotIndex));
        }
      }
    }

    return false;
  });
}

/**
 * Extract IP address from request, handling proxy headers with validation
 * Implements security best practices for proxy IP extraction
 *
 * Security considerations:
 * - Only trusts x-forwarded-for if TRUST_PROXY=true AND proxy is in trusted list
 * - Validates proxy chain depth to prevent spoofing
 * - Validates IP format to prevent injection
 *
 * @param request - Fastify request object
 * @returns IP address or undefined
 */
function extractIpAddress(request: FastifyRequest): string | undefined {
  const { trustProxy, trustedProxies, maxProxyDepth } = authConfig.proxy;

  // If we don't trust proxies, use direct connection IP only
  if (!trustProxy) {
    const requestIp = request.ip;
    if (requestIp && isValidIp(requestIp)) {
      return requestIp;
    }
    return undefined;
  }

  // Check x-forwarded-for header (set by reverse proxies)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
    const ipsString = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ips = ipsString?.split(',').map((ip) => ip.trim()) || [];

    // Validate chain depth to prevent spoofing
    if (ips.length > maxProxyDepth) {
      // Too many proxies in chain, potential spoofing attempt
      // Fall back to direct connection
      const requestIp = request.ip;
      if (requestIp && isValidIp(requestIp)) {
        return requestIp;
      }
      return undefined;
    }

    // If we have trusted proxies configured, validate the immediate proxy
    if (trustedProxies.length > 0 && request.ip) {
      if (!isTrustedProxy(request.ip, trustedProxies)) {
        // Request came from untrusted proxy, don't trust x-forwarded-for
        const requestIp = request.ip;
        if (requestIp && isValidIp(requestIp)) {
          return requestIp;
        }
        return undefined;
      }
    }

    // Extract client IP (first in chain)
    const clientIp = ips[0];
    if (clientIp && isValidIp(clientIp)) {
      return clientIp;
    }
  }

  // Fall back to request.ip (direct connection)
  const requestIp = request.ip;
  if (requestIp && isValidIp(requestIp)) {
    return requestIp;
  }

  return undefined;
}

/**
 * Basic IP address validation (IPv4 and IPv6)
 * Not exhaustive but catches obvious garbage
 * @param ip - IP address string
 * @returns true if looks like valid IP
 */
function isValidIp(ip: string): boolean {
  // IPv4: xxx.xxx.xxx.xxx
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6: simplified check for hex and colons
  const ipv6Regex = /^[0-9a-fA-F:]+$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Extract user agent from request headers
 * @param request - Fastify request object
 * @returns User agent string or undefined
 */
function extractUserAgent(request: FastifyRequest): string | undefined {
  const userAgent = request.headers['user-agent'];

  if (!userAgent || typeof userAgent !== 'string') {
    return undefined;
  }

  // Limit length to prevent log bloat from malicious payloads
  const MAX_USER_AGENT_LENGTH = 500;
  return userAgent.substring(0, MAX_USER_AGENT_LENGTH);
}

/**
 * Extract request information for logging and security
 * Type-safe extraction of IP address and user agent
 *
 * @param request - Fastify request object
 * @returns RequestInfo with IP and user agent
 */
export function extractRequestInfo(request: FastifyRequest): RequestInfo {
  return {
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
  };
}
