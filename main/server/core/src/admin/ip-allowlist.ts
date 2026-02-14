// main/server/core/src/admin/ip-allowlist.ts
/**
 * IP Allowlist Middleware
 *
 * Fastify preHandler that restricts access based on client IP address.
 * Supports exact IP matching and CIDR range matching for IPv4.
 *
 * @module admin/ip-allowlist
 */

import { ForbiddenError } from '@abe-stack/shared';

import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/** Configuration for IP allowlist middleware */
export interface IpAllowlistConfig {
  /** Whether IP allowlisting is enabled */
  enabled: boolean;
  /** Array of exact IP addresses to allow (e.g., ["192.168.1.1", "10.0.0.5"]) */
  allowedIps: string[];
  /** Array of CIDR ranges to allow (e.g., ["10.0.0.0/8", "192.168.0.0/16"]) */
  allowedCidrs: string[];
}

// ============================================================================
// CIDR Utilities
// ============================================================================

/**
 * Parse a CIDR notation string into IP and prefix length
 * @param cidr - CIDR notation (e.g., "192.168.0.0/16")
 * @returns Tuple of [network IP, prefix length] or null if invalid
 */
function parseCidr(cidr: string): [string, number] | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return null;
  }

  const [ip, prefixStr] = parts;
  const prefix = Number.parseInt(prefixStr ?? '', 10);

  if (ip === undefined || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }

  return [ip, prefix];
}

/**
 * Convert IPv4 address to 32-bit integer
 * @param ip - IPv4 address string (e.g., "192.168.1.1")
 * @returns 32-bit integer representation or null if invalid
 */
function ipToInt(ip: string): number | null {
  const octets = ip.split('.');
  if (octets.length !== 4) {
    return null;
  }

  let result = 0;
  for (let i = 0; i < 4; i++) {
    const octet = Number.parseInt(octets[i] ?? '', 10);
    if (Number.isNaN(octet) || octet < 0 || octet > 255) {
      return null;
    }
    result = (result << 8) | octet;
  }

  return result >>> 0; // Convert to unsigned 32-bit
}

/**
 * Check if an IP address falls within a CIDR range
 * @param ip - IP address to check
 * @param cidr - CIDR notation (e.g., "192.168.0.0/16")
 * @returns True if IP is within the CIDR range
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const parsed = parseCidr(cidr);
  if (parsed === null) {
    return false;
  }

  const [networkIp, prefixLength] = parsed;
  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(networkIp);

  if (ipInt === null || networkInt === null) {
    return false;
  }

  // Create mask: e.g., /24 = 0xFFFFFF00, /16 = 0xFFFF0000
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;

  return (ipInt & mask) === (networkInt & mask);
}

// ============================================================================
// Localhost Detection
// ============================================================================

/**
 * Check if an IP address is localhost
 * Supports both IPv4 (127.0.0.1) and IPv6 (::1) formats
 * @param ip - IP address to check
 * @returns True if IP is localhost
 */
function isLocalhost(ip: string): boolean {
  // IPv4 localhost
  if (ip === '127.0.0.1' || ip.startsWith('127.')) {
    return true;
  }

  // IPv6 localhost (::1 or variants like ::ffff:127.0.0.1)
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }

  return false;
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a Fastify preHandler that enforces IP allowlisting for admin routes.
 *
 * When enabled, the middleware checks the client IP (extracted via Fastify's
 * `request.ip`) against the configured allowlist. If the IP is not allowed,
 * the middleware returns 403 Forbidden.
 *
 * In development mode (NODE_ENV=development), localhost IPs are always allowed
 * regardless of the allowlist configuration.
 *
 * @param config - IP allowlist configuration
 * @returns Fastify preHandler function
 *
 * @example
 * ```typescript
 * const ipAllowlist = createIpAllowlistMiddleware({
 *   enabled: true,
 *   allowedIps: ['203.0.113.5'],
 *   allowedCidrs: ['10.0.0.0/8', '192.168.0.0/16'],
 * });
 *
 * app.route({
 *   method: 'GET',
 *   url: '/admin/users',
 *   preHandler: [authGuard, requireAdmin, ipAllowlist],
 *   handler: listUsersHandler,
 * });
 * ```
 */
export function createIpAllowlistMiddleware(
  config: IpAllowlistConfig,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // If disabled, allow all requests
    if (!config.enabled) {
      return;
    }

    const clientIp = request.ip;

    // In development, always allow localhost
    if (process.env['NODE_ENV'] === 'development' && isLocalhost(clientIp)) {
      return;
    }

    // Check exact IP matches
    if (config.allowedIps.includes(clientIp)) {
      return;
    }

    // Check CIDR ranges
    for (const cidr of config.allowedCidrs) {
      if (isIpInCidr(clientIp, cidr)) {
        return;
      }
    }

    // No match found - deny access
    throw new ForbiddenError('Forbidden: IP not allowed', 'IP_NOT_ALLOWED');
  };
}
