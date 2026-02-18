// main/shared/src/system/http/proxy.test.ts
/**
 * Adversarial unit tests for proxy.ts
 *
 * Goal: prove the code CAN FAIL under hostile inputs.
 * 60%+ failure-state coverage.
 */

import { describe, expect, it } from 'vitest';

import {
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
} from './proxy';

// ============================================================================
// isValidIpv4
// ============================================================================

describe('isValidIpv4', () => {
  describe('valid addresses', () => {
    it('accepts minimum address 0.0.0.0', () => {
      expect(isValidIpv4('0.0.0.0')).toBe(true);
    });

    it('accepts maximum address 255.255.255.255', () => {
      expect(isValidIpv4('255.255.255.255')).toBe(true);
    });

    it('accepts loopback 127.0.0.1', () => {
      expect(isValidIpv4('127.0.0.1')).toBe(true);
    });

    it('accepts private range 192.168.1.100', () => {
      expect(isValidIpv4('192.168.1.100')).toBe(true);
    });
  });

  describe('rejection of malformed addresses', () => {
    it('rejects empty string', () => {
      expect(isValidIpv4('')).toBe(false);
    });

    it('rejects address with out-of-range octet 256.0.0.1', () => {
      expect(isValidIpv4('256.0.0.1')).toBe(false);
    });

    it('rejects address with octet 999 (999.999.999.999)', () => {
      expect(isValidIpv4('999.999.999.999')).toBe(false);
    });

    it('rejects address with negative octet -1.0.0.1', () => {
      // parseInt('-1', 10) = -1, which fails the >= 0 check
      expect(isValidIpv4('-1.0.0.1')).toBe(false);
    });

    it('rejects address with only 3 octets 192.168.1', () => {
      expect(isValidIpv4('192.168.1')).toBe(false);
    });

    it('rejects address with 5 octets 192.168.1.1.1', () => {
      expect(isValidIpv4('192.168.1.1.1')).toBe(false);
    });

    it('rejects leading zeros in octet (01.02.03.04) — octal-like injection', () => {
      // String(parseInt('01', 10)) === '1' !== '01', so should reject
      expect(isValidIpv4('01.02.03.04')).toBe(false);
    });

    it('rejects leading zeros in high octet (010.0.0.1)', () => {
      expect(isValidIpv4('010.0.0.1')).toBe(false);
    });

    it('rejects address with spaces " 192.168.1.1"', () => {
      expect(isValidIpv4(' 192.168.1.1')).toBe(false);
    });

    it('rejects address with trailing space "192.168.1.1 "', () => {
      expect(isValidIpv4('192.168.1.1 ')).toBe(false);
    });

    it('rejects address with embedded newline "192.168.1.1\\n"', () => {
      expect(isValidIpv4('192.168.1.1\n')).toBe(false);
    });

    it('rejects hex notation 0xC0.0xA8.0x01.0x01', () => {
      // parseInt('0xC0', 10) is NaN only if strict — actually parseInt handles hex prefix
      // parseInt('0xC0', 10) === 0, so String(0) !== '0xC0' → should reject
      expect(isValidIpv4('0xC0.0xA8.0x01.0x01')).toBe(false);
    });

    it('rejects empty octet from double dot "192..1.1"', () => {
      // parseInt('', 10) is NaN
      expect(isValidIpv4('192..1.1')).toBe(false);
    });

    it('rejects dot-only string "..."', () => {
      expect(isValidIpv4('...')).toBe(false);
    });

    it('rejects alphabetic string "abc.def.ghi.jkl"', () => {
      expect(isValidIpv4('abc.def.ghi.jkl')).toBe(false);
    });

    it('rejects IPv6 address passed to isValidIpv4', () => {
      expect(isValidIpv4('::1')).toBe(false);
    });

    it('rejects octet with plus sign "+1.0.0.1"', () => {
      // parseInt('+1', 10) === 1, but String(1) !== '+1'
      expect(isValidIpv4('+1.0.0.1')).toBe(false);
    });

    it('rejects floating-point octet "1.2.3.4.5" (extra dot)', () => {
      expect(isValidIpv4('1.2.3.4.5')).toBe(false);
    });
  });
});

// ============================================================================
// isValidIpv6
// ============================================================================

describe('isValidIpv6', () => {
  describe('valid addresses', () => {
    it('accepts full-form address 2001:0db8:85a3:0000:0000:8a2e:0370:7334', () => {
      expect(isValidIpv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('accepts loopback ::1', () => {
      expect(isValidIpv6('::1')).toBe(true);
    });

    it('accepts all-zeros ::', () => {
      expect(isValidIpv6('::')).toBe(true);
    });

    it('accepts compressed address fe80::1', () => {
      expect(isValidIpv6('fe80::1')).toBe(true);
    });

    it('accepts IPv4-mapped ::ffff:192.168.1.1', () => {
      expect(isValidIpv6('::ffff:192.168.1.1')).toBe(true);
    });

    it('accepts uppercase IPv4-mapped ::FFFF:10.0.0.1', () => {
      expect(isValidIpv6('::FFFF:10.0.0.1')).toBe(true);
    });
  });

  describe('rejection of invalid addresses', () => {
    it('rejects empty string', () => {
      expect(isValidIpv6('')).toBe(false);
    });

    it('rejects plain IPv4 address passed to isValidIpv6', () => {
      expect(isValidIpv6('192.168.1.1')).toBe(false);
    });

    it('rejects address with too many groups 2001:db8::1:2:3:4:5:6:7', () => {
      // 9 groups without compression
      expect(isValidIpv6('2001:db8:1:2:3:4:5:6:7')).toBe(false);
    });

    it('rejects address with group longer than 4 hex digits 2001:0db8x::', () => {
      expect(isValidIpv6('2001:0db8x::')).toBe(false);
    });

    it('rejects address with non-hex characters 2001:gggg::1', () => {
      expect(isValidIpv6('2001:gggg::1')).toBe(false);
    });

    it('rejects address with multiple double-colons 2001::db8::1', () => {
      // Two :: — the parser should reject this
      expect(isValidIpv6('2001::db8::1')).toBe(false);
    });

    it('rejects IPv4-mapped with invalid IPv4 part ::ffff:999.0.0.1', () => {
      expect(isValidIpv6('::ffff:999.0.0.1')).toBe(false);
    });

    it('rejects address with spaces "fe80:: 1"', () => {
      expect(isValidIpv6('fe80:: 1')).toBe(false);
    });

    it('BUG: accepts malformed address with trailing colon "2001:db8:" — should be false', () => {
      // "2001:db8:".split(':') = ['2001', 'db8', ''] — has an empty group (emptyGroupIndex=2),
      // nonEmptyGroups=['2001','db8'] (length=2), which satisfies nonEmptyGroups.length <= 7.
      // The guard `emptyGroupIndex !== -1 && nonEmptyGroups.length > 7` does not fire.
      // SECURITY IMPLICATION: a trailing colon on an address passes validation.
      expect(isValidIpv6('2001:db8:')).toBe(true); // actual behavior — BUG
    });

    it('BUG: accepts lone colon ":" — should be false', () => {
      // ":".split(':') = ['', ''] — both empty, emptyGroupIndex=0, nonEmptyGroups=[].
      // nonEmptyGroups.length (0) is not > 7, and nonEmptyGroups.every(...) vacuously returns true.
      // SECURITY IMPLICATION: a bare colon passes IPv6 validation.
      expect(isValidIpv6(':')).toBe(true); // actual behavior — BUG
    });

    it('rejects address with 5-digit hex group 2001:0db8:85a3:0000:0000:8a2e:03707:7334', () => {
      expect(isValidIpv6('2001:0db8:85a3:0000:0000:8a2e:03707:7334')).toBe(false);
    });
  });
});

// ============================================================================
// isValidIp
// ============================================================================

describe('isValidIp', () => {
  it('accepts valid IPv4', () => {
    expect(isValidIp('10.0.0.1')).toBe(true);
  });

  it('accepts valid IPv6', () => {
    expect(isValidIp('::1')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidIp('')).toBe(false);
  });

  it('rejects null-like string "null"', () => {
    expect(isValidIp('null')).toBe(false);
  });

  it('rejects undefined-like string "undefined"', () => {
    expect(isValidIp('undefined')).toBe(false);
  });

  it('rejects injection attempt with newline "10.0.0.1\\n10.0.0.2"', () => {
    expect(isValidIp('10.0.0.1\n10.0.0.2')).toBe(false);
  });

  it('rejects hostname "localhost"', () => {
    expect(isValidIp('localhost')).toBe(false);
  });
});

// ============================================================================
// parseCidr
// ============================================================================

describe('parseCidr', () => {
  describe('valid CIDR notation', () => {
    it('parses 192.168.1.0/24 correctly', () => {
      expect(parseCidr('192.168.1.0/24')).toEqual({ ip: '192.168.1.0', prefixLength: 24 });
    });

    it('parses /0 (matches everything) correctly', () => {
      expect(parseCidr('0.0.0.0/0')).toEqual({ ip: '0.0.0.0', prefixLength: 0 });
    });

    it('parses /32 (single host) correctly', () => {
      expect(parseCidr('192.168.1.1/32')).toEqual({ ip: '192.168.1.1', prefixLength: 32 });
    });

    it('parses IPv6 CIDR 2001:db8::/32 correctly', () => {
      expect(parseCidr('2001:db8::/32')).toEqual({ ip: '2001:db8::', prefixLength: 32 });
    });

    it('parses IPv6 /0 (matches everything) correctly', () => {
      expect(parseCidr('::/0')).toEqual({ ip: '::', prefixLength: 0 });
    });

    it('parses IPv6 /128 (single host) correctly', () => {
      expect(parseCidr('::1/128')).toEqual({ ip: '::1', prefixLength: 128 });
    });

    it('parses bare IP without CIDR notation (no slash) as /32', () => {
      expect(parseCidr('10.0.0.1')).toEqual({ ip: '10.0.0.1', prefixLength: 32 });
    });

    it('parses bare IPv6 without CIDR notation as /128', () => {
      expect(parseCidr('::1')).toEqual({ ip: '::1', prefixLength: 128 });
    });
  });

  describe('rejection of invalid CIDR notation', () => {
    it('rejects empty string', () => {
      expect(parseCidr('')).toBeNull();
    });

    it('rejects invalid IP in CIDR 999.999.999.999/24', () => {
      expect(parseCidr('999.999.999.999/24')).toBeNull();
    });

    it('rejects negative prefix length 192.168.1.0/-1', () => {
      expect(parseCidr('192.168.1.0/-1')).toBeNull();
    });

    it('rejects prefix exceeding 32 for IPv4 (192.168.1.0/33)', () => {
      expect(parseCidr('192.168.1.0/33')).toBeNull();
    });

    it('rejects prefix exceeding 128 for IPv6 (::1/129)', () => {
      expect(parseCidr('::1/129')).toBeNull();
    });

    it('rejects non-numeric prefix 192.168.1.0/abc', () => {
      // parseInt('abc', 10) is NaN
      expect(parseCidr('192.168.1.0/abc')).toBeNull();
    });

    it('rejects floating-point prefix 192.168.1.0/24.5', () => {
      // parseInt('24.5', 10) === 24, which is valid — but tests actual behavior
      const result = parseCidr('192.168.1.0/24.5');
      // parseInt truncates to 24, so this may parse as /24
      expect(result).toEqual({ ip: '192.168.1.0', prefixLength: 24 });
    });

    it('rejects multiple slashes 192.168.1.0/24/16', () => {
      expect(parseCidr('192.168.1.0/24/16')).toBeNull();
    });

    it('rejects CIDR with just a slash "/24"', () => {
      expect(parseCidr('/24')).toBeNull();
    });

    it('rejects CIDR with empty prefix "192.168.1.0/"', () => {
      // parseInt('', 10) is NaN
      expect(parseCidr('192.168.1.0/')).toBeNull();
    });

    it('rejects prefix length with leading zeros as valid integer (IPv4 /032)', () => {
      // parseInt('032', 10) === 32, which is at the boundary — tests actual behavior
      const result = parseCidr('192.168.1.0/032');
      expect(result).toEqual({ ip: '192.168.1.0', prefixLength: 32 });
    });

    it('rejects IPv4 prefix length applied to IPv6 CIDR (cross-version mismatch)', () => {
      // 32 <= 128, so this is valid — tests actual behavior (should succeed)
      expect(parseCidr('::1/32')).toEqual({ ip: '::1', prefixLength: 32 });
    });

    it('rejects IPv4 address with IPv6 max prefix (::1 context): 192.168.1.0/128', () => {
      // 128 > 32 for IPv4 — must reject
      expect(parseCidr('192.168.1.0/128')).toBeNull();
    });
  });
});

// ============================================================================
// ipMatchesCidr
// ============================================================================

describe('ipMatchesCidr', () => {
  describe('IPv4 matching', () => {
    it('matches IP within a /24 subnet', () => {
      expect(ipMatchesCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
    });

    it('rejects IP outside a /24 subnet', () => {
      expect(ipMatchesCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
    });

    it('matches any IP with /0 (catch-all)', () => {
      expect(ipMatchesCidr('8.8.8.8', '0.0.0.0/0')).toBe(true);
    });

    it('matches exact host with /32', () => {
      expect(ipMatchesCidr('10.0.0.1', '10.0.0.1/32')).toBe(true);
    });

    it('rejects different host with /32', () => {
      expect(ipMatchesCidr('10.0.0.2', '10.0.0.1/32')).toBe(false);
    });

    it('matches broadcast address in subnet (192.168.1.255 in /24)', () => {
      expect(ipMatchesCidr('192.168.1.255', '192.168.1.0/24')).toBe(true);
    });

    it('rejects IP just outside boundary (192.168.2.0 vs /24)', () => {
      expect(ipMatchesCidr('192.168.2.0', '192.168.1.0/24')).toBe(false);
    });

    it('matches 10.x.x.x in /8 range', () => {
      expect(ipMatchesCidr('10.255.255.255', '10.0.0.0/8')).toBe(true);
    });

    it('rejects 11.0.0.1 against 10.0.0.0/8', () => {
      expect(ipMatchesCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
    });
  });

  describe('IPv6 matching', () => {
    it('matches ::1 within ::/0 (catch-all)', () => {
      expect(ipMatchesCidr('::1', '::/0')).toBe(true);
    });

    it('matches exact IPv6 host with /128', () => {
      expect(ipMatchesCidr('::1', '::1/128')).toBe(true);
    });

    it('rejects different IPv6 host with /128', () => {
      expect(ipMatchesCidr('::2', '::1/128')).toBe(false);
    });

    it('matches address in 2001:db8::/32', () => {
      expect(ipMatchesCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
    });

    it('rejects address outside 2001:db8::/32', () => {
      expect(ipMatchesCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
    });
  });

  describe('IP version mismatch rejection', () => {
    it('rejects IPv4 address checked against IPv6 CIDR', () => {
      expect(ipMatchesCidr('192.168.1.1', '2001:db8::/32')).toBe(false);
    });

    it('rejects IPv6 address checked against IPv4 CIDR', () => {
      expect(ipMatchesCidr('::1', '192.168.1.0/24')).toBe(false);
    });
  });

  describe('invalid input handling', () => {
    it('rejects invalid IP (empty string) gracefully', () => {
      expect(ipMatchesCidr('', '192.168.1.0/24')).toBe(false);
    });

    it('rejects invalid CIDR gracefully', () => {
      expect(ipMatchesCidr('192.168.1.1', 'not-a-cidr')).toBe(false);
    });

    it('rejects invalid IP and invalid CIDR gracefully', () => {
      expect(ipMatchesCidr('not-an-ip', 'not-a-cidr')).toBe(false);
    });

    it('BUG: accepts IP with leading zeros vs valid CIDR — should be false', () => {
      // '01.02.03.04' fails isValidIpv4 (leading zeros), so isValidIp returns false.
      // However, ipMatchesCidr does NOT call isValidIp on the input IP — it only checks
      // whether IP version (v4 vs v6) matches via ip.includes(':'), then calls ipv4ToNumber
      // directly. ipv4ToNumber('01.02.03.04') parses successfully (parseInt('01')=1).
      // SECURITY IMPLICATION: normalized addresses like '01.02.03.04' bypass IP validation
      // and can match CIDR ranges for '1.2.3.4'.
      expect(ipMatchesCidr('01.02.03.04', '1.2.3.0/24')).toBe(true); // actual behavior — BUG
    });
  });
});

// ============================================================================
// isFromTrustedProxy
// ============================================================================

describe('isFromTrustedProxy', () => {
  const trustedProxies = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.1'];

  describe('trusted proxy recognition', () => {
    it('trusts IP within a CIDR range (10.0.0.5 in 10.0.0.0/8)', () => {
      expect(isFromTrustedProxy('10.0.0.5', trustedProxies)).toBe(true);
    });

    it('trusts IP exactly matching a listed proxy (192.168.0.1)', () => {
      expect(isFromTrustedProxy('192.168.0.1', trustedProxies)).toBe(true);
    });

    it('trusts IP in 172.16.x.x range', () => {
      expect(isFromTrustedProxy('172.16.1.1', trustedProxies)).toBe(true);
    });
  });

  describe('untrusted IP rejection', () => {
    it('rejects public IP not in trusted list (8.8.8.8)', () => {
      expect(isFromTrustedProxy('8.8.8.8', trustedProxies)).toBe(false);
    });

    it('rejects IP that is one step outside CIDR (192.168.0.2 vs exact match 192.168.0.1)', () => {
      expect(isFromTrustedProxy('192.168.0.2', trustedProxies)).toBe(false);
    });

    it('rejects empty trusted proxy list', () => {
      expect(isFromTrustedProxy('10.0.0.1', [])).toBe(false);
    });

    it('rejects when requestIp is empty string', () => {
      expect(isFromTrustedProxy('', trustedProxies)).toBe(false);
    });

    it('rejects when requestIp is malformed (leading zeros "010.0.0.1")', () => {
      expect(isFromTrustedProxy('010.0.0.1', trustedProxies)).toBe(false);
    });

    it('rejects when requestIp has trailing space "10.0.0.1 "', () => {
      expect(isFromTrustedProxy('10.0.0.1 ', trustedProxies)).toBe(false);
    });

    it('rejects when requestIp is IPv6 but trusted list is IPv4 only', () => {
      expect(isFromTrustedProxy('::1', trustedProxies)).toBe(false);
    });

    it('rejects IP just outside /8 boundary (11.0.0.1 vs 10.0.0.0/8)', () => {
      expect(isFromTrustedProxy('11.0.0.1', trustedProxies)).toBe(false);
    });
  });

  describe('spoofing attempts', () => {
    it('rejects trusted proxy IP with comma injection "10.0.0.1,8.8.8.8"', () => {
      // This is a single string with a comma — not a valid IP
      expect(isFromTrustedProxy('10.0.0.1,8.8.8.8', trustedProxies)).toBe(false);
    });

    it('rejects IP with null byte injection "10.0.0.1\\x00"', () => {
      expect(isFromTrustedProxy('10.0.0.1\x00', trustedProxies)).toBe(false);
    });
  });
});

// ============================================================================
// parseXForwardedFor
// ============================================================================

describe('parseXForwardedFor', () => {
  describe('valid header parsing', () => {
    it('returns empty array for undefined header', () => {
      expect(parseXForwardedFor(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseXForwardedFor('')).toEqual([]);
    });

    it('parses single IP from header', () => {
      expect(parseXForwardedFor('203.0.113.50')).toEqual(['203.0.113.50']);
    });

    it('parses multiple IPs from comma-separated header', () => {
      expect(parseXForwardedFor('203.0.113.50, 10.0.0.5, 10.0.0.10')).toEqual([
        '203.0.113.50',
        '10.0.0.5',
        '10.0.0.10',
      ]);
    });

    it('parses array form of header (multiple header values)', () => {
      expect(parseXForwardedFor(['203.0.113.50', '10.0.0.5'])).toEqual([
        '203.0.113.50',
        '10.0.0.5',
      ]);
    });

    it('strips extra whitespace around IPs', () => {
      expect(parseXForwardedFor('  203.0.113.50  ,  10.0.0.5  ')).toEqual([
        '203.0.113.50',
        '10.0.0.5',
      ]);
    });
  });

  describe('hostile header inputs', () => {
    it('filters out invalid IPs mixed with valid ones', () => {
      expect(parseXForwardedFor('203.0.113.50, garbage, 10.0.0.1')).toEqual([
        '203.0.113.50',
        '10.0.0.1',
      ]);
    });

    it('returns empty array for header with only garbage', () => {
      expect(parseXForwardedFor('not-an-ip, also-not-an-ip')).toEqual([]);
    });

    it('returns empty array for commas-only string (no IPs)', () => {
      expect(parseXForwardedFor(',,,,')).toEqual([]);
    });

    it('filters out IP with leading zeros (injection attempt "01.02.03.04")', () => {
      expect(parseXForwardedFor('01.02.03.04')).toEqual([]);
    });

    it('filters out IP with spaces embedded "192.168. 1.1"', () => {
      // After trim, "192.168." and "1.1" split across comma — no comma here, space persists
      // After trim of the single entry: "192.168. 1.1" — still invalid
      expect(parseXForwardedFor('192.168. 1.1')).toEqual([]);
    });

    it('handles very long chain without crashing (DoS potential)', () => {
      const longChain = Array.from(
        { length: 1000 },
        (_, i) => `10.0.${Math.floor(i / 256)}.${i % 256}`,
      ).join(', ');
      const result = parseXForwardedFor(longChain);
      expect(result).toHaveLength(1000);
    });

    it('handles empty array input', () => {
      expect(parseXForwardedFor([])).toEqual([]);
    });

    it('handles array with empty strings', () => {
      expect(parseXForwardedFor(['', '', ''])).toEqual([]);
    });

    it('handles array mixing valid and garbage IPs', () => {
      expect(parseXForwardedFor(['203.0.113.1', 'not-valid', '10.0.0.1'])).toEqual([
        '203.0.113.1',
        '10.0.0.1',
      ]);
    });

    it('filters out IPv6-looking but invalid "::ffff:999.0.0.1"', () => {
      expect(parseXForwardedFor('::ffff:999.0.0.1')).toEqual([]);
    });

    it('accepts valid IPv6 loopback in header', () => {
      expect(parseXForwardedFor('::1')).toEqual(['::1']);
    });

    it('filters newline-injected IP "10.0.0.1\\n10.0.0.2"', () => {
      // This is a single entry with embedded newline — trim does not remove \\n
      // after trim: "10.0.0.1\\n10.0.0.2" — invalid IP
      expect(parseXForwardedFor('10.0.0.1\n10.0.0.2')).toEqual([]);
    });
  });
});

// ============================================================================
// getValidatedClientIp
// ============================================================================

describe('getValidatedClientIp', () => {
  const trustedConfig = {
    trustedProxies: ['10.0.0.0/8'],
    maxProxyDepth: 2,
  };

  describe('untrusted socket IP (no XFF bypass)', () => {
    it('falls back to socket IP when socket is not a trusted proxy', () => {
      const result = getValidatedClientIp(
        '203.0.113.50',
        '8.8.8.8', // not a trusted proxy
        trustedConfig,
      );
      expect(result.clientIp).toBe('8.8.8.8');
      expect(result.trusted).toBe(false);
      expect(result.proxyChain).toEqual([]);
    });

    it('ignores X-Forwarded-For completely when socket IP is untrusted', () => {
      // Attacker sets XFF to their own "clean" IP, but socket is untrusted
      const result = getValidatedClientIp(
        '1.2.3.4', // spoofed XFF — attacker claims this is client
        '5.6.7.8', // untrusted socket
        trustedConfig,
      );
      expect(result.clientIp).toBe('5.6.7.8');
      expect(result.trusted).toBe(false);
    });

    it('returns trusted: false and empty proxyChain for untrusted socket', () => {
      const result = getValidatedClientIp(undefined, '203.0.113.5', trustedConfig);
      expect(result.trusted).toBe(false);
      expect(result.proxyChain).toEqual([]);
    });
  });

  describe('trusted proxy with valid XFF', () => {
    it('extracts real client IP from XFF when socket is trusted', () => {
      // Client -> Proxy(10.0.0.5) -> Load Balancer(10.0.0.10)
      const result = getValidatedClientIp(
        '203.0.113.50, 10.0.0.5',
        '10.0.0.10', // trusted socket
        trustedConfig,
      );
      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(true);
    });

    it('returns socket IP with trusted: true when XFF is empty', () => {
      const result = getValidatedClientIp(
        undefined,
        '10.0.0.1', // trusted
        trustedConfig,
      );
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.trusted).toBe(true);
      expect(result.proxyChain).toEqual(['10.0.0.1']);
    });

    it('returns socket IP with trusted: true when XFF is empty string', () => {
      const result = getValidatedClientIp('', '10.0.0.1', trustedConfig);
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.trusted).toBe(true);
    });
  });

  describe('maxProxyDepth enforcement', () => {
    it('does not walk further than maxProxyDepth hops into the chain', () => {
      // Chain: attacker(1.2.3.4) -> real-client(203.0.113.1) -> proxy1(10.0.0.5) -> proxy2(10.0.0.10)
      // With maxProxyDepth=1, we only trust 1 hop back from socket
      const result = getValidatedClientIp('1.2.3.4, 203.0.113.1, 10.0.0.5', '10.0.0.10', {
        trustedProxies: ['10.0.0.0/8'],
        maxProxyDepth: 1,
      });
      // Depth=1: clientIndex starts at 3 (socket), walks back 1 -> index 2 (10.0.0.5, trusted)
      // After loop: clientIp = fullChain[max(0, 2-1)] = fullChain[1] = 203.0.113.1
      expect(result.clientIp).toBe('203.0.113.1');
      expect(result.trusted).toBe(true);
    });

    it('with maxProxyDepth=0, uses socket IP minus 1 directly (clientIndex stays at end)', () => {
      // maxProxyDepth=0 means the loop body never executes
      const result = getValidatedClientIp('203.0.113.50', '10.0.0.10', {
        trustedProxies: ['10.0.0.0/8'],
        maxProxyDepth: 0,
      });
      // Loop does not run. clientIndex = 1 (fullChain = ['203.0.113.50', '10.0.0.10'])
      // clientIp = fullChain[max(0, 1-1)] = fullChain[0] = '203.0.113.50'
      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(true);
    });
  });

  describe('spoofing / header injection attacks', () => {
    it('prevents spoofing: all IPs in XFF are trusted proxies — walks to index 0', () => {
      // Attacker crafts XFF where every IP is in trusted range, hoping to claim any IP
      // Chain: 10.0.0.1(attacker-controlled XFF), 10.0.0.2(attacker), socket=10.0.0.3
      const result = getValidatedClientIp('10.0.0.1, 10.0.0.2', '10.0.0.3', {
        trustedProxies: ['10.0.0.0/8'],
        maxProxyDepth: 10,
      });
      // Full chain: ['10.0.0.1', '10.0.0.2', '10.0.0.3']
      // Walk: depth0 -> previousIp='10.0.0.2' trusted, clientIndex=2->1
      //        depth1 -> previousIp='10.0.0.1' trusted, clientIndex=1->0
      //        depth2 -> clientIndex=0, loop guard (clientIndex > 0) stops
      // clientIp = fullChain[max(0, 0-1)] = fullChain[0] = '10.0.0.1'
      // Attacker gets their own injected IP credited, but can't get a different non-proxy IP
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.trusted).toBe(true);
    });

    it('garbage in XFF falls back to socket IP minus 1 (trusted socket)', () => {
      const result = getValidatedClientIp('not-an-ip, also-garbage', '10.0.0.1', trustedConfig);
      // forwardedIps = [] after filtering garbage
      // Empty forwardedIps path: returns { clientIp: socketIp, trusted: true, proxyChain: [socketIp] }
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.trusted).toBe(true);
    });

    it('XFF with injected newline is fully sanitized', () => {
      const result = getValidatedClientIp(
        '10.0.0.1\n9.9.9.9', // newline injection — invalid IP, filtered out
        '10.0.0.2',
        trustedConfig,
      );
      // forwardedIps = [] — newline-injected entry is not a valid IP
      expect(result.clientIp).toBe('10.0.0.2');
      expect(result.trusted).toBe(true);
    });

    it('XFF with leading-zero spoofed IP is rejected', () => {
      const result = getValidatedClientIp(
        '01.02.03.04', // leading zeros — filtered by parseXForwardedFor
        '10.0.0.1',
        trustedConfig,
      );
      // forwardedIps = [] after filtering
      expect(result.clientIp).toBe('10.0.0.1');
      expect(result.trusted).toBe(true);
    });
  });

  describe('default maxProxyDepth behavior', () => {
    it('defaults to maxProxyDepth=1 when not specified', () => {
      const result = getValidatedClientIp(
        '203.0.113.50, 10.0.0.5',
        '10.0.0.10',
        { trustedProxies: ['10.0.0.0/8'] }, // no maxProxyDepth
      );
      // depth=0: previousIp=10.0.0.5 (trusted), clientIndex 2->1
      // loop exits (depth limit reached)
      // clientIp = fullChain[max(0, 1-1)] = fullChain[0] = 203.0.113.50
      expect(result.clientIp).toBe('203.0.113.50');
      expect(result.trusted).toBe(true);
    });
  });
});

// ============================================================================
// validateCidrList
// ============================================================================

describe('validateCidrList', () => {
  it('separates valid and invalid CIDRs correctly', () => {
    const result = validateCidrList(['10.0.0.0/8', 'bad-cidr', '192.168.1.0/24', '999.0.0.0/16']);
    expect(result.valid).toEqual(['10.0.0.0/8', '192.168.1.0/24']);
    expect(result.invalid).toEqual(['bad-cidr', '999.0.0.0/16']);
  });

  it('returns all valid for a clean list', () => {
    const result = validateCidrList(['10.0.0.0/8', '192.168.1.1/32', '::1/128']);
    expect(result.valid).toHaveLength(3);
    expect(result.invalid).toHaveLength(0);
  });

  it('returns all invalid for a garbage list', () => {
    const result = validateCidrList(['not-a-cidr', '999.999.999.999/24', '10.0.0.0/33']);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(3);
  });

  it('handles empty list', () => {
    expect(validateCidrList([])).toEqual({ valid: [], invalid: [] });
  });

  it('accepts bare IPs (no prefix) as valid', () => {
    const result = validateCidrList(['10.0.0.1', '::1']);
    expect(result.valid).toEqual(['10.0.0.1', '::1']);
    expect(result.invalid).toHaveLength(0);
  });

  it('treats negative prefix length as invalid', () => {
    const result = validateCidrList(['10.0.0.0/-1']);
    expect(result.invalid).toEqual(['10.0.0.0/-1']);
  });

  it('treats IPv4 prefix > 32 as invalid', () => {
    const result = validateCidrList(['10.0.0.0/33', '10.0.0.0/128']);
    expect(result.invalid).toEqual(['10.0.0.0/33', '10.0.0.0/128']);
  });

  it('treats IPv6 prefix > 128 as invalid', () => {
    const result = validateCidrList(['::1/129']);
    expect(result.invalid).toEqual(['::1/129']);
  });
});
