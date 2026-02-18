// main/shared/src/system/http/request.test.ts
import { describe, expect, it } from 'vitest';

import { extractIpAddress, extractUserAgent, getRequesterId } from './request';

// ==========================================================================
// extractIpAddress
// ==========================================================================
describe('extractIpAddress', () => {
  describe('when req.ip is a valid string', () => {
    it('returns the ip string directly', () => {
      expect(extractIpAddress({ ip: '1.2.3.4' })).toBe('1.2.3.4');
    });

    it('returns an IPv6 address as-is', () => {
      expect(extractIpAddress({ ip: '::1' })).toBe('::1');
    });
  });

  describe('when req.ip is absent or invalid', () => {
    it('returns "unknown" when ip is undefined', () => {
      expect(extractIpAddress({})).toBe('unknown');
    });

    it('returns "unknown" when ip is an empty string', () => {
      expect(extractIpAddress({ ip: '' })).toBe('unknown');
    });

    it('does NOT validate the IP — returns arbitrary string values verbatim', () => {
      // Adversarial: the function only checks typeof === 'string' && !== ''.
      // It does not validate IP format, so garbage passes through.
      expect(extractIpAddress({ ip: 'not-an-ip' })).toBe('not-an-ip');
    });

    it('returns "unknown" when ip is explicitly set to undefined', () => {
      const req: { ip?: string } = {};
      expect(extractIpAddress(req)).toBe('unknown');
    });
  });
});

// ==========================================================================
// extractUserAgent
// ==========================================================================
describe('extractUserAgent', () => {
  describe('when user-agent header is present and valid', () => {
    it('returns the user agent string', () => {
      const headers = { 'user-agent': 'Mozilla/5.0' };
      expect(extractUserAgent(headers)).toBe('Mozilla/5.0');
    });

    it('returns the user agent up to the default 500-char limit', () => {
      const longUa = 'A'.repeat(600);
      const headers = { 'user-agent': longUa };
      expect(extractUserAgent(headers)).toBe('A'.repeat(500));
    });

    it('returns the full string when exactly at the limit', () => {
      const atLimit = 'B'.repeat(500);
      const headers = { 'user-agent': atLimit };
      expect(extractUserAgent(headers)).toBe(atLimit);
    });

    it('respects a custom maxLength parameter', () => {
      const headers = { 'user-agent': 'abcdefgh' };
      expect(extractUserAgent(headers, 4)).toBe('abcd');
    });
  });

  describe('when user-agent header is absent or invalid', () => {
    it('returns undefined when headers object is empty', () => {
      expect(extractUserAgent({})).toBeUndefined();
    });

    it('returns undefined when user-agent is undefined', () => {
      const headers: Record<string, string | string[] | undefined> = {
        'user-agent': undefined,
      };
      expect(extractUserAgent(headers)).toBeUndefined();
    });

    it('returns undefined when user-agent is an empty string', () => {
      const headers = { 'user-agent': '' };
      expect(extractUserAgent(headers)).toBeUndefined();
    });

    it('returns undefined when user-agent is an array (not a string)', () => {
      // Adversarial: some frameworks allow multi-value headers. The function
      // guards with typeof !== 'string', so arrays return undefined.
      const headers: Record<string, string | string[] | undefined> = {
        'user-agent': ['Mozilla/5.0', 'OtherAgent/1.0'],
      };
      expect(extractUserAgent(headers)).toBeUndefined();
    });

    it('does NOT look up the header case-insensitively — mismatched case returns undefined', () => {
      // 'User-Agent' (mixed case) is a different key from 'user-agent'.
      const headers: Record<string, string | string[] | undefined> = {
        'User-Agent': 'SomeBot/2.0',
      };
      expect(extractUserAgent(headers)).toBeUndefined();
    });
  });

  describe('edge: very long user agent', () => {
    it('truncates a 1,000,000 char user agent to 500 chars', () => {
      const massive = 'Z'.repeat(1_000_000);
      const headers = { 'user-agent': massive };
      const result = extractUserAgent(headers);
      expect(result).toHaveLength(500);
      expect(result).toBe('Z'.repeat(500));
    });

    it('truncates to zero when maxLength is 0', () => {
      const headers = { 'user-agent': 'SomeAgent' };
      expect(extractUserAgent(headers, 0)).toBe('');
    });
  });
});

// ==========================================================================
// getRequesterId
// ==========================================================================
describe('getRequesterId', () => {
  describe('when X-Forwarded-For header is set', () => {
    it('returns the first IP from X-Forwarded-For', () => {
      const req = {
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
        ip: '10.0.0.3',
      };
      expect(getRequesterId(req)).toBe('10.0.0.1');
    });

    it('returns the single IP when X-Forwarded-For has one entry', () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.5' },
        ip: '10.0.0.1',
      };
      expect(getRequesterId(req)).toBe('203.0.113.5');
    });

    it('ignores invalid IPs in X-Forwarded-For and falls back to next valid IP', () => {
      // parseXForwardedFor filters invalid IPs — "not-an-ip" gets dropped.
      const req = {
        headers: { 'x-forwarded-for': 'not-an-ip, 1.2.3.4' },
        ip: '10.0.0.1',
      };
      // "not-an-ip" is invalid, so parseXForwardedFor returns ['1.2.3.4'].
      expect(getRequesterId(req)).toBe('1.2.3.4');
    });

    it('falls through to req.ip when X-Forwarded-For contains only invalid IPs', () => {
      // All entries are invalid; parseXForwardedFor returns []; fallback to req.ip.
      const req = {
        headers: { 'x-forwarded-for': 'garbage, also-garbage' },
        ip: '5.5.5.5',
      };
      expect(getRequesterId(req)).toBe('5.5.5.5');
    });
  });

  describe('when X-Forwarded-For is absent', () => {
    it('returns req.ip when X-Forwarded-For header is missing', () => {
      const req = { headers: {}, ip: '9.9.9.9' };
      expect(getRequesterId(req)).toBe('9.9.9.9');
    });

    it('returns req.ip when X-Forwarded-For is undefined', () => {
      const req = {
        headers: { 'x-forwarded-for': undefined } as Record<
          string,
          string | string[] | undefined
        >,
        ip: '8.8.8.8',
      };
      expect(getRequesterId(req)).toBe('8.8.8.8');
    });

    it('returns "unknown" when both X-Forwarded-For is missing and req.ip is undefined', () => {
      const req = { headers: {} };
      expect(getRequesterId(req)).toBe('unknown');
    });

    it('returns "unknown" when req.ip is an empty string', () => {
      const req = { headers: {}, ip: '' };
      expect(getRequesterId(req)).toBe('unknown');
    });
  });

  describe('when X-Forwarded-For is an array (multi-value header)', () => {
    it('joins array values and returns the first valid IP', () => {
      // parseXForwardedFor joins arrays with ', ' before splitting on ','
      const req = {
        headers: {
          'x-forwarded-for': ['1.1.1.1, 2.2.2.2', '3.3.3.3'] as string[],
        },
        ip: '4.4.4.4',
      };
      expect(getRequesterId(req)).toBe('1.1.1.1');
    });
  });

  describe('priority: X-Forwarded-For wins over req.ip', () => {
    it('prefers X-Forwarded-For client IP even when req.ip is set', () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.99' },
        ip: '10.0.0.1',
      };
      expect(getRequesterId(req)).toBe('203.0.113.99');
    });
  });

  describe('when all sources are missing', () => {
    it('returns "unknown" when headers is empty and ip is undefined', () => {
      const req = { headers: {} as Record<string, string | string[] | undefined> };
      expect(getRequesterId(req)).toBe('unknown');
    });
  });
});
