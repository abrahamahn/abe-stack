// main/server/system/src/geo-ip/factory.test.ts
import { describe, expect, it } from 'vitest';

import { createGeoIpProvider } from './factory';
import { IpApiGeoIpProvider } from './ip-api-provider';
import { NoopGeoIpProvider } from './noop-provider';

describe('createGeoIpProvider', () => {
  it('creates NoopGeoIpProvider for noop config', () => {
    const provider = createGeoIpProvider({ provider: 'noop' });

    expect(provider).toBeInstanceOf(NoopGeoIpProvider);
  });

  it('creates IpApiGeoIpProvider for ip-api config', () => {
    const provider = createGeoIpProvider({ provider: 'ip-api' });

    expect(provider).toBeInstanceOf(IpApiGeoIpProvider);
  });

  it('throws error for unknown provider', () => {
    expect(() => {
      // @ts-expect-error Testing invalid provider
      createGeoIpProvider({ provider: 'invalid' });
    }).toThrow('Unknown geo-IP provider: invalid');
  });
});
