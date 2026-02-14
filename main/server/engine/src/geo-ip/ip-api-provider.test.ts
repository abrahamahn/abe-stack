// main/server/engine/src/geo-ip/ip-api-provider.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IpApiGeoIpProvider } from './ip-api-provider';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IpApiGeoIpProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('private IP detection', () => {
    it('returns null result for 10.x.x.x addresses', async () => {
      const provider = new IpApiGeoIpProvider();

      const result = await provider.lookup('10.0.0.1');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null result for 172.16-31.x.x addresses', async () => {
      const provider = new IpApiGeoIpProvider();

      const result1 = await provider.lookup('172.16.0.1');
      const result2 = await provider.lookup('172.31.255.255');

      expect(result1).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(result2).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null result for 192.168.x.x addresses', async () => {
      const provider = new IpApiGeoIpProvider();

      const result = await provider.lookup('192.168.1.1');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null result for 127.x.x.x addresses', async () => {
      const provider = new IpApiGeoIpProvider();

      const result = await provider.lookup('127.0.0.1');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null result for IPv6 loopback', async () => {
      const provider = new IpApiGeoIpProvider();

      const result = await provider.lookup('::1');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not treat 172.15.x.x as private', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
            regionName: 'California',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
          }),
      });

      await provider.lookup('172.15.0.1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ip-api.com/json/172.15.0.1?fields=country,regionName,city,timezone',
      );
    });

    it('does not treat 172.32.x.x as private', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
            regionName: 'California',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
          }),
      });

      await provider.lookup('172.32.0.1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ip-api.com/json/172.32.0.1?fields=country,regionName,city,timezone',
      );
    });
  });

  describe('API integration', () => {
    it('fetches and parses successful response', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
            regionName: 'California',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
          }),
      });

      const result = await provider.lookup('8.8.8.8');

      expect(result).toEqual({
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        timezone: 'America/Los_Angeles',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://ip-api.com/json/8.8.8.8?fields=country,regionName,city,timezone',
      );
    });

    it('handles missing fields in API response', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
            // regionName, city, timezone missing
          }),
      });

      const result = await provider.lookup('8.8.8.8');

      expect(result).toEqual({
        country: 'United States',
        region: null,
        city: null,
        timezone: null,
      });
    });

    it('returns null result on API failure status', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'fail',
            message: 'reserved range',
          }),
      });

      const result = await provider.lookup('8.8.8.8');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
    });

    it('returns null result on HTTP error', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await provider.lookup('8.8.8.8');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
    });

    it('returns null result on network error', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.lookup('8.8.8.8');

      expect(result).toEqual({
        country: null,
        region: null,
        city: null,
        timezone: null,
      });
    });
  });

  describe('caching', () => {
    it('caches successful lookups', async () => {
      const provider = new IpApiGeoIpProvider();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
            regionName: 'California',
            city: 'Mountain View',
            timezone: 'America/Los_Angeles',
          }),
      });

      const result1 = await provider.lookup('8.8.8.8');
      const result2 = await provider.lookup('8.8.8.8');

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache null results for private IPs', async () => {
      const provider = new IpApiGeoIpProvider();

      await provider.lookup('192.168.1.1');
      await provider.lookup('192.168.1.1');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('respects cache expiration', async () => {
      const provider = new IpApiGeoIpProvider();
      const now = Date.now();
      vi.setSystemTime(now);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'United States',
          }),
      });

      await provider.lookup('8.8.8.8');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Move forward 30 minutes (cache still valid)
      vi.setSystemTime(now + 30 * 60 * 1000);
      await provider.lookup('8.8.8.8');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Move forward 2 hours (cache expired)
      vi.setSystemTime(now + 2 * 60 * 60 * 1000);
      await provider.lookup('8.8.8.8');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('evicts oldest entry when cache is full', async () => {
      const provider = new IpApiGeoIpProvider();

      // Fill cache with 10000 entries
      for (let i = 0; i < 10000; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'success',
              country: `Country${i}`,
            }),
        });
        await provider.lookup(`1.1.${Math.floor(i / 256)}.${i % 256}`);
      }

      expect(mockFetch).toHaveBeenCalledTimes(10000);

      // Add one more (should evict first entry)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'New Country',
          }),
      });
      await provider.lookup('2.2.2.2');

      expect(mockFetch).toHaveBeenCalledTimes(10001);

      // First entry should be evicted, so it should be fetched again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            country: 'Country0',
          }),
      });
      await provider.lookup('1.1.0.0');

      expect(mockFetch).toHaveBeenCalledTimes(10002);
    });
  });
});
