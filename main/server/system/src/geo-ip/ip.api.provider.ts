// main/server/system/src/geo-ip/ip-api-provider.ts
/**
 * ip-api.com Geo-IP Provider
 *
 * Uses the free ip-api.com JSON API to resolve IP addresses to locations.
 * Includes in-memory caching and private IP detection.
 *
 * @module GeoIP
 */

import { MS_PER_HOUR } from '@bslt/shared';

import type { GeoIpProvider, GeoIpResult } from './types';

// ============================================================================
// Types
// ============================================================================

interface CacheEntry {
  result: GeoIpResult;
  expiresAt: number;
}

interface IpApiResponse {
  status: string;
  country?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL_MS = MS_PER_HOUR;
const MAX_CACHE_SIZE = 10000;
const IP_API_URL = 'http://ip-api.com/json';
const IP_API_FIELDS = 'country,regionName,city,timezone';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect if an IP address is private/local.
 * Returns true for:
 * - IPv4: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x
 * - IPv6: ::1 (loopback)
 */
function isPrivateIp(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }

  // IPv4
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match === null) {
    // Not a valid IPv4, assume not private (could be IPv6)
    return false;
  }

  const oct1Str = ipv4Match[1];
  const oct2Str = ipv4Match[2];

  if (oct1Str === undefined || oct2Str === undefined) {
    return false;
  }

  const oct1 = parseInt(oct1Str, 10);
  const oct2 = parseInt(oct2Str, 10);

  // 10.0.0.0/8
  if (oct1 === 10) {
    return true;
  }

  // 172.16.0.0/12
  if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
    return true;
  }

  // 192.168.0.0/16
  if (oct1 === 192 && oct2 === 168) {
    return true;
  }

  // 127.0.0.0/8 (loopback)
  if (oct1 === 127) {
    return true;
  }

  return false;
}

/**
 * Create a null geo-IP result (all fields null).
 */
function createNullResult(): GeoIpResult {
  return {
    country: null,
    region: null,
    city: null,
    timezone: null,
  };
}

// ============================================================================
// Provider
// ============================================================================

/**
 * Geo-IP provider using ip-api.com's free API.
 * Includes in-memory caching (1 hour TTL, max 10k entries).
 */
export class IpApiGeoIpProvider implements GeoIpProvider {
  private readonly cache = new Map<string, CacheEntry>();

  async lookup(ip: string): Promise<GeoIpResult> {
    // Check if IP is private
    if (isPrivateIp(ip)) {
      return createNullResult();
    }

    // Check cache
    const cached = this.cache.get(ip);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // Fetch from API
    try {
      const response = await fetch(`${IP_API_URL}/${ip}?fields=${IP_API_FIELDS}`);

      if (!response.ok) {
        return createNullResult();
      }

      const data = (await response.json()) as IpApiResponse;

      if (data.status !== 'success') {
        return createNullResult();
      }

      const result: GeoIpResult = {
        country: data.country ?? null,
        region: data.regionName ?? null,
        city: data.city ?? null,
        timezone: data.timezone ?? null,
      };

      // Cache the result
      this.cacheResult(ip, result);

      return result;
    } catch {
      // On any error, return null result
      return createNullResult();
    }
  }

  /**
   * Store a result in the cache.
   * Implements LRU eviction when cache size exceeds MAX_CACHE_SIZE.
   */
  private cacheResult(ip: string, result: GeoIpResult): void {
    // Simple eviction: if cache is full, delete oldest entry
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(ip, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}
