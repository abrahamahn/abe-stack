// main/server/system/src/geo-ip/noop-provider.test.ts
import { describe, expect, it } from 'vitest';

import { NoopGeoIpProvider } from './noop-provider';

describe('NoopGeoIpProvider', () => {
  it('returns null for all fields', async () => {
    const provider = new NoopGeoIpProvider();

    const result = await provider.lookup('8.8.8.8');

    expect(result).toEqual({
      country: null,
      region: null,
      city: null,
      timezone: null,
    });
  });

  it('returns null for private IPs', async () => {
    const provider = new NoopGeoIpProvider();

    const result = await provider.lookup('192.168.1.1');

    expect(result).toEqual({
      country: null,
      region: null,
      city: null,
      timezone: null,
    });
  });

  it('returns null for localhost', async () => {
    const provider = new NoopGeoIpProvider();

    const result = await provider.lookup('127.0.0.1');

    expect(result).toEqual({
      country: null,
      region: null,
      city: null,
      timezone: null,
    });
  });

  it('returns null for IPv6', async () => {
    const provider = new NoopGeoIpProvider();

    const result = await provider.lookup('::1');

    expect(result).toEqual({
      country: null,
      region: null,
      city: null,
      timezone: null,
    });
  });
});
