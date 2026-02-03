// infra/src/http/middleware/proxyValidation.ts
/**
 * IP Proxy Header Validation
 *
 * Provides utilities for validating X-Forwarded-For headers against
 * trusted proxy whitelists. Supports both individual IP addresses
 * and CIDR notation for proxy ranges.
 *
 * Security notes:
 * - Always validate X-Forwarded-For against trusted proxies
 * - Never trust forwarded headers from unknown sources
 * - Use CIDR notation to define proxy subnet ranges
 */

// ============================================================================
// Types
// ============================================================================

export interface ProxyValidationConfig {
  /** List of trusted proxy IPs or CIDR ranges */
  trustedProxies: string[];
  /** Maximum number of proxies to trust in the chain (default: 1) */
  maxProxyDepth?: number;
}

export interface ForwardedInfo {
  /** The validated client IP address */
  clientIp: string;
  /** Whether the forwarded header was trusted */
  trusted: boolean;
  /** The proxy chain (if trusted) */
  proxyChain: string[];
}

// ============================================================================
// CIDR Parsing and Matching
// ============================================================================

/**
 * Parse a CIDR notation string into network address and prefix length
 * Supports both IPv4 (/0-32) and IPv6 (/0-128)
 *
 * @param cidr - CIDR string (e.g., "192.168.1.0/24" or "2001:db8::/32")
 * @returns Parsed CIDR info or null if invalid
 */
export function parseCidr(cidr: string): { ip: string; prefixLength: number } | null {
  const parts = cidr.split('/');

  if (parts.length === 1) {
    // No prefix, treat as single IP (/32 for IPv4, /128 for IPv6)
    const ip = parts[0] as string;
    if (!isValidIp(ip)) return null;
    return { ip, prefixLength: ip.includes(':') ? 128 : 32 };
  }

  if (parts.length !== 2) return null;

  const ip = parts[0] as string;
  const prefixStr = parts[1] as string;

  if (!isValidIp(ip)) return null;

  const prefixLength = parseInt(prefixStr, 10);
  if (Number.isNaN(prefixLength) || prefixLength < 0) return null;

  // Validate prefix length based on IP version
  const maxPrefix = ip.includes(':') ? 128 : 32;
  if (prefixLength > maxPrefix) return null;

  return { ip, prefixLength };
}

/**
 * Check if a string is a valid IPv4 address
 *
 * @param ip - The string to validate
 * @returns true if the string is a valid IPv4 address
 */
export function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !Number.isNaN(num) && num >= 0 && num <= 255 && String(num) === part;
  });
}

/**
 * Check if a string is a valid IPv6 address
 * Supports full and compressed notation
 *
 * @param ip - The string to validate
 * @returns true if the string is a valid IPv6 address
 */
export function isValidIpv6(ip: string): boolean {
  // Empty string is not a valid IPv6
  if (ip === '' || ip.length === 0) return false;

  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.substring(7);
    return isValidIpv4(ipv4Part);
  }

  // Special case: "::" is valid (all zeros)
  if (ip === '::') return true;

  const groups = ip.split(':');

  // Check for empty groups indicating compression (::)
  const emptyGroupIndex = groups.indexOf('');

  // Can only have one :: in the address
  if (emptyGroupIndex !== -1) {
    const firstEmpty = groups.indexOf('');
    const lastEmpty = groups.lastIndexOf('');
    // Allow consecutive empty strings from :: but not multiple ::
    if (lastEmpty - firstEmpty > 1) {
      // Check if they're consecutive
      for (let i = firstEmpty; i <= lastEmpty; i++) {
        if (groups[i] !== '') return false;
      }
    }
  }

  // Count non-empty groups
  const nonEmptyGroups = groups.filter((g) => g !== '');

  // With compression, we can have fewer groups
  // Without compression, we must have exactly 8 groups
  if (emptyGroupIndex === -1 && groups.length !== 8) return false;
  if (emptyGroupIndex !== -1 && nonEmptyGroups.length > 7) return false;

  // Validate each group
  return nonEmptyGroups.every((group) => {
    if (group.length > 4) return false;
    return /^[0-9a-fA-F]+$/.test(group);
  });
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - The string to validate
 * @returns true if the string is a valid IP address
 */
export function isValidIp(ip: string): boolean {
  return isValidIpv4(ip) || isValidIpv6(ip);
}

/**
 * Convert an IPv4 address to a 32-bit number
 *
 * @param ip - A valid IPv4 address string
 * @returns The 32-bit numeric representation
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (
    ((parts[0] as number) << 24) |
    ((parts[1] as number) << 16) |
    ((parts[2] as number) << 8) |
    (parts[3] as number)
  );
}

/**
 * Convert an IPv6 address to a BigInt
 *
 * @param ip - A valid IPv6 address string
 * @returns The BigInt representation
 */
function ipv6ToBigInt(ip: string): bigint {
  // Handle IPv4-mapped IPv6
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.substring(7);
    return BigInt(ipv4ToNumber(ipv4Part)) + BigInt('0xFFFF00000000');
  }

  // Expand compressed notation
  let expanded = ip;
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0] != null ? parts[0].split(':') : [];
    const right = parts[1] != null ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle: string[] = Array(missing).fill('0') as string[];
    expanded = [...left, ...middle, ...right].join(':');
  }

  const groups = expanded.split(':');
  let result = BigInt(0);

  for (const group of groups) {
    result = (result << BigInt(16)) + BigInt(parseInt(group !== '' ? group : '0', 16));
  }

  return result;
}

/**
 * Check if an IP address is within a CIDR range
 *
 * @param ip - The IP address to check
 * @param cidr - The CIDR range (e.g., "192.168.1.0/24")
 * @returns true if IP is within the CIDR range
 *
 * @example
 * ```typescript
 * ipMatchesCidr('192.168.1.50', '192.168.1.0/24');  // true
 * ipMatchesCidr('192.168.2.1', '192.168.1.0/24');   // false
 * ipMatchesCidr('10.0.0.1', '10.0.0.0/8');          // true
 * ```
 */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const parsedCidr = parseCidr(cidr);
  if (parsedCidr === null) return false;

  const { ip: networkIp, prefixLength } = parsedCidr;

  // Both must be same IP version
  const ipIsV6 = ip.includes(':');
  const cidrIsV6 = networkIp.includes(':');

  if (ipIsV6 !== cidrIsV6) return false;

  if (ipIsV6) {
    // IPv6 matching
    const ipNum = ipv6ToBigInt(ip);
    const networkNum = ipv6ToBigInt(networkIp);
    const mask = prefixLength === 0 ? BigInt(0) : BigInt(-1) << BigInt(128 - prefixLength);

    return (ipNum & mask) === (networkNum & mask);
  } else {
    // IPv4 matching
    const ipNum = ipv4ToNumber(ip);
    const networkNum = ipv4ToNumber(networkIp);
    const mask = prefixLength === 0 ? 0 : (-1 << (32 - prefixLength)) >>> 0;

    return (ipNum & mask) >>> 0 === (networkNum & mask) >>> 0;
  }
}

// ============================================================================
// Proxy Validation Functions
// ============================================================================

/**
 * Check if a request IP address is from a trusted proxy
 *
 * @param requestIp - The IP address of the request (socket address)
 * @param trustedProxies - List of trusted proxy IPs or CIDR ranges
 * @returns true if the request came from a trusted proxy
 *
 * @example
 * ```typescript
 * const trustedProxies = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.1'];
 *
 * isFromTrustedProxy('10.0.0.5', trustedProxies);    // true (matches CIDR)
 * isFromTrustedProxy('192.168.0.1', trustedProxies); // true (exact match)
 * isFromTrustedProxy('8.8.8.8', trustedProxies);     // false
 * ```
 */
export function isFromTrustedProxy(requestIp: string, trustedProxies: string[]): boolean {
  if (requestIp === '' || !isValidIp(requestIp)) return false;
  if (trustedProxies.length === 0) return false;

  return trustedProxies.some((proxy) => {
    // Check if it's a CIDR range or exact IP
    if (proxy.includes('/')) {
      return ipMatchesCidr(requestIp, proxy);
    }

    // Exact IP match
    return requestIp === proxy;
  });
}

/**
 * Parse X-Forwarded-For header into an array of IPs
 * The leftmost IP is the original client, rightmost is the most recent proxy
 *
 * @param header - The X-Forwarded-For header value
 * @returns Array of validated IP addresses from the header
 */
export function parseXForwardedFor(header: string | string[] | undefined): string[] {
  if (header == null) return [];

  const headerStr = Array.isArray(header) ? header.join(', ') : header;

  return headerStr
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0 && isValidIp(ip));
}

/**
 * Extract the real client IP from X-Forwarded-For, validating against trusted proxies
 *
 * @param xForwardedFor - The X-Forwarded-For header value
 * @param socketIp - The direct connection IP (socket address)
 * @param config - Proxy validation configuration
 * @returns Validated forwarded info with client IP
 *
 * @example
 * ```typescript
 * const config = {
 *   trustedProxies: ['10.0.0.0/8'],
 *   maxProxyDepth: 2,
 * };
 *
 * // Request through trusted proxy
 * const result = getValidatedClientIp(
 *   '203.0.113.50, 10.0.0.5',  // X-Forwarded-For
 *   '10.0.0.10',                // Socket IP (load balancer)
 *   config
 * );
 * // result.clientIp = '203.0.113.50' (trusted)
 * ```
 */
export function getValidatedClientIp(
  xForwardedFor: string | string[] | undefined,
  socketIp: string,
  config: ProxyValidationConfig,
): ForwardedInfo {
  const { trustedProxies, maxProxyDepth = 1 } = config;

  // Default: use socket IP, not trusted
  const defaultResult: ForwardedInfo = {
    clientIp: socketIp,
    trusted: false,
    proxyChain: [],
  };

  // If socket IP is not from a trusted proxy, don't trust X-Forwarded-For
  if (!isFromTrustedProxy(socketIp, trustedProxies)) {
    return defaultResult;
  }

  // Parse the X-Forwarded-For header
  const forwardedIps = parseXForwardedFor(xForwardedFor);

  if (forwardedIps.length === 0) {
    // No forwarded IPs, use socket IP
    return {
      clientIp: socketIp,
      trusted: true,
      proxyChain: [socketIp],
    };
  }

  // Build the full chain: forwarded IPs + socket IP
  const fullChain = [...forwardedIps, socketIp];

  // Walk backwards through the chain, validating each hop
  // Stop when we find an IP that's not a trusted proxy
  let clientIndex = fullChain.length - 1; // Start at socket IP

  for (let depth = 0; depth < maxProxyDepth && clientIndex > 0; depth++) {
    const previousIp = fullChain[clientIndex - 1] as string;

    // If the previous IP in the chain is also a trusted proxy, continue
    if (isFromTrustedProxy(previousIp, trustedProxies)) {
      clientIndex--;
    } else {
      // Found the client IP (first non-proxy IP)
      break;
    }
  }

  // The client IP is the one at clientIndex - 1 (or index 0 if we walked the whole chain)
  const clientIp = fullChain[Math.max(0, clientIndex - 1)] as string;
  const proxyChain = fullChain.slice(clientIndex);

  return {
    clientIp,
    trusted: true,
    proxyChain,
  };
}

/**
 * Validate a list of CIDR strings
 * Returns invalid entries for error reporting
 *
 * @param cidrs - List of CIDR strings to validate
 * @returns Object with valid and invalid entries
 */
export function validateCidrList(cidrs: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const cidr of cidrs) {
    if (parseCidr(cidr) !== null) {
      valid.push(cidr);
    } else {
      invalid.push(cidr);
    }
  }

  return { valid, invalid };
}
