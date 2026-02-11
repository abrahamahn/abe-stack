// src/server/engine/src/geo-ip/types.ts
/**
 * Geo-IP Service Types
 *
 * Core type definitions for the geo-IP location service.
 * Designed for pluggable providers (ip-api.com, MaxMind, etc.)
 *
 * @module GeoIP
 */

// ============================================================================
// Types
// ============================================================================

/** Result of a geo-IP lookup */
export interface GeoIpResult {
  /** Country name (e.g., "United States") or null if unknown */
  country: string | null;
  /** Region/state name (e.g., "California") or null if unknown */
  region: string | null;
  /** City name (e.g., "San Francisco") or null if unknown */
  city: string | null;
  /** Timezone (e.g., "America/Los_Angeles") or null if unknown */
  timezone: string | null;
}

/** Geo-IP provider interface — implement for each vendor (ip-api.com, MaxMind, etc.) */
export interface GeoIpProvider {
  /**
   * Look up geographic information for an IP address.
   * @param ip - IP address (IPv4 or IPv6)
   * @returns Promise resolving to geo-IP result
   */
  lookup(ip: string): Promise<GeoIpResult>;
}

/** Geo-IP service configuration */
export interface GeoIpConfig {
  /** Provider name (for factory selection) */
  provider: 'noop' | 'ip-api';
}
