// src/server/engine/src/geo-ip/factory.ts
/**
 * Geo-IP Provider Factory
 *
 * Creates the appropriate geo-IP provider based on configuration.
 *
 * @module GeoIP
 */

import { IpApiGeoIpProvider } from './ip-api-provider';
import { NoopGeoIpProvider } from './noop-provider';

import type { GeoIpConfig, GeoIpProvider } from './types';

/**
 * Create a geo-IP provider based on the given configuration.
 *
 * @param config - Geo-IP service configuration
 * @returns A GeoIpProvider instance
 * @throws Error if an unsupported provider is specified
 */
export function createGeoIpProvider(config: GeoIpConfig): GeoIpProvider {
  switch (config.provider) {
    case 'noop':
      return new NoopGeoIpProvider();
    case 'ip-api':
      return new IpApiGeoIpProvider();
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unknown geo-IP provider: ${String(_exhaustive)}`);
    }
  }
}
