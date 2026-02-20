// main/server/system/src/security/ip-blocklist.ts
/**
 * IP Blocklist / Reputation Middleware
 *
 * Provides per-route IP blocking with support for:
 * - Exact IP addresses (IPv4 and IPv6)
 * - CIDR range matching (e.g., "192.168.0.0/16")
 * - Per-route policy levels (strict, standard, permissive)
 * - Pluggable reputation provider hooks
 * - Dynamic blocklist updates at runtime
 *
 * @module @bslt/server-system/security/ip-blocklist
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/**
 * Policy level determines which blocklists are checked for a given route.
 * - 'strict': check global blocklist + strict blocklist
 * - 'standard': check global blocklist only (default)
 * - 'permissive': skip blocklist checks entirely
 */
export type IpPolicyLevel = 'strict' | 'standard' | 'permissive';

/**
 * Result from an external IP reputation provider.
 */
export interface IpReputationResult {
  /** Whether the IP should be blocked */
  blocked: boolean;
  /** Human-readable reason for the block decision */
  reason?: string;
  /** Numeric risk score (0-100, higher = more risky) */
  score?: number;
  /** TTL in milliseconds for caching this result */
  ttlMs?: number;
}

/**
 * Pluggable IP reputation provider.
 * Implement this interface to integrate external services (e.g., AbuseIPDB, MaxMind).
 */
export interface IpReputationProvider {
  /** Provider name for logging */
  name: string;
  /**
   * Check IP reputation. Return null/undefined to skip (provider not applicable).
   * Should not throw -- return { blocked: false } on error.
   */
  check(ip: string): Promise<IpReputationResult | null | undefined>;
}

/**
 * Parsed CIDR range for efficient matching.
 */
interface CidrRange {
  /** Network address as 32-bit integer (IPv4) */
  networkInt: number;
  /** Subnet mask as 32-bit integer */
  maskInt: number;
  /** Original CIDR string for logging */
  original: string;
}

/**
 * Configuration for the IP blocklist middleware.
 */
export interface IpBlocklistConfig {
  /**
   * Global blocklist of exact IPs and/or CIDR ranges.
   * Applied to all routes with 'standard' or 'strict' policy.
   */
  globalBlocklist?: string[];

  /**
   * Strict blocklist of exact IPs and/or CIDR ranges.
   * Only applied to routes with 'strict' policy.
   */
  strictBlocklist?: string[];

  /**
   * Global allowlist that overrides blocklist checks.
   * IPs in this list are always permitted.
   */
  allowlist?: string[];

  /**
   * External reputation providers to consult.
   * Checked in order; first blocking result wins.
   */
  reputationProviders?: IpReputationProvider[];

  /**
   * HTTP status code to return for blocked IPs.
   * Defaults to 403.
   */
  blockStatusCode?: number;

  /**
   * Response body for blocked IPs.
   * Defaults to { error: 'Forbidden' }.
   */
  blockResponseBody?: unknown;

  /**
   * Called when an IP is blocked. Useful for logging/alerting.
   */
  onBlocked?: (ip: string, reason: string, request: FastifyRequest) => void;

  /**
   * Enable debug logging.
   */
  debug?: boolean;

  /**
   * Custom logger function for debug output.
   */
  onDebug?: (...args: unknown[]) => void;
}

// ============================================================================
// IP Parsing Utilities
// ============================================================================

/**
 * Parse an IPv4 address string to a 32-bit integer.
 * Returns undefined if the address is not valid IPv4.
 *
 * @param ip - IPv4 address string (e.g., "192.168.1.1")
 * @returns 32-bit integer representation or undefined
 * @complexity O(1)
 */
export function ipv4ToInt(ip: string): number | undefined {
  const parts = ip.split('.');
  if (parts.length !== 4) return undefined;

  let result = 0;
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) return undefined;
    result = (result << 8) | num;
  }

  // Convert to unsigned 32-bit
  return result >>> 0;
}

/**
 * Parse a CIDR notation string into a range for efficient matching.
 * Only supports IPv4 CIDR ranges.
 *
 * @param cidr - CIDR notation string (e.g., "192.168.0.0/16")
 * @returns Parsed CIDR range or undefined if invalid
 * @complexity O(1)
 */
export function parseCidr(cidr: string): CidrRange | undefined {
  const slashIndex = cidr.indexOf('/');
  if (slashIndex === -1) return undefined;

  const ip = cidr.substring(0, slashIndex);
  const prefixStr = cidr.substring(slashIndex + 1);
  const prefix = Number(prefixStr);

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return undefined;

  const networkInt = ipv4ToInt(ip);
  if (networkInt === undefined) return undefined;

  // Create mask: prefix bits set to 1, rest to 0
  const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return {
    networkInt: (networkInt & maskInt) >>> 0,
    maskInt,
    original: cidr,
  };
}

/**
 * Check if an IPv4 address falls within a CIDR range.
 *
 * @param ipInt - IPv4 address as 32-bit integer
 * @param range - Parsed CIDR range
 * @returns Whether the IP is within the range
 * @complexity O(1)
 */
export function isInCidrRange(ipInt: number, range: CidrRange): boolean {
  return (ipInt & range.maskInt) >>> 0 === range.networkInt;
}

// ============================================================================
// IpBlocklist Class
// ============================================================================

/**
 * IP Blocklist engine.
 * Manages blocklists, allowlists, and CIDR ranges with efficient lookup.
 * Can be used independently of Fastify for testing or other frameworks.
 */
export class IpBlocklist {
  private readonly globalExactIps = new Set<string>();
  private readonly globalCidrRanges: CidrRange[] = [];
  private readonly strictExactIps = new Set<string>();
  private readonly strictCidrRanges: CidrRange[] = [];
  private readonly allowlistIps = new Set<string>();
  private readonly allowlistCidrRanges: CidrRange[] = [];
  private readonly reputationProviders: IpReputationProvider[];
  private readonly config: IpBlocklistConfig;

  constructor(config: IpBlocklistConfig = {}) {
    this.config = config;
    this.reputationProviders = config.reputationProviders ?? [];

    // Parse global blocklist
    for (const entry of config.globalBlocklist ?? []) {
      this.addToList(entry, this.globalExactIps, this.globalCidrRanges);
    }

    // Parse strict blocklist
    for (const entry of config.strictBlocklist ?? []) {
      this.addToList(entry, this.strictExactIps, this.strictCidrRanges);
    }

    // Parse allowlist
    for (const entry of config.allowlist ?? []) {
      this.addToList(entry, this.allowlistIps, this.allowlistCidrRanges);
    }
  }

  /**
   * Add an IP or CIDR range to a list at runtime.
   *
   * @param entry - IP address or CIDR range string
   * @param target - Which list to add to: 'global', 'strict', or 'allowlist'
   */
  add(entry: string, target: 'global' | 'strict' | 'allowlist' = 'global'): void {
    switch (target) {
      case 'global':
        this.addToList(entry, this.globalExactIps, this.globalCidrRanges);
        break;
      case 'strict':
        this.addToList(entry, this.strictExactIps, this.strictCidrRanges);
        break;
      case 'allowlist':
        this.addToList(entry, this.allowlistIps, this.allowlistCidrRanges);
        break;
    }
  }

  /**
   * Remove an exact IP from a list at runtime.
   * Note: CIDR ranges cannot be removed individually after parsing.
   *
   * @param ip - Exact IP address to remove
   * @param target - Which list to remove from
   */
  remove(ip: string, target: 'global' | 'strict' | 'allowlist' = 'global'): void {
    switch (target) {
      case 'global':
        this.globalExactIps.delete(ip);
        break;
      case 'strict':
        this.strictExactIps.delete(ip);
        break;
      case 'allowlist':
        this.allowlistIps.delete(ip);
        break;
    }
  }

  /**
   * Check if an IP is blocked under the given policy level.
   * Returns the reason string if blocked, or null if allowed.
   *
   * @param ip - IP address to check
   * @param policy - Policy level for this check
   * @returns Reason string if blocked, null if allowed
   * @complexity O(c) where c = CIDR ranges + reputation providers
   */
  async check(ip: string, policy: IpPolicyLevel = 'standard'): Promise<string | null> {
    // Permissive policy skips all checks
    if (policy === 'permissive') return null;

    // Allowlist takes priority
    if (this.isAllowed(ip)) {
      this.log('IP allowed by allowlist:', ip);
      return null;
    }

    // Check global blocklist
    if (this.isBlockedByList(ip, this.globalExactIps, this.globalCidrRanges)) {
      return 'IP blocked by global blocklist';
    }

    // Check strict blocklist for strict policy
    if (policy === 'strict') {
      if (this.isBlockedByList(ip, this.strictExactIps, this.strictCidrRanges)) {
        return 'IP blocked by strict blocklist';
      }
    }

    // Check reputation providers
    for (const provider of this.reputationProviders) {
      try {
        const result = await provider.check(ip);
        if (result?.blocked === true) {
          return `IP blocked by ${provider.name}: ${result.reason ?? 'reputation check failed'}`;
        }
      } catch {
        // Provider errors should not block requests
        this.log(`Reputation provider ${provider.name} error for IP:`, ip);
      }
    }

    return null;
  }

  /**
   * Synchronous check without reputation providers.
   * Useful when async is not available or for hot-path checks.
   *
   * @param ip - IP address to check
   * @param policy - Policy level
   * @returns Reason string if blocked, null if allowed
   * @complexity O(c) where c = CIDR ranges
   */
  checkSync(ip: string, policy: IpPolicyLevel = 'standard'): string | null {
    if (policy === 'permissive') return null;
    if (this.isAllowed(ip)) return null;

    if (this.isBlockedByList(ip, this.globalExactIps, this.globalCidrRanges)) {
      return 'IP blocked by global blocklist';
    }

    if (policy === 'strict') {
      if (this.isBlockedByList(ip, this.strictExactIps, this.strictCidrRanges)) {
        return 'IP blocked by strict blocklist';
      }
    }

    return null;
  }

  /**
   * Get the current size of each list (for health checks / debugging).
   */
  getStats(): {
    globalExactCount: number;
    globalCidrCount: number;
    strictExactCount: number;
    strictCidrCount: number;
    allowlistExactCount: number;
    allowlistCidrCount: number;
    reputationProviderCount: number;
  } {
    return {
      globalExactCount: this.globalExactIps.size,
      globalCidrCount: this.globalCidrRanges.length,
      strictExactCount: this.strictExactIps.size,
      strictCidrCount: this.strictCidrRanges.length,
      allowlistExactCount: this.allowlistIps.size,
      allowlistCidrCount: this.allowlistCidrRanges.length,
      reputationProviderCount: this.reputationProviders.length,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private addToList(entry: string, exactSet: Set<string>, cidrList: CidrRange[]): void {
    if (entry.includes('/')) {
      const parsed = parseCidr(entry);
      if (parsed !== undefined) {
        cidrList.push(parsed);
      }
    } else {
      exactSet.add(entry);
    }
  }

  private isAllowed(ip: string): boolean {
    if (this.allowlistIps.has(ip)) return true;

    const ipInt = ipv4ToInt(ip);
    if (ipInt !== undefined) {
      for (const range of this.allowlistCidrRanges) {
        if (isInCidrRange(ipInt, range)) return true;
      }
    }

    return false;
  }

  private isBlockedByList(ip: string, exactSet: Set<string>, cidrList: CidrRange[]): boolean {
    if (exactSet.has(ip)) return true;

    const ipInt = ipv4ToInt(ip);
    if (ipInt !== undefined) {
      for (const range of cidrList) {
        if (isInCidrRange(ipInt, range)) return true;
      }
    }

    return false;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug === true && this.config.onDebug !== undefined) {
      this.config.onDebug(...args);
    }
  }
}

// ============================================================================
// Fastify Middleware Factory
// ============================================================================

/**
 * Create a Fastify preHandler hook for IP blocklist checking.
 *
 * @param config - IP blocklist configuration
 * @param routePolicy - Default policy level for routes using this middleware.
 *   Can be overridden per-route by setting `request.routeOptions.config.ipPolicy`.
 * @returns Fastify preHandler function
 *
 * @example
 * ```typescript
 * const ipMiddleware = createIpBlocklistMiddleware({
 *   globalBlocklist: ['1.2.3.4', '10.0.0.0/8'],
 *   strictBlocklist: ['5.6.7.8'],
 *   allowlist: ['127.0.0.1'],
 * });
 *
 * // Apply globally
 * server.addHook('preHandler', ipMiddleware);
 *
 * // Or per-route with policy override
 * server.get('/admin', {
 *   config: { ipPolicy: 'strict' },
 *   preHandler: [ipMiddleware],
 *   handler: adminHandler,
 * });
 * ```
 */
export function createIpBlocklistMiddleware(
  config: IpBlocklistConfig = {},
  routePolicy: IpPolicyLevel = 'standard',
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const blocklist = new IpBlocklist(config);
  const statusCode = config.blockStatusCode ?? 403;
  const responseBody = config.blockResponseBody ?? { error: 'Forbidden' };

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ip = request.ip;

    // Allow per-route policy override via route config
    const routeConfig = request.routeOptions.config as Record<string, unknown>;
    const policy = (routeConfig['ipPolicy'] as IpPolicyLevel | undefined) ?? routePolicy;

    const reason = await blocklist.check(ip, policy);

    if (reason !== null) {
      config.onBlocked?.(ip, reason, request);
      void reply.status(statusCode).send(responseBody);
    }
  };
}

/**
 * Create an IpBlocklist instance directly (without Fastify middleware).
 * Useful for testing or non-Fastify environments.
 *
 * @param config - IP blocklist configuration
 * @returns IpBlocklist instance
 */
export function createIpBlocklist(config: IpBlocklistConfig = {}): IpBlocklist {
  return new IpBlocklist(config);
}
