// main/server/system/src/geo-ip/noop.provider.ts
/**
 * No-Op Geo-IP Provider
 *
 * Returns null for all location fields.
 * Use this in development or when no geo-IP service is configured.
 *
 * @module GeoIP
 */

import type { GeoIpProvider, GeoIpResult } from './types';

/**
 * No-op geo-IP provider that returns null for all location fields.
 * Useful for development or when geo-IP lookups are not required.
 */
export class NoopGeoIpProvider implements GeoIpProvider {
  lookup(_ip: string): Promise<GeoIpResult> {
    return Promise.resolve({
      country: null,
      region: null,
      city: null,
      timezone: null,
    });
  }
}
